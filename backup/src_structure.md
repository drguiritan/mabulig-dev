# Source Code Structure

## Full Directory Tree

```
demo/
├── backup/                          ← patch files + docs (this folder)
├── public/
│   ├── models/                      ← GLB 3D model files
│   │   ├── platymantis.glb
│   │   └── ansoniamuelleri.glb
│   ├── icons/                       ← app icons (favicon sizes)
│   └── favicon.ico
├── src/
│   ├── App.vue                      ← root component
│   ├── assets/
│   ├── boot/
│   │   └── pinia.js                 ← registers Pinia with the Quasar app
│   ├── css/
│   │   ├── app.scss                 ← global styles
│   │   └── quasar.variables.scss    ← Quasar theme variables
│   ├── data/
│   │   └── species.json             ← master species registry (28 entries) + annotation positions
│   ├── layouts/
│   │   └── MainLayout.vue           ← persistent shell (header + left drawer)
│   ├── pages/
│   │   ├── IndexPage.vue            ← landing page
│   │   ├── ScanPage.vue             ← QR code scanner
│   │   ├── NotesPage.vue            ← master notes viewer with species filter
│   │   ├── ErrorNotFound.vue        ← 404 fallback
│   │   └── species/                 ← one file per species
│   │       ├── platymantis.vue
│   │       └── ansoniamuelleri.vue
│   ├── stores/
│   │   └── notes.js                 ← Pinia store: notes per species, localStorage
│   └── router/
│       ├── index.js                 ← Vue Router instance
│       └── routes.js                ← route definitions (auto-glob + static)
├── src-capacitor/
│   └── android/
│       └── app/src/main/
│           ├── java/demo/app/mabulig/
│           │   └── MainActivity.java  ← patched: camera permissions
│           └── AndroidManifest.xml    ← patched: camera uses-permission
├── TIPS_production.md               ← build & patch instructions
├── quasar.config.js                 ← Quasar + Vite + Capacitor config
└── package.json
```

---

## File-by-File Explanation

---

### `src/App.vue`
The root Vue component. Contains only `<router-view />`. Every page is
rendered through this single entry point.

---

### `src/boot/pinia.js`
Quasar boot file that registers Pinia as a Vue plugin. Required before any
`useXxxStore()` call can work inside components.

```js
import { boot } from 'quasar/wrappers'
import { createPinia } from 'pinia'
export default boot(({ app }) => { app.use(createPinia()) })
```

Must be listed in `quasar.config.js` under `boot: ['pinia']`.

---

### `src/stores/notes.js`
Pinia store managing all user notes across all species.

```js
// Shape: { [speciesId]: Array<{ id, text, createdAt }> }
const data = ref({})
```

Persisted to `localStorage` under the key `'ar_viewer_notes'` on every
mutation. Loaded from storage automatically on first use (`init()` called
inside `defineStore`).

**API:**

| Function | Description |
|---|---|
| `getSpeciesNotes(speciesId)` | Returns notes array for one species (newest first) |
| `addNote(speciesId, text)` | Prepends note via `unshift` (newest at index 0) |
| `deleteNote(speciesId, noteId)` | Removes one note by id |
| `deleteAllNotesForSpecies(id)` | Clears all notes for a species |
| `allNotes` (computed) | `[{ speciesId, notes[] }, ...]` — only non-empty groups |

---

### `src/router/routes.js`
Defines all application routes. Species routes are **auto-discovered**:

```js
const speciesModules = import.meta.glob('../pages/species/*.vue')

const speciesRoutes = Object.entries(speciesModules).map(([filePath, component]) => {
  const id = filePath.replace('../pages/species/', '').replace('.vue', '')
  return { path: `model/${id}`, component }
})
```

Static routes:
- `/` → `IndexPage.vue`
- `/scan` → `ScanPage.vue`
- `/notes` → `NotesPage.vue`
- `/model/:id` → auto-discovered species pages

---

### `src/data/species.json`
The master registry for all 28 species. Each entry:

```json
{
  "id": "platymantis",           ← matches .vue filename and .glb filename
  "scientific": "Platymantis corrugatus",
  "common": "Corrugated Forest Frog",
  "family": "Ceratobatrachidae",
  "habitat": "...",
  "distribution": "...",
  "conservation": "Least Concern",
  "badgeColor": "positive",
  "description": "...",
  "model": "models/platymantis.glb",
  "available": true,             ← false = shows "Soon" in drawer, not clickable
  "external_features": {
    "dorsal":  [{ "label": "Dorsal Skin", "description": "...", "point": [0, 0.65, 0] }],
    "ventral": [{ "label": "Ventral Skin", "description": "...", "point": [0, 0.12, 0.05] }],
    "limbs":   [{ "label": "Forelimbs", "description": "...", "point": [0.42, 0.18, 0.28] }],
    "other":   [{ "label": "Eye", "description": "...", "point": [0.22, 0.54, 0.68] }]
  }
}
```

`point` is a 3-element `[x, y, z]` array in model-space coordinates after
normalization (model scaled to 2 units max dim, floor at y=0, z+ = front/snout).
These coordinates drive the annotation dot positions in the 3D viewer.
Unavailable species (03–28) have empty arrays: `"dorsal": []` etc.

Imported by:
- `MainLayout.vue` — builds the drawer list
- `ScanPage.vue` — validates scanned QR codes against known ids
- `NotesPage.vue` — maps speciesId → display label for the notes filter
- Each `species/*.vue` — contains its own hardcoded copy of its own entry

---

### `src/layouts/MainLayout.vue`
The persistent shell that wraps every page. Contains:

- **Header** (`q-header`): hamburger menu button + page title (derived from
  current route) — no back button
- **Left Drawer** (`q-drawer`): numbered ordered list of all 28 species loaded
  from `species.json`. Available species are clickable links to `/model/{id}`.
  Unavailable species show a grey "Soon" badge. Active item is highlighted.
  QR scan shortcut at top of drawer.
- **`<router-view />`**: all page content renders here

---

### `src/pages/NotesPage.vue`
The master notes browser. Shows all user notes grouped by species.

**Key features:**
- **Species filter dropdown** — replaces the static "all notes" heading.
  Built from `notesStore.allNotes` (only species with notes appear).
  Default (`null`) shows all groups. Selecting a species filters to that group.
- **Email export** — formats all notes as plain text and opens `mailto:`
- **Delete all** — confirm dialog, then wipes every note in the store
- **Delete per species** — clears all notes for one species
- **Delete per note** — removes a single note
- **Markdown rendering** — note text renders `**bold**`, `*italic*`, `` `code` ``
- **Empty states** — "No notes yet" (store empty) vs "No notes for this species"
  (filter active but no match)

---

### `src/pages/species/*.vue`
Each species has its own dedicated page. All species pages share identical
structure — only the `SPECIES` data object at the top differs.

**Internal structure:**

```
<script setup>
  // ── Imports ───────────────────────────────────────────────────
  three, GLTFLoader, OrbitControls, RoomEnvironment
  troika-three-text { Text }
  src/data/species.json       ← imported to read external_features + annotation points

  // ── Species data ──────────────────────────────────────────────
  SPECIES = { id, scientific, common, family, habitat,
              distribution, conservation, badgeColor, description, model }

  // ── Annotations ───────────────────────────────────────────────
  ANNOTATIONS[]              ← flat list of all features with point + cat from species.json
  CAT_COLOR{}                ← { dorsal:cyan, ventral:orange, limbs:green, other:purple }
  annotationsVisible = ref(false)
  annotationPopup    = ref(null)   ← { label, description, x, y } | null
  annotationGroup    = null        ← THREE.Group holding all dots + lines + text
  annotationMap      = new Map()   ← mesh.uuid → { label, description }
  _raycaster, _pointer             ← for click/hover hit detection

  buildAnnotations()         ← creates dots, lines, troika Text; adds click/hover listeners
  clearAnnotations()         ← disposes all, removes listeners, clears map + popup
  _raycastAnnotations(e)     ← NDC mouse → raycaster → first hit
  onAnnotationClick(e)       ← sets annotationPopup at clamped screen coords
  onAnnotationHover(e)       ← sets cursor:pointer on hit
  toggleAnnotations(val)     ← hides/shows sceneGrid+sceneFloor; calls build/clear

  // ── Notes ─────────────────────────────────────────────────────
  notesStore = useNotesStore()
  activeTab       = ref('info')
  newNoteText     = ref('')
  speciesNotes    = computed(() => notesStore.getSpeciesNotes(SPECIES.id))
  lastNote        = computed(() => speciesNotes.value[0] ?? null)
  addNote()       → notesStore.addNote(SPECIES.id, text)
  goToAllNotes()  → router.push('/notes')

  // ── State ─────────────────────────────────────────────────────
  destroyed = false          ← guard for GLTFLoader race condition
  mode = ref('3d')           ← '3d' or 'ar'
  loading, loadError, arLoading, arLoadingMsg
  arCountdown = ref(30)      ← countdown display value
  arCountdownTimer           ← setInterval handle

  // ── Three.js refs ─────────────────────────────────────────────
  renderer, scene, camera, controls, animFrameId, loadedGltf
  sceneGrid, sceneFloor      ← visibility toggled by annotation switch

  // ── AR refs ───────────────────────────────────────────────────
  arRenderer, arScene, arCamera, arFrameId, arStream, arModel, arTouchLayer

  // ── Disposal helpers ──────────────────────────────────────────
  disposeThreeObject(obj)    ← traverse + dispose geometries/materials/textures
  destroyViewer()            ← clearAnnotations first, then cancel RAF, dispose all, forceContextLoss
  destroyAR()                ← cancel countdown+RAF, stop stream, dispose AR env only
                               NOTE: does NOT dispose arScene geometry/materials —
                               they are shared with loadedGltf via shallow clone

  // ── Core functions ────────────────────────────────────────────
  initThree()                ← sets up WebGL renderer, scene, lights, GLTFLoader
  animate()                  ← 3D render loop; also billboards annotation Text each frame
  onResize()                 ← resizes renderer; guarded against 0-dimension layout race
  enterAR()                  ← pauses 3D loop, opens camera, creates AR renderer+clone
  exitAR()                   ← stops AR loop, shows spinner (400ms), calls destroyAR(),
                               switches to '3d', restarts animate()
  scaleAndCenterForAR()      ← normalises model scale/position for AR view
  arTouchStart/Move/End()    ← 1-finger rotate, 2-finger pinch zoom

  // ── Lifecycle ─────────────────────────────────────────────────
  onMounted  → nextTick(initThree)
  onUnmounted → destroyed=true, removeEventListener, destroyViewer(), destroyAR()
```

**Notes tab behaviour:**
- Shows only the single most recently added note (`lastNote` = `speciesNotes[0]`)
- Add button creates a new note for the current species
- List button (`icon="list"`) navigates to `/notes`

**WebGL context safety:**
- `destroyed` flag set in `onUnmounted` prevents GLTFLoader callback from
  touching a disposed scene
- `renderer.forceContextLoss()` called before `renderer.dispose()` to
  immediately free the browser's WebGL context slot (page unmount only)
- `arRenderer.dispose()` alone used for AR toggle — `forceContextLoss()` on
  the AR renderer crashes some Android GPU drivers after 30s of rendering
- `animate()` defined at module scope so `exitAR()` can restart it
- 3D `animate()` loop paused on AR entry, restarted on AR exit — running
  both renderers simultaneously for 30s exhausts the Android GPU
- Null-guards in `animate()` and `arAnimate()` stop the loop if refs are gone
- `onResize()` guards against 0-dimension resize during post-AR layout settle

**Why one file per species (not a generic dynamic page):**
Each page is fully self-contained. This gives complete independence — different
species can have different lighting, scale, camera position, or extra UI
features without affecting any other species page.

---

### `public/models/`
GLB (GL Binary) files — self-contained 3D models with embedded textures,
materials, and mesh data. Served as static assets. Loaded at runtime by
`GLTFLoader` directly from the URL path `models/xxx.glb`.

Files are large (50MB+) because textures are embedded. They are NOT bundled
by Vite — they are copied to `dist/` as-is.

---

### `src-capacitor/android/`
The native Android project generated by Capacitor. Key files:

| File | Purpose |
|---|---|
| `MainActivity.java` | Entry point for the Android app. Patched to request camera permission and grant WebView camera access. |
| `AndroidManifest.xml` | Declares app permissions and hardware features. Must include `CAMERA` permission. |
| `build.gradle` | Gradle build config. Do not edit unless changing SDK versions. |

This folder is managed by `npx cap sync` which can overwrite `MainActivity.java`.
Always keep `backup/MainActivity.java` as the restore source.
