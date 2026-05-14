# How to Add a New Species — Step-by-Step Guide
*Reference: adding Staurois natator (staurois_natator)*

---

## Files Affected

| # | File | Action |
|---|------|--------|
| 1 | `public/models/<id>.glb` | Add the 3D model |
| 2 | `src/data/species.json` | Add species entry + annotations |
| 3 | `src/pages/species/<id>.vue` | Create the species page |

No changes needed to `src/router/routes.js` — routes are auto-discovered.

---

## Step 1 — Add the GLB Model

Place the `.glb` file inside `public/models/`:

```
public/
  models/
    staurois_natator.glb   ← drop it here
```

The filename must exactly match the `id` you will use in the next steps.

---

## Step 2 — Add the Entry in `src/data/species.json`

Open `src/data/species.json` and insert a new object **before** the placeholder slots (`species_03`, `species_04`, …). Insert it after the last real species entry.

```json
{
  "id": "staurois_natator",
  "scientific": "Staurois natator",
  "common": "White-spotted Torrent Frog",
  "family": "Ranidae",
  "order": "Anura",
  "habitat": "Rocky fast-flowing mountain streams in primary dipterocarp forest",
  "distribution": "Borneo (Sabah, Sarawak, Kalimantan), Philippines (Palawan)",
  "conservation": "Least Concern",
  "badgeColor": "positive",
  "description": "A striking torrent frog renowned for its unique 'foot-flagging' courtship display...",
  "model": "models/staurois_natator.glb",
  "available": true,
  "external_features": {
    "dorsal": [
      {
        "label": "Dorsal Coloration",
        "description": "Dark brown to black dorsum with irregular white or cream spots.",
        "point": [0, 0.62, 0]
      }
    ],
    "ventral": [
      {
        "label": "Ventral Surface",
        "description": "Pale yellowish-white with dark mottling; smooth to finely granular.",
        "point": [0, 0.11, 0.04]
      }
    ],
    "limbs": [
      {
        "label": "Webbed Feet",
        "description": "Fully webbed toes used in the iconic foot-flagging display.",
        "point": [0.66, 0.03, -0.85]
      }
    ],
    "other": [
      {
        "label": "Eye",
        "description": "Large and protuberant; horizontal pupil; bronze to gold iris.",
        "point": [0.2, 0.52, 0.66]
      }
    ]
  }
}
```

### Key fields

| Field | Purpose |
|-------|---------|
| `id` | Must match the `.vue` filename and the `.glb` filename (no extension) |
| `available` | `true` = clickable in the drawer; `false` = grayed out with "Soon" badge |
| `badgeColor` | Quasar color for the conservation badge (`"positive"`, `"warning"`, `"negative"`, `"grey-6"`) |
| `point` | `[x, y, z]` — 3D coordinate for the annotation dot in the viewer (model space) |

### Annotation categories
Each category renders in a distinct color in the 3D viewer:

| Category | Color |
|----------|-------|
| `dorsal` | Cyan `#00ccff` |
| `ventral` | Orange `#ffaa44` |
| `limbs` | Green `#44ff88` |
| `other` | Purple `#cc88ff` |

---

## Step 3 — Create the Species Page

Create `src/pages/species/staurois_natator.vue` by **copying an existing species page** (`ansoniamuelleri.vue` or `platymantis.vue`) verbatim, then changing **only** the `SPECIES` object. Every other block must remain identical.

The full Vue file is broken into four sections explained below: `<template>`, `<script setup>` (divided by logical group), and `<style>`.

---

### 3A — `<template>` Block

The template has four visual regions rendered conditionally based on the `mode` ref (`'3d'` or `'ar'`).

#### 3A-1 — 3D Viewer Container

```html
<div v-show="mode === '3d'" ref="threeContainer" class="viewer-container">
  <div v-if="loading" class="loading-overlay"> ... </div>
  <div v-if="loadError" class="loading-overlay"> ... </div>
</div>
```

- `v-show` (not `v-if`) keeps the DOM element alive so Three.js can attach its canvas to it even when hidden.
- `ref="threeContainer"` gives the script direct access to the DOM element.
- `loading` overlay shows a spinner while the GLB is being fetched.
- `loadError` overlay shows an error icon if the GLB fails to load.

#### 3A-2 — AR Overlay

```html
<transition name="ar-fade">
  <div v-if="mode === 'ar'" ref="arContainer" class="ar-overlay">
    <!-- loading spinner -->
    <!-- close button -->
    <!-- gesture hint -->
    <!-- countdown note -->
  </div>
</transition>
```

- `v-if` fully mounts/unmounts the AR overlay — the camera and WebGL context are only created when AR is active.
- `ref="arContainer"` is where the camera `<video>` element and the AR WebGL canvas are appended at runtime.
- The four child transitions (`arLoading`, close button, hint, countdown) each fade in independently once AR has finished initialising.

#### 3A-3 — Species Info Panel

```html
<div v-if="mode === '3d'" class="species-panel">
  <!-- panel-header: common name, scientific name, badge, AR button, annotation toggle -->
  <!-- q-tabs: Info / About / Notes -->
  <!-- q-tab-panels -->
</div>
```

- Only visible in `'3d'` mode — hidden during AR to reclaim the full screen.
- **Panel header** shows the species identity pulled from the `SPECIES` constant and the conservation badge colored by `SPECIES.badgeColor`.
- **AR button** calls `enterAR()`.
- **Annotation toggle** (`q-toggle`) calls `toggleAnnotations(val)` which shows/hides the 3D dot labels.
- **Info tab** — family, habitat, distribution from `SPECIES`.
- **About tab** — long-form description from `SPECIES`.
- **Notes tab** — reads from the Pinia `notesStore` scoped to `SPECIES.id`. Shows the most recent note and buttons to add or navigate to the full notes page.

#### 3A-4 — Annotation Popup

```html
<Transition name="fade">
  <div v-if="annotationPopup" class="annotation-popup"
       :style="{ left: annotationPopup.x + 'px', top: annotationPopup.y + 'px' }">
    ...
  </div>
</Transition>
```

- Appears when the user clicks an annotation dot in the 3D viewer.
- Positioned absolutely at the click coordinates (clamped to stay on screen).
- Dismissed by clicking the × button or clicking empty space in the viewer.

---

### 3B — `<script setup>` Block — Section by Section

#### 3B-1 — Imports

```js
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useNotesStore } from 'src/stores/notes.js'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Text } from 'troika-three-text'
import speciesJson from 'src/data/species.json'
```

| Import | Purpose |
|--------|---------|
| Vue reactivity + lifecycle | `ref`, `computed`, `onMounted`, `onUnmounted`, `nextTick` |
| `useRouter` | Navigate to the Notes page from the Notes tab |
| `useNotesStore` | Pinia store — reads/writes field notes scoped per species |
| `THREE` | Core Three.js — scene, camera, renderer, geometry, materials |
| `GLTFLoader` | Loads the `.glb` model file |
| `OrbitControls` | Mouse/touch orbit, zoom, pan in the 3D viewer |
| `RoomEnvironment` | Generates a neutral environment map for realistic PBR lighting |
| `Text` (troika) | Renders crisp 3D text labels for annotations |
| `speciesJson` | The full species list — used to find this species' annotation data |

> **Future improvement:** Instead of importing the whole JSON, you could lazy-fetch only the needed entry via a Pinia store or a composable, avoiding a large static import.

---

#### 3B-2 — SPECIES Object *(the only block you change per species)*

```js
const SPECIES = {
  id:           'staurois_natator',
  scientific:   'Staurois natator',
  common:       'White-spotted Torrent Frog',
  family:       'Ranidae',
  habitat:      'Rocky fast-flowing mountain streams in primary dipterocarp forest',
  distribution: 'Borneo (Sabah, Sarawak, Kalimantan), Philippines (Palawan)',
  conservation: 'Least Concern',
  badgeColor:   'positive',
  description:  "A striking torrent frog...",
  model:        'models/staurois_natator.glb'
}
```

- `id` — used as the Pinia notes key and to look up annotations from `speciesJson`.
- `model` — relative path served from the `public/` folder; Three.js fetches it at runtime.
- All other fields are display-only strings rendered in the info panel.

> **Future improvement:** Remove this object entirely and read everything from `speciesJson` using `useRoute().params.id` — one dynamic page instead of one file per species.

---

#### 3B-3 — Annotations Setup

```js
const _entry = speciesJson.find(s => s.id === SPECIES.id)
const ANNOTATIONS = _entry?.external_features
  ? [
      ...(_entry.external_features.dorsal  || []).map(f => ({ ...f, cat: 'dorsal'  })),
      ...(_entry.external_features.ventral || []).map(f => ({ ...f, cat: 'ventral' })),
      ...(_entry.external_features.limbs   || []).map(f => ({ ...f, cat: 'limbs'   })),
      ...(_entry.external_features.other   || []).map(f => ({ ...f, cat: 'other'   })),
    ].filter(f => f.point)
  : []
const CAT_COLOR = { dorsal: 0x00ccff, ventral: 0xffaa44, limbs: 0x44ff88, other: 0xcc88ff }
```

- Finds this species' entry in the JSON and flattens all four feature arrays into a single `ANNOTATIONS` array, tagging each item with its `cat` (category).
- `.filter(f => f.point)` silently skips any entry that has no 3D coordinate — safe to leave incomplete entries in the JSON.
- `CAT_COLOR` maps each category to a hex color used for the dot, line, and label in the 3D scene.

```js
const annotationsVisible = ref(false)
const annotationPopup    = ref(null)
let annotationGroup = null
const annotationMap = new Map()  // mesh uuid → { label, description }
const _raycaster    = new THREE.Raycaster()
const _pointer      = new THREE.Vector2()
```

- `annotationsVisible` — toggled by the Annotation switch in the panel header.
- `annotationPopup` — holds `{ label, description, x, y }` when a dot is clicked, `null` otherwise.
- `annotationGroup` — a Three.js `Group` added to the scene containing all dots, lines, and text.
- `annotationMap` — maps every mesh/text UUID to its label+description so a raycaster hit can look up the correct popup data.
- `_raycaster` / `_pointer` — reusable raycasting objects (avoids allocation on every mouse event).

---

#### 3B-4 — `buildAnnotations()` and `clearAnnotations()`

```js
function buildAnnotations () {
  clearAnnotations()
  if (!scene || !ANNOTATIONS.length) return
  annotationGroup = new THREE.Group()
  const modelCenter = new THREE.Vector3(0, 0.5, 0)
  ANNOTATIONS.forEach(f => {
    const pt    = new THREE.Vector3(...f.point)
    const color = CAT_COLOR[f.cat] ?? 0xffffff
    const dir   = pt.clone().sub(modelCenter).normalize()
    const lp    = pt.clone().addScaledVector(dir, 0.55)  // label position
    // dot mesh
    // line from dot to label
    // troika Text at label position
  })
  scene.add(annotationGroup)
  renderer.domElement.addEventListener('click',       onAnnotationClick)
  renderer.domElement.addEventListener('pointermove', onAnnotationHover)
}
```

- Called when the annotation toggle is switched on (and the model is already loaded).
- Each annotation renders three objects: a sphere dot at `f.point`, a line extending outward, and a floating text label at `lp`.
- `modelCenter` is a rough center offset used to push labels away from the body. Adjust `(0, 0.5, 0)` if a model is unusually offset.
- `0.55` is the label offset distance from the dot. Increase it if labels overlap the model.
- Click and hover listeners are added to the renderer canvas (not the window) so they don't interfere with other pages.

```js
function clearAnnotations () {
  annotationPopup.value = null
  renderer?.domElement?.removeEventListener('click',       onAnnotationClick)
  renderer?.domElement?.removeEventListener('pointermove', onAnnotationHover)
  if (renderer?.domElement) renderer.domElement.style.cursor = ''
  annotationMap.clear()
  if (!annotationGroup) return
  annotationGroup.traverse(obj => {
    if (obj.isText) { obj.dispose(); return }
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material])
      .forEach(m => m.dispose())
  })
  scene?.remove(annotationGroup)
  annotationGroup = null
}
```

- Removes all annotation objects from the scene and disposes GPU memory (geometry + material + troika text).
- Always called before `buildAnnotations()` to prevent duplicate groups.
- Safe to call even when the scene is null (uses optional chaining).

---

#### 3B-5 — Raycasting (Click & Hover)

```js
function _raycastAnnotations (e) {
  if (!annotationGroup || !renderer || !camera) return null
  const rect = renderer.domElement.getBoundingClientRect()
  _pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
  _pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
  _raycaster.setFromCamera(_pointer, camera)
  const targets = []
  annotationGroup.traverse(obj => { if (annotationMap.has(obj.uuid)) targets.push(obj) })
  const hits = _raycaster.intersectObjects(targets, false)
  return hits.length ? hits[0] : null
}
```

- Converts screen pixel coordinates into normalised device coordinates (NDC) required by Three.js raycasting.
- Only tests objects registered in `annotationMap` (dots and text), not the model mesh — keeps picking fast.

```js
function onAnnotationClick (e) { ... }   // opens annotationPopup
function onAnnotationHover (e) { ... }   // changes cursor to pointer on hover
```

- `onAnnotationClick` clamps the popup position so it never goes off-screen.
- `onAnnotationHover` sets `cursor: pointer` when hovering a dot, resets it otherwise.

---

#### 3B-6 — `toggleAnnotations(val)`

```js
function toggleAnnotations (val) {
  if (sceneGrid)  sceneGrid.visible  = !val
  if (sceneFloor) sceneFloor.visible = !val
  if (val) { if (!loading.value) buildAnnotations() }
  else clearAnnotations()
}
```

- Hides the grid and floor plane when annotations are on (reduces visual clutter).
- Guards against building annotations before the model has finished loading (`!loading.value`).

---

#### 3B-7 — Notes (Pinia)

```js
const router       = useRouter()
const notesStore   = useNotesStore()
const activeTab    = ref('info')
const newNoteText  = ref('')
const speciesNotes = computed(() => notesStore.getSpeciesNotes(SPECIES.id))
const lastNote     = computed(() => speciesNotes.value[0] ?? null)
function addNote () { notesStore.addNote(SPECIES.id, newNoteText.value); newNoteText.value = '' }
function goToAllNotes () { router.push('/notes') }
```

- Notes are stored and retrieved by `SPECIES.id` — each species has its own note list.
- `lastNote` shows only the most recent note in the panel (the Notes page shows all).
- `addNote` clears the input after saving.

> **Future improvement:** Add input validation so empty notes cannot be saved.

---

#### 3B-8 — Reactive State

```js
let destroyed        = false        // set true in onUnmounted — guards async callbacks
const mode           = ref('3d')    // '3d' | 'ar'
const loading        = ref(true)    // true until GLB finishes loading
const loadError      = ref(false)   // true if GLB fetch fails
const arLoading      = ref(false)   // true while AR camera is initialising
const arLoadingMsg   = ref('Starting camera…')
const threeContainer = ref(null)    // DOM ref for the 3D canvas parent
const arContainer    = ref(null)    // DOM ref for the AR overlay parent
```

- `destroyed` is a plain boolean (not a ref) — it only needs to be read inside async callbacks, not tracked by Vue.
- All `ref` values drive template visibility and text content reactively.

---

#### 3B-9 — Three.js and AR Variable Declarations

```js
let renderer, scene, camera, controls, animFrameId, loadedGltf, sceneGrid, sceneFloor
let arRenderer, arScene, arCamera, arFrameId, arStream, arModel, arTouchLayer
let arExiting        = false
let arBaseScale      = 1
let arCountdownTimer = null
const arCountdown    = ref(30)
const touch          = { x: 0, y: 0, dist: 0, count: 0 }
const AR_FOV    = 60
const AR_DIST   = 3
```

- All Three.js objects are plain `let` variables (not refs) — Vue does not need to track them.
- `loadedGltf` caches the loaded model so AR mode can clone it without re-fetching.
- `touch` is a plain object tracking raw pointer state for the AR touch handler.
- `AR_FOV` and `AR_DIST` control the AR camera field of view and model distance. Changing `AR_DIST` moves the model closer or further from the camera in AR.

---

#### 3B-10 — `disposeThreeObject(obj)`

```js
function disposeThreeObject (obj) {
  if (!obj) return
  obj.traverse(child => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach(mat => {
        Object.values(mat).forEach(val => { if (val && val.isTexture) val.dispose() })
        mat.dispose()
      })
    }
  })
}
```

- Walks the entire object tree and frees GPU-side geometry, materials, and textures.
- Called on the main scene when leaving the page to prevent WebGL context leaks.
- **Important:** Do NOT call this on `arScene` directly in AR teardown — `arModel` is a shallow clone of `loadedGltf.scene` and shares the same geometry/material references. Disposing through `arScene` would corrupt the main viewer.

---

#### 3B-11 — `destroyViewer()` and `destroyAR()`

```js
function destroyViewer () {
  clearAnnotations()
  // cancel animation frame
  // dispose OrbitControls
  // dispose scene (geometry, materials, environment map)
  // force-lose WebGL context, dispose renderer, remove canvas from DOM
}
```

Called in `onUnmounted`. Order matters: cancel the animation loop before disposing the renderer, otherwise the next frame fires against a destroyed context.

```js
function destroyAR () {
  // clear countdown timer
  // cancel AR animation frame
  // stop camera stream tracks
  // remove touch event listeners and touch overlay div
  // dispose AR scene environment map only (NOT model geometry — shared with viewer)
  // dispose AR renderer, remove its canvas from DOM
  // remove the video element from arContainer
}
```

- Stops the camera hardware (`arStream.getTracks().forEach(t => t.stop())`) — essential to turn off the camera indicator light on mobile.
- The comment block in the source explains why `disposeThreeObject` must not be used here.

---

#### 3B-12 — Touch Handlers (AR)

```js
function arTouchStart (e) { ... }
function arTouchMove  (e) { ... }
function arTouchEnd   (e) { ... }
```

- Attached to `arTouchLayer` (a transparent `div` sitting on top of the AR canvas at z-index 2).
- **1 finger** — rotates the model by updating `arModel.rotation.x/y`.
- **2 fingers** — pinch-zoom by comparing successive touch distances, scaling `arModel.scale` clamped between `arBaseScale * 0.3` and `arBaseScale * 3`.
- `e.preventDefault()` on all handlers prevents the browser's default scroll/zoom.

---

#### 3B-13 — `initThree()`

```js
function initThree () {
  // 1. Create WebGLRenderer and append its canvas to threeContainer
  // 2. Build PMREMGenerator environment map from RoomEnvironment
  // 3. Create Scene, set background color and environment
  // 4. Create sceneGroup (holds model + floor)
  // 5. Add GridHelper (sceneGrid)
  // 6. Add reflective floor plane (sceneFloor)
  // 7. Create PerspectiveCamera
  // 8. Add AmbientLight + DirectionalLight
  // 9. Create OrbitControls
  // 10. Load GLB with GLTFLoader:
  //     - normalize scale to fit within 2 units
  //     - sit model on the floor (y = 0)
  //     - reposition camera to frame the model
  // 11. Start animation loop
  // 12. Attach resize listener
}
```

Key decisions inside the GLB load callback:

```js
const scale  = 2.0 / maxDim          // normalise all models to ~2 units tall
model.position.y -= box.min.y        // plant the model on y=0
const dist = maxDim * scale * 2.2    // camera distance based on model size
```

- The `2.0` scale target means any GLB regardless of original export units will appear consistently sized. Adjust if a model appears too large or too small.
- After loading, `annotationsVisible.value` is checked — if the toggle was already on before load completed, annotations are built immediately.

> **Future improvement:** Show a loading progress bar using the GLTFLoader's `onProgress` callback (third argument, currently `undefined`).

---

#### 3B-14 — `animate()`

```js
function animate () {
  if (!renderer || !scene || !camera || !controls) return
  animFrameId = requestAnimationFrame(animate)
  controls.update()
  if (annotationGroup) {
    annotationGroup.traverse(obj => { if (obj.isText) obj.quaternion.copy(camera.quaternion) })
  }
  renderer.render(scene, camera)
}
```

- Guard at the top prevents rendering after `destroyViewer()` has been called.
- `controls.update()` is required every frame when `enableDamping` is true.
- Troika text objects billboard toward the camera by copying the camera quaternion — without this the text would be readable only from one angle.

---

#### 3B-15 — `enterAR()` / `exitAR()`

```js
async function enterAR () {
  // 1. Pause the 3D render loop (only one WebGL context active at a time)
  // 2. Request camera permission via getUserMedia (rear camera preferred)
  // 3. Create <video> element and attach camera stream
  // 4. Create AR WebGLRenderer (alpha: true — transparent background)
  // 5. Create transparent touch overlay div and attach touch handlers
  // 6. Create AR scene + camera + environment map + lights
  // 7. Clone loadedGltf.scene (reuses GPU assets, no re-download)
  // 8. Scale and center the model for the AR FOV
  // 9. Start AR animation loop
  // 10. Start 30-second countdown, auto-exit when it reaches 0
}
```

- `alpha: true` on the AR renderer makes the Three.js canvas transparent so the camera feed video shows through.
- The model is cloned (`loadedGltf.scene.clone(true)`) so the main viewer's model is unaffected.
- If `loadedGltf` is null (model still loading when user taps AR), a fresh GLTFLoader call is made.

```js
async function exitAR () {
  // 1. Cancel AR render loop immediately
  // 2. Show "Closing camera…" overlay
  // 3. Wait 400 ms (lets the closing overlay render before GPU teardown)
  // 4. destroyAR()
  // 5. Switch mode back to '3d'
  // 6. Trigger onResize() to restore the 3D canvas dimensions
  // 7. Restart the 3D animation loop
}
```

- The 400 ms delay gives Vue time to render the closing overlay before the heavy teardown blocks the main thread.

---

#### 3B-16 — `scaleAndCenterForAR(model)`

```js
function scaleAndCenterForAR (model) {
  model.scale.set(1, 1, 1); model.position.set(0, 0, 0); model.rotation.set(0, 0, 0)
  const box    = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray())
  const scale  = (2 * AR_DIST * Math.tan((AR_FOV / 2) * (Math.PI / 180))) / maxDim
  model.scale.setScalar(scale)
  const sc = center.clone().multiplyScalar(scale)
  model.position.set(-sc.x, -sc.y, -sc.z)
}
```

- Resets transform first so bounding box measurement is clean.
- The scale formula fits the model to fill the AR view frustum at distance `AR_DIST`. The result is a model that fills roughly the full screen height when held at arm's length.
- Adjust `AR_DIST` (default `3`) to make the default AR size smaller (increase) or larger (decrease).

---

#### 3B-17 — Lifecycle Hooks

```js
onMounted(() => { nextTick(initThree) })
onUnmounted(() => {
  destroyed = true
  window.removeEventListener('resize', onResize)
  destroyViewer()
  destroyAR()
})
```

- `nextTick` ensures the DOM is fully rendered before Three.js tries to measure `threeContainer` dimensions.
- `destroyed = true` is set first in `onUnmounted` so any in-flight async operations (camera permission, GLB load) exit cleanly without touching destroyed objects.

---

### 3C — `<style scoped lang="scss">` Block

All styles are scoped to this component and duplicated identically across all species pages.

| Class | Purpose |
|-------|---------|
| `.model-page` | Full-height flex column; `overflow: hidden` prevents scrollbars |
| `.viewer-container` | `flex: 1` — takes all space not used by the species panel |
| `.loading-overlay` | Centred overlay for spinner and error states |
| `.ar-overlay` | Fixed full-screen overlay covering the entire viewport during AR |
| `.ar-exit-btn` | Fixed close button in AR, always on top |
| `.ar-hint` | Gesture hint bar at the bottom of AR view |
| `.ar-note` | Countdown timer bar at the top of AR view |
| `.species-panel` | Fixed 260 px bottom panel; dark semi-transparent background |
| `.species-tabs` | Compact tab bar (11 px labels, 14 px icons) |
| `.panel-tab-panels` | Scrollable tab content area |
| `.annotation-popup` | Floating card rendered at click coordinates |
| `.fade-*` / `.ar-fade-*` | Vue `<transition>` enter/leave CSS classes |

> **Future improvement:** Extract the styles into a shared `_species-page.scss` partial and import it in each species page — avoids duplicating 130+ lines of SCSS.

---

## Step 4 — Verify the Route

Because `src/router/routes.js` uses `import.meta.glob('../pages/species/*.vue')`, dropping the `.vue` file automatically registers the route:

```
/model/staurois_natator  →  src/pages/species/staurois_natator.vue
```

No manual route registration needed.

---

## Step 5 — Verify the Drawer

`MainLayout.vue` reads directly from `species.json`. As long as `"available": true` is set, the species will appear as a clickable item in the drawer list automatically. The drawer also:

- Shows the correct count in the header (`X / Y models available`)
- Highlights the active species when you are on its page
- Displays the common name and scientific name

---

## Quick Checklist

- [ ] `public/models/staurois_natator.glb` — file exists
- [ ] `src/data/species.json` — new entry added with `"available": true`
- [ ] `src/data/species.json` — `"id"` matches the `.vue` and `.glb` filename
- [ ] `src/pages/species/staurois_natator.vue` — created as a copy of another species page
- [ ] `staurois_natator.vue` — only the `SPECIES` object was changed, nothing else
- [ ] `staurois_natator.vue` — `model` field points to `'models/staurois_natator.glb'`

---

## Naming Convention

The `id` value ties everything together. Always use the same string in all three places:

```
id in species.json  →  "staurois_natator"
.vue filename       →  src/pages/species/staurois_natator.vue
.glb filename       →  public/models/staurois_natator.glb
```

Use lowercase letters, digits, and underscores only. No spaces or hyphens.

---

## Possible Future Improvements (Summary)

| Area | Current (Prototype) | Improvement |
|------|---------------------|-------------|
| Species page | One `.vue` file per species | Single dynamic page using `useRoute().params.id` |
| Data import | Full `species.json` imported statically | Lazy-fetch only the needed entry via a store/composable |
| Notes input | No validation | Prevent saving empty or whitespace-only notes |
| GLB load | No progress feedback | Use GLTFLoader `onProgress` callback for a progress bar |
| Styles | Duplicated SCSS in every species page | Shared `_species-page.scss` partial |
| Annotations | Fixed label offset `0.55` | Per-annotation offset configurable from JSON |
| AR scale | Fixed `AR_DIST = 3` | Expose as a user-adjustable slider in the AR overlay |
