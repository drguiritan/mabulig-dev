# Blueprint Layout — UI Structure & Viewport Behavior

## Global Layout Shell

Every page is wrapped by `MainLayout.vue` which provides:

```
┌─────────────────────────────────────┐  ← q-header (50px, bg-dark, elevated)
│  ☰  [Page Title]                    │
├─────────────────────────────────────┤
│                                     │
│         <router-view />             │  ← q-page-container
│         (page content here)         │
│                                     │
└─────────────────────────────────────┘

Left edge (hidden by default):
┌──────────────┐
│ 🔷 Frog      │  ← q-drawer (width: 300px, side: left)
│    Species   │
│ 2/28 avail   │
├──────────────┤
│ [QR Scan]    │
├──────────────┤
│ 01 Platym... │  ← clickable, active highlight
│ 02 Ansonia   │  ← clickable
│ 03 Species03 │  ← "Soon" badge, greyed, not clickable
│ ...          │
│ 28 ...       │
└──────────────┘
```

- Header height: `50px`
- Drawer width: `300px`, overlays content on mobile (not persistent)
- Layout view string: `"hHh lpr fFf"` — no right panel reserved (`r` lowercase)
- Router mode: `hash` — URLs use `#/` prefix, required for Capacitor WebView

---

## Landing Page (`IndexPage.vue`)

```
┌─────────────────────────────────────┐
│  ☰  AR Viewer                       │  ← header
├─────────────────────────────────────┤
│                                     │
│        🔷 (AR icon, 72px)           │  ← landing-top (flex: 0)
│         AR Viewer                   │
│   Scan a QR code to view...         │
│                                     │
│    ┌─────────────────────────┐      │
│    │   [QR code illustration] │      │  ← landing-mid (flex: 1, centered)
│    │      (grey, 140px)       │      │
│    └─────────────────────────┘      │
│    Point your camera at a QR code   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  📷  Scan QR Code             │  │  ← landing-bottom (flex: 0)
│  └───────────────────────────────┘  │
│     Camera permission required      │
└─────────────────────────────────────┘
```

- Background: `radial-gradient(ellipse at top, #0d1f3c, #0a0a0a)`
- Full flexbox column with `justify-between`
- "Scan QR Code" button navigates to `/scan`

---

## QR Scan Page (`ScanPage.vue`)

```
┌─────────────────────────────────────┐
│  ☰  Scan QR Code                    │  ← header
├─────────────────────────────────────┤
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░  (live camera feed)  ░░░░░░░░│  ← <video> fullscreen, z-index 0
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░   ┌──────────────────┐   ░░░░░░│
│░░░   │ ← corner bracket  │   ░░░░░░│  ← scan-frame overlay
│░░░   │  ─────────────── │   ░░░░░░│     (animated scan line)
│░░░   │ ← corner bracket  │   ░░░░░░│
│░░░   └──────────────────┘   ░░░░░░│
│░░░░       Align QR code       ░░░░░│  ← status text
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────────┘

Hidden (off-screen): <canvas> — jsQR reads pixel data from here each frame
```

- `<video>` is `position: absolute; inset: 0; object-fit: cover` — fills entire page
- Viewfinder overlay is `position: absolute` centered on screen
- Scan line animates up/down inside the frame with CSS keyframes
- `jsQR` runs on every `requestAnimationFrame` tick reading from hidden canvas

---

## Species Page — 3D Viewer Mode

This is the most complex layout. It uses a **flexbox column** to split the
viewport into two zones with no overlap.

```
┌─────────────────────────────────────┐  ← q-header (50px)
├─────────────────────────────────────┤
│                                     │
│                                     │
│      Three.js WebGL Canvas          │  ← .viewer-container
│      (flex: 1, fills all space      │     flex: 1 / min-height: 0
│       above the info panel)         │     Three.js canvas appended here
│                                     │
│   [frog model on grid + floor]      │
│   (grid+floor hidden when           │
│    annotations are on)              │
│                                     │
├─────────────────────────────────────┤  ← top edge of species panel
│  Common Name    [LC badge] │ [AR►]  │  ← .panel-header (~70px)
│  italic scientific name    │[● Ann] │     right col: AR btn + annotation toggle
├─────────────────────────────────────┤
│  [ℹ Info] [📄 About] [✏ Notes(n)]  │  ← q-tabs (dense, 34px, small icons)
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  (tab content, scrollable)    │  │  ← q-tab-panels (flex: 1, overflow scroll)
│  │                               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘  ← 260px total panel height (fixed)
```

### Panel Header — Right Column Layout

The right side of the panel header stacks two controls vertically:

```
┌──────────────────┐
│  [ ► AR ]        │  ← q-btn (unelevated, rounded, primary, size sm)
│  [○─ Annotation] │  ← q-toggle (size md) + "Annotation" caption
│                  │    inside a pill-shaped frosted-glass div
└──────────────────┘
```

- AR button navigates to full-screen camera AR mode
- Annotation toggle: slides on = shows 3D labels + hides grid/floor; slides off = removes all
- Toggle row styled with `background: rgba(255,255,255,0.05)`, `border-radius: 14px`,
  caption text `#90caf9` (Material Blue 200)

### Annotation Popup

When a label or dot is clicked in 3D annotation mode, a popup appears:

```
┌────────────────────────────┐
│ Label Name            [×]  │  ← title in #90caf9, close button
│ Description text here...   │  ← description in #90a4ae, 11px, 1.55 line-height
└────────────────────────────┘
```

- `position: fixed` at click coordinates (clamped to viewport edges)
- `transform: translateY(-50%)` — vertically centered on click point
- Dark blue frosted glass: `rgba(10,18,38,0.97)`, `backdrop-filter: blur(14px)`
- Thin blue border: `rgba(144,202,249,0.22)`

### Species Panel — Fixed Height Layout

The entire `.species-panel` has a **fixed height of 260px** using flexbox:

```css
.species-panel {
  height: 260px;
  display: flex;
  flex-direction: column;
}

.panel-tab-panels {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  :deep(.q-tab-panel) {
    height: 100%;
    overflow-y: auto;    ← each tab panel scrolls independently
  }
}
```

Height breakdown:
- `.panel-header`: ~60px (name + scientific + badge + padding)
- `q-tabs`: 34px (min-height, dense)
- `q-separator`: 1px
- `.panel-tab-panels`: fills remaining ~165px, scrollable

### Tab Control

Three tabs, all `dense` with small icons (`font-size: 14px`) to maximise label space:

| Tab | Icon | Label |
|---|---|---|
| Info | `info_outline` | "Info" |
| About | `article` | "About" |
| Notes | `edit_note` | "Notes" or "Notes (n)" when notes exist |

```css
.species-tabs {
  :deep(.q-tab__icon)  { font-size: 14px; width: 14px; height: 14px; }
  :deep(.q-tab__label) { font-size: 11px; }
}
```

### Tab 1 — Info

Displays species metadata in two-column label/value rows:
- Family, Habitat, Distribution

### Tab 2 — About

Single paragraph description text (`text-caption text-grey-4`), scrollable.

### Tab 3 — Notes

```
┌─────────────────────────────────┐
│ [  Add a note…            ] [+] [≡] │  ← input + Add btn + List btn
│                                     │
│  ┌───────────────────────────────┐  │
│  │ note text (last added only)   │  │  ← most recent note (index 0)
│  │                            [🗑]│  │     delete button
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

- **Add button** (`icon="add"`): calls `addNote()`, adds to current species
- **List button** (`icon="list"`): navigates to `/notes` (master notes page)
- Only the **most recently added note** is displayed (notes are stored newest-first via `unshift`)
- Full notes list is on the master `NotesPage`

---

## Notes Page (`/notes`) — `NotesPage.vue`

```
┌─────────────────────────────────────┐  ← header
│  ☰  Notes                           │
├─────────────────────────────────────┤
│                                     │
│  🗒  [All Notes ▾]    [✉] [🗑all]   │  ← header row
│      ↑ species filter dropdown      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔷 Corrugated Forest Frog   │[🗑]│  ← species group heading
│  │─────────────────────────────│    │
│  │ • note text                 │[🗑]│  ← individual note
│  │   Apr 17, 2026 10:30 AM     │    │
│  │ • another note              │[🗑]│
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔷 Mueller's Slender Toad   │[🗑]│
│  │─────────────────────────────│    │
│  │ • note text                 │[🗑]│
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Species Filter Dropdown

Replaces the static "all notes" heading text. Renders as a styled `q-select`
matching the h6 heading weight:

```
Options:
  ● All Notes          ← value: null  (default — shows all species groups)
  ○ Corrugated Frog    ← value: 'platymantis'
  ○ Mueller's Toad     ← value: 'ansoniamuelleri'
  (only species that have at least one note appear)
```

Filter logic:
```js
const filteredNotes = computed(() =>
  selectedSpecies.value === null
    ? notesStore.allNotes                          // all groups
    : notesStore.allNotes.filter(g => g.speciesId === selectedSpecies.value)
)
```

Options rebuild automatically when notes are added or deleted.

### Actions

| Button | Condition | Action |
|---|---|---|
| `mail_outline` | notes exist | Opens `mailto:` with all notes formatted as email body |
| `delete_sweep` (header) | notes exist | Opens confirm dialog → deletes all notes |
| `delete_sweep` (per group) | always | Deletes all notes for that species |
| `delete_outline` (per note) | always | Deletes single note |

### Empty States

- No notes at all: shows icon + "No notes yet" + hint text
- Filter active but species has no notes: shows "No notes for this species"

---

## Species Page — AR Mode

When the user taps the AR button, the entire page switches to fullscreen AR.

```
┌─────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░  LIVE REAR CAMERA FEED  ░░░░░░│  ← <video> z-index: 0
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░  [3D FROG RENDERED      ░░░░░░│  ← Three.js canvas z-index: 1
│░░░░░   TRANSPARENTLY ON TOP] ░░░░░░│     alpha: true, clearColor(0,0,0,0)
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                  ✕ │  ← ar-exit-btn z-index: 10002
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│     1 finger: rotate • 2: zoom     │  ← ar-hint z-index: 10001
└─────────────────────────────────────┘
   ↑ invisible touch layer z-index: 2 (captures all touch events)
```

### AR Layer Stack (z-index order)

| Layer | Element | z-index | pointer-events |
|---|---|---|---|
| 1 (bottom) | `<video>` camera feed | 0 | none |
| 2 | Three.js `<canvas>` (transparent) | 1 | none |
| 3 | Touch capture `<div>` | 2 | all |
| 4 | AR hint text | 10001 | none |
| 5 | Exit (✕) button | 10002 | auto |
| 6 | Loading overlay | 10003 | all |

### AR Entry / Exit Sequence

**Enter AR:**
1. `mode = 'ar'` → AR overlay div appears, loading spinner shown
2. **3D `animate()` loop paused** (`cancelAnimationFrame`) — only one renderer active at a time
3. `getUserMedia({ facingMode: 'environment' })` → rear camera stream
4. `<video>` element created and appended with stream
5. Wait for `video.oncanplay` (or 2s timeout)
6. AR `WebGLRenderer` (alpha: true) created and appended
7. Touch layer `<div>` created and appended
8. GLB model cloned from already-loaded `loadedGltf` (no re-download)
9. Model scaled/centered → added to AR scene
10. `arLoading = false` → spinner hidden, exit button + countdown appear
11. 30-second countdown starts (`setInterval`)

**Exit AR (`exitAR` → `destroyAR`):**
1. `arExiting = true` guard prevents double-call
2. AR render loop (`arFrameId`) cancelled immediately — GPU goes idle
3. `arLoading = true` → "Closing camera…" spinner shown (400ms)
4. After 400ms: `destroyAR()` called:
   - `clearInterval(arCountdownTimer)` + reset `arCountdown = 30`
   - Cancel AR animation frame (redundant safety check)
   - Stop camera stream tracks
   - Remove touch layer + event listeners
   - `arScene.environment.dispose()` (AR-exclusive IBL only)
   - `arRenderer.dispose()` + remove canvas from DOM
   - Remove `<video>` from DOM
5. `mode = '3d'` → Vue restores 3D view
6. `await nextTick()` → Vue DOM fully settled
7. `onResize()` → fit 3D canvas to now-visible container
8. **`animate()` restarted** → 3D render loop resumes

**Countdown auto-exit:**
- `setInterval` fires every 1000ms, decrements `arCountdown`
- At 0: interval cleared, then `setTimeout(700ms)` → `exitAR()`
- The 700ms gap lets Vue flush the `[0]` display before teardown begins
- `if (mode.value === 'ar')` guard prevents double-exit if user already clicked X

### AR Touch Controls

```
1 finger (touchmove):
  dx = currentX - lastX  →  arModel.rotation.y += dx * 0.008
  dy = currentY - lastY  →  arModel.rotation.x += dy * 0.008 (clamped ±90°)

2 fingers (touchmove):
  newDist = distance between fingers
  scale = arModel.scale.x * (newDist / lastDist)
  arModel.scale.setScalar( clamp(scale, baseScale*0.3, baseScale*3) )
```

---

## CSS Layout Chain — Species Page

```
q-page (.model-page)
  display: flex
  flex-direction: column
  height: calc(100vh - 50px)    ← full screen minus header
  padding: 0 !important         ← override Quasar's default page padding
  width: 100%

  ├── .viewer-container
  │     flex: 1                 ← takes ALL remaining space above panel
  │     min-height: 0           ← allows flex child to shrink below content size
  │     width: 100%
  │     position: relative      ← Three.js canvas is appended inside here
  │
  └── .species-panel            ← FIXED 260px height
        height: 260px
        display: flex
        flex-direction: column
        background: rgba(13,17,23,0.96)
        border-top: 1px solid rgba(255,255,255,0.08)

        ├── .panel-header       ← natural height ~60px
        ├── q-tabs (.species-tabs) ← 34px min-height
        ├── q-separator         ← 1px
        └── .panel-tab-panels   ← flex: 1, fills remaining ~165px
              :deep(.q-tab-panel) { height: 100%; overflow-y: auto }
```

---

## Summary: Viewport Division

```
Total screen height
│
├── 50px  ← Quasar header (q-header, elevated, bg-dark)
│
└── calc(100vh - 50px)  ← q-page (.model-page, flex column)
    │
    ├── flex: 1  ← .viewer-container (Three.js canvas, fills remaining space)
    │
    └── 260px   ← .species-panel (fixed height, flex column)
                   ├── ~60px  panel-header
                   ├── 34px   tab bar
                   ├── 1px    separator
                   └── ~165px tab content (scrollable)
```

In AR mode: `.ar-overlay` is `position: fixed; inset: 0` — it bypasses the
flex layout entirely and covers 100% of the physical screen.

---

## Conservation Status Badge

The species info panel displays a `q-badge` whose color is driven by the
`badgeColor` field in both `src/data/species.json` and the `SPECIES` object
inside each `src/pages/species/*.vue` file.

### IUCN Color Reference

| Conservation Status | `badgeColor` value | Quasar color |
|---|---|---|
| Least Concern | `positive` | Green |
| Near Threatened | `teal` | Teal |
| Vulnerable | `warning` | Amber |
| Endangered | `orange` | Orange |
| Critically Endangered | `negative` | Red |
| Data Deficient | `grey-6` | Grey |
| — (placeholder / unknown) | `grey-6` | Grey |
