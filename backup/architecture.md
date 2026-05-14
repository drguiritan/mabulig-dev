# Project Architecture

## Overview

This is a mobile-first **Augmented Reality Frog Species Viewer** built as an
Android app using **Quasar Framework v2 + Capacitor v8**. The web layer runs
inside a Capacitor WebView. The AR and 3D rendering is done entirely in the
browser layer using **Three.js** — no native AR SDKs are used.

---

## Technology Stack

| Layer | Technology | Role |
|---|---|---|
| UI Framework | Quasar v2 (Vue 3) | Pages, layout, drawer, components |
| Build Tool | @quasar/app-vite (Vite) | Bundling, HMR, asset pipeline |
| Mobile Shell | Capacitor v8 | Wraps web app into Android APK |
| 3D Rendering | Three.js v0.183 | GLB model loading, WebGL rendering |
| 3D Text Labels | troika-three-text v0.52 | SDF annotation labels billboarded in 3D scene |
| AR Mode | Magic Window (getUserMedia) | Camera feed + transparent Three.js overlay |
| QR Scanning | jsQR | Decodes QR codes from camera frames |
| State Management | Pinia | Notes store (persisted to localStorage) |
| Routing | Vue Router v5 (hash mode) | SPA navigation |
| Data | species.json | Single source of truth for all 28 species + annotation positions |

---

## High-Level Architecture Diagram

```
Android Device
└── Capacitor WebView
    └── Quasar SPA (Vue 3 + Vite)
        ├── App.vue               ← root, just <router-view>
        ├── MainLayout.vue        ← persistent shell (header + drawer)
        │   ├── IndexPage.vue     ← landing page
        │   ├── ScanPage.vue      ← QR scanner
        │   ├── NotesPage.vue     ← master notes viewer with species filter
        │   └── species/*.vue     ← one page per species (3D + AR + notes tab)
        ├── stores/notes.js       ← Pinia store, localStorage persistence
        └── data/species.json     ← master species registry
```

---

## Data Flow

```
species.json
    │
    ├──► MainLayout.vue       drawer list (all 28 species)
    ├──► ScanPage.vue         QR match lookup
    ├──► NotesPage.vue        species label lookup for notes grouping
    └──► species/*.vue        page metadata + model path + annotation positions

stores/notes.js (Pinia)
    │   Shape: { [speciesId]: Array<{ id, text, createdAt }> }
    │   Persisted to: localStorage key 'ar_viewer_notes'
    │
    ├──► species/*.vue        addNote, getSpeciesNotes, deleteNote
    └──► NotesPage.vue        allNotes (computed, grouped by speciesId)
```

`species.json` is the **single source of truth** for species metadata.
`notes.js` store is the single source of truth for all user notes.

---

## Routing Architecture

Routes are **auto-discovered** using Vite's `import.meta.glob`:

```
src/router/routes.js
    └── import.meta.glob('../pages/species/*.vue')
            ├── platymantis.vue     → /model/platymantis
            ├── ansoniamuelleri.vue → /model/ansoniamuelleri
            └── (any future .vue)  → /model/(filename)
```

Adding a new species page **never requires touching the router**. Drop the
`.vue` file and the route exists automatically on next build.

Static routes registered manually:
- `/` → `IndexPage.vue`
- `/scan` → `ScanPage.vue`
- `/notes` → `NotesPage.vue`

---

## 3D + AR Pipeline

```
GLB file (public/models/)
    │
    └── GLTFLoader (Three.js)
            │
            ├── 3D Mode
            │     WebGLRenderer (opaque, dark background)
            │     + OrbitControls (mouse/touch drag & pinch)
            │     + RoomEnvironment (IBL for PBR materials)
            │     + ACESFilmicToneMapping
            │     + sceneGrid / sceneFloor (hidden when annotations on)
            │     animate() loop defined at module scope (restartable)
            │     │
            │     └── Annotation System (toggle on/off)
            │           troika-three-text Text labels (billboarded)
            │           THREE.Line arrow from dot to label
            │           THREE.SphereGeometry dot at anatomy point
            │           Raycaster click → popup (label + description)
            │           Hover → cursor:pointer
            │           Grid + floor hidden while annotations visible
            │
            └── AR Mode ("Magic Window")
                  3D animate() loop PAUSED on entry, RESTARTED on exit
                  getUserMedia (rear camera) → <video> element
                  WebGLRenderer (alpha:true, transparent)
                  overlaid on top of camera feed
                  Touch layer (div) captures 1-finger rotate, 2-finger pinch
                  30-second countdown → auto-exit via exitAR()
```

---

## WebGL Lifecycle Management

Each species page creates one WebGL renderer on mount and must fully release
it on unmount. Browsers allow only ~8–16 WebGL contexts — without proper
teardown, repeated page switching exhausts the limit and crashes the app.

### Critical rule: one active renderer at a time

The 3D `animate()` loop is **paused** (`cancelAnimationFrame`) when AR starts
and **restarted** (`animate()`) when AR exits. Running both renderers
simultaneously for 30 seconds exhausts the Android GPU driver and causes
a hard crash when AR cleanup is attempted.

### Disposal chain (called in `onUnmounted`)

```
onUnmounted()
    ├── destroyed = true          ← blocks any in-flight GLTFLoader callback
    ├── destroyViewer()
    │     ├── cancelAnimationFrame(animFrameId)
    │     ├── controls.dispose()              ← removes OrbitControls listeners
    │     ├── disposeThreeObject(scene)        ← traverses all meshes:
    │     │     ├── geometry.dispose()         │  frees GPU geometry buffers
    │     │     └── material + textures.dispose() │  frees GPU texture memory
    │     ├── scene.environment.dispose()     ← frees IBL env map texture
    │     ├── renderer.forceContextLoss()     ← immediately releases WebGL context slot
    │     └── renderer.dispose() + DOM remove
    │
    └── destroyAR()
          ├── clearInterval(arCountdownTimer) ← stop countdown
          ├── cancelAnimationFrame(arFrameId)
          ├── arStream.getTracks().forEach(stop)
          ├── remove touch layer + event listeners
          ├── arScene.environment.dispose()   ← AR-exclusive IBL only
          │   NOTE: disposeThreeObject(arScene) is intentionally NOT called —
          │   arModel is a shallow clone of loadedGltf.scene and shares the
          │   same geometry/material instances. Disposing them here would
          │   destroy the 3D viewer's materials and crash the app.
          └── arRenderer.dispose() + DOM remove + video remove
              NOTE: arRenderer.forceContextLoss() is intentionally NOT called —
              on some Android GPU drivers this crashes the WebView process.
              arRenderer.dispose() alone is sufficient for the AR toggle case.
```

### GLTFLoader race condition guard

```js
// At top of GLTFLoader callback:
if (destroyed) { disposeThreeObject(gltf.scene); return }
```

If the user navigates away before the model finishes loading, the freshly
loaded GLTF is disposed immediately instead of being added to a null scene.

### Animation loop null-guards

```js
function animate () {
  if (!renderer || !scene || !camera || !controls) return
  animFrameId = requestAnimationFrame(animate)
  // ...
}
```

Prevents the render loop executing one final frame after teardown.
`animate` is defined at module scope (outside `initThree`) so it can be
called from `exitAR` to restart the 3D loop after AR exits.

---

## Notes Feature

Users can attach text notes to any species. Notes persist across sessions.

```
stores/notes.js
    data: { [speciesId]: [{ id, text, createdAt }, ...] }
    │
    ├── addNote(speciesId, text)       unshift (newest first)
    ├── deleteNote(speciesId, noteId)
    ├── deleteAllNotesForSpecies(id)
    └── allNotes (computed)            → [{ speciesId, notes[] }, ...]
                                         only non-empty groups
```

**Species page Notes tab:**
- Displays only the most recently added note (index 0, since `unshift` is used)
- Input field + Add button to create new notes
- List button navigates to `/notes` (master notes page)

**Master Notes page (`/notes`):**
- Species filter dropdown replaces the "all notes" label
- Default: "All Notes" — shows every species group
- Select a species: filters to only that species' notes
- Email export, delete all, delete per species actions

---

## Android Integration

```
Capacitor
    └── MainActivity.java (patched)
            ├── onCreate()  → requests CAMERA permission at launch
            └── onStart()   → overrides WebChromeClient to grant
                              WebView-level camera access for getUserMedia
```

The web app never knows it's inside Capacitor — it uses standard Web APIs
(`getUserMedia`, `WebGL`, `Canvas`). Capacitor's only role is to:
1. Package the web app into an APK
2. Provide the Android camera permission bridge via `MainActivity.java`

---

## Build Pipeline

```
quasar build -m capacitor -T android
    │
    ├── 1. Vite bundles src/ → dist/capacitor/android/
    ├── 2. npx cap sync      → copies dist into src-capacitor/android/
    └── 3. gradlew assemble  → compiles Java + bundles → .apk
             ↑
             patched via backup/capacitor-builder.js (Windows path fix)
```

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| One `.vue` file per species | Full independent control per species page, no shared state coupling |
| `import.meta.glob` for routes | Zero-maintenance extensibility — add file = add route |
| `species.json` as single source | Drawer, router, QR scanner, and annotation positions all stay in sync |
| Magic Window AR (not marker-based) | No printed markers needed, works with any camera view |
| Three.js directly (no AR SDK) | Smaller APK, no native dependencies, full rendering control |
| Hash router mode | Works inside Capacitor WebView without server configuration |
| Pinia for notes | Reactive, localStorage-persisted, accessible from any page |
| `forceContextLoss()` before `dispose()` | Immediately frees WebGL context slot — prevents crash after ~8 page switches |
| `destroyed` flag per species page | Guards GLTFLoader callbacks from firing into a torn-down component |
| troika-three-text for annotations | SDF text stays crisp at any zoom; integrates as standard Three.js mesh |
| Raycaster on dots + text meshes | Both geometry types are standard Three.js Mesh — no custom hit-testing needed |
| Grid/floor hidden during annotations | Clean black backdrop makes labels and lines readable |
