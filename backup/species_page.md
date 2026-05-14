# Species Page — Complete Code Walkthrough

Every file under `src/pages/species/*.vue` shares the same structure and
logic. Only the `SPECIES` data object at the top differs between files.
This document explains every section of the code in sequence.

---

## File Structure Overview

```
<template>          ← HTML layout (3D viewer, AR overlay, info panel)
<script setup>      ← All logic (imports, state, Three.js, AR, lifecycle)
<style scoped>      ← Scoped SCSS styles
```

---

## Template

### 1 — 3D Viewer Container

```html
<div v-show="mode === '3d'" ref="threeContainer" class="viewer-container">
```

- `v-show` (not `v-if`) keeps this div permanently in the DOM. Three.js
  appends its `<canvas>` here once on mount and never removes it during
  normal use. Using `v-if` would destroy the canvas every time AR mode
  toggles, requiring a full renderer rebuild.
- `ref="threeContainer"` gives the script a direct reference to this DOM
  node so `initThree()` can read its dimensions and append the canvas.
- When `mode === 'ar'`, `v-show` adds `display: none` — the canvas is
  hidden but still exists. The 3D `animate()` loop is separately paused
  (not just hidden) to avoid continuous GPU work on a hidden canvas.

Inside the container two conditional overlays sit on top of the canvas:

- **Loading spinner** (`v-if="loading"`) — shown while the GLB model
  downloads. Uses a fade transition so it disappears smoothly once the
  model is ready.
- **Error state** (`v-if="loadError"`) — shown if the GLB fails to load.

---

### 2 — AR Overlay

```html
<transition name="ar-fade">
  <div v-if="mode === 'ar'" ref="arContainer" class="ar-overlay">
```

- `v-if` (not `v-show`) — the AR overlay is completely removed from DOM
  when not in use. This is intentional: the AR overlay contains a live
  camera `<video>` and a WebGL canvas. Keeping them in the DOM while
  invisible would waste camera and GPU resources.
- `ref="arContainer"` lets `enterAR()` append the `<video>`, WebGL
  canvas, and touch layer directly into this div.
- `ar-fade` transition fades the overlay in (0.4s) on entry and fades
  it out (0.5s) on exit, giving a smooth camera-to-3D transition.

Inside the AR overlay, four children are conditionally shown via
`v-if="!arLoading"` (all hidden while the loading spinner is active):

| Element | Purpose |
|---|---|
| Loading overlay | Spinner shown during entry ("Starting camera…") and exit ("Closing camera…") |
| Exit button (`q-btn`) | `@click="exitAR"` — round white X button, top-right corner |
| Hint bar | "1 finger: rotate • 2 fingers: zoom" — bottom-center pill |
| Countdown note | "Best View 30 seconds [N]" — top-center pill, N counts down live |

All four use `<transition name="fade">` so they fade in after the camera
warms up and fade out when the loading overlay takes over during exit.

---

### 3 — Species Info Panel

```html
<div v-if="mode === '3d'" class="species-panel">
```

- `v-if` removes the panel from DOM during AR mode. This is correct: the
  panel sits below the 3D canvas in the flex column layout. During AR the
  entire screen is consumed by the `ar-overlay` (`position: fixed`), so
  the panel would be invisible anyway. Removing it with `v-if` also frees
  its layout contribution so `onResize()` gets the right dimensions when
  returning to 3D.
- Fixed height of **260px**. Everything above it (the 3D canvas) fills
  the remaining viewport via `flex: 1`.

**Panel header** — species common name, italic scientific name, IUCN
conservation badge, and the AR launch button.

**Tab bar** (`q-tabs`) — three tabs, dense layout, 11px labels, 14px icons:

| Tab | Icon | Content |
|---|---|---|
| Info | `info_outline` | Family / Habitat / Distribution rows |
| About | `article` | Full description paragraph |
| Notes | `edit_note` | Note input + most recent note |

The Notes tab label shows a count badge ("Notes (3)") when notes exist.

**Notes tab detail:**
- Text input with Enter key shortcut → `addNote()`
- `+` button → `addNote()`
- List button (`icon="list"`) → navigates to `/notes` master page
- Only the **most recently added note** is displayed (index 0 from the
  store, which uses `unshift` so newest is always first)
- Delete button removes just that note from the Pinia store

---

## Script — Imports

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

- `nextTick` — used to wait for Vue to finish a DOM update before
  reading layout dimensions or appending WebGL canvases.
- `RoomEnvironment` — generates an IBL (image-based lighting) environment
  map from a procedural room scene, giving PBR materials realistic
  ambient reflections without needing an HDR image file.
- `Text` from `troika-three-text` — SDF 3D text mesh used for annotation labels.
- `speciesJson` — imported to read `external_features[].point` coordinates and
  descriptions for the annotation system. The SPECIES const in each file still
  holds its own hardcoded metadata; `speciesJson` is only used for annotations.

---

## Script — Species Data

```js
const SPECIES = {
  id, scientific, common, family,
  habitat, distribution, conservation, badgeColor, description, model
}
```

This object is the only thing that differs between species files. It is
a hard-coded constant — each species page is fully self-contained and does
not read from `species.json` at runtime for its display data. `species.json`
is used by the router, drawer, QR scanner, and the annotation system.

**Removed field:** `order` (was `'Anura'` for all species — never displayed, removed in cleanup).

---

## Script — Annotation System

```js
const _entry     = speciesJson.find(s => s.id === SPECIES.id)
const ANNOTATIONS = [ /* flat list of all features with cat tag */ ].filter(f => f.point)
const CAT_COLOR   = { dorsal: 0x00ccff, ventral: 0xffaa44, limbs: 0x44ff88, other: 0xcc88ff }
const annotationsVisible = ref(false)
const annotationPopup    = ref(null)   // { label, description, x, y } | null
let annotationGroup = null
const annotationMap = new Map()        // mesh.uuid → { label, description }
```

**`buildAnnotations()`** — called when toggle switches on (after model loaded):
1. Creates a `THREE.Group` (`annotationGroup`) added to `scene`
2. For each feature with a `point`:
   - **Dot** (`SphereGeometry r=0.04`) at `point` position — primary click target
   - **Line** from `point` to label position (outward offset from model center)
   - **Troika `Text`** mesh at label position — billboards each frame via `txt.quaternion.copy(camera.quaternion)` in `animate()`
3. Maps each dot and text `uuid` → `{ label, description }` in `annotationMap`
4. Attaches `click` and `pointermove` listeners to `renderer.domElement`

**`clearAnnotations()`** — called when toggle switches off, or on AR entry, or unmount:
- Removes click/hover listeners
- Resets cursor
- Traverses group: calls `obj.dispose()` for `Text` nodes, disposes geometry + material for others
- Clears `annotationMap`, removes group from scene

**`onAnnotationClick(e)`** — raycasts against all mapped meshes; on hit sets `annotationPopup.value` with clamped screen coordinates.

**`onAnnotationHover(e)`** — raycasts and sets `cursor: pointer` on hit.

**`toggleAnnotations(val)`**:
- Hides/shows `sceneGrid` and `sceneFloor` (`visible = !val`)
- Calls `buildAnnotations()` or `clearAnnotations()` based on `val`

---

## Script — Notes State

```js
const notesStore   = useNotesStore()
const speciesNotes = computed(() => notesStore.getSpeciesNotes(SPECIES.id))
const lastNote     = computed(() => speciesNotes.value[0] ?? null)
```

- `speciesNotes` is a live computed array. It updates automatically
  whenever notes are added or deleted, which is why the Notes tab badge
  count and the displayed note stay in sync without manual refreshing.
- `lastNote` is always index `0` because `addNote()` uses `unshift`
  (prepend), so the newest note is always at position 0.
- `addNote()` clears the input field after adding so it is ready for
  the next note immediately.

---

## Script — Reactive State

```js
let destroyed        = false        // plain boolean, not reactive
const mode           = ref('3d')    // '3d' | 'ar'
const loading        = ref(true)    // 3D model loading spinner
const loadError      = ref(false)   // 3D model load failure
const arLoading      = ref(false)   // AR entry/exit spinner
const arLoadingMsg   = ref('Starting camera…')
const threeContainer = ref(null)    // DOM ref — viewer div
const arContainer    = ref(null)    // DOM ref — AR overlay div
```

`destroyed` is a plain `let` (not a `ref`) because it is only ever read
inside async callbacks — it does not need to trigger Vue re-renders.

---

## Script — 3D Viewer Refs

```js
let renderer, scene, camera, controls, animFrameId, loadedGltf
```

All plain `let` variables — these are Three.js objects, not Vue state.
Keeping them as plain variables avoids Vue making them deeply reactive
(which would break Three.js internals). They are `null` before mount and
after unmount; every function that uses them checks for null first.

`loadedGltf` stores the full parsed GLTF result so AR mode can clone the
scene without re-downloading the GLB file.

---

## Script — AR Refs

```js
let arRenderer, arScene, arCamera, arFrameId, arStream, arModel, arTouchLayer
let arExiting        = false   // prevents double-exit calls
let arBaseScale      = 1       // reference scale for pinch-zoom clamping
let arCountdownTimer = null    // setInterval handle
const arCountdown    = ref(30) // reactive — drives the countdown display
const touch          = { x: 0, y: 0, dist: 0, count: 0 }
const AR_FOV  = 60             // AR camera field of view (degrees)
const AR_DIST = 3              // AR camera distance from origin (units)
```

`arCountdown` is a `ref` because it is displayed in the template and must
trigger re-renders as it counts down. All other AR variables are plain
`let` for the same reason as the 3D viewer refs above.

---

## Script — `disposeThreeObject(obj)`

```js
function disposeThreeObject (obj) {
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

**Purpose:** Walk every node in a Three.js scene graph and free GPU
resources. Three.js does not garbage-collect GPU resources automatically —
each `BufferGeometry`, `Material`, and `Texture` holds a WebGL buffer
allocated on the GPU. Without explicit disposal, navigating between pages
leaks GPU memory until the browser crashes.

`traverse` visits the object and all its descendants recursively. For
each mesh node it disposes:
1. **Geometry** — vertex/index/UV buffer objects on the GPU
2. **Material textures** — any property that `.isTexture === true`
   (color map, normal map, roughness map, etc.)
3. **Material** itself — shader programs and uniform bindings

**Critical safety rule:** This function is called on the main `scene`
during `destroyViewer()` but is **never** called on `arScene` during
`destroyAR()`. The AR model is created with
`loadedGltf.scene.clone(true)`, which is a **shallow clone** — child
objects are new but their `.geometry` and `.material` properties point to
the **same GPU objects** as the original. Calling `disposeThreeObject` on
the AR clone would free those shared resources and destroy the 3D
viewer's materials, causing a crash when the 3D render loop tries to
draw on the next frame.

---

## Script — `destroyViewer()`

```js
function destroyViewer () {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null }
  if (controls)    { controls.dispose(); controls = null }
  if (scene) {
    disposeThreeObject(scene)
    if (scene.environment) { scene.environment.dispose(); scene.environment = null }
    scene = null
  }
  loadedGltf = null
  camera = null
  if (renderer) {
    renderer.forceContextLoss()
    renderer.dispose()
    renderer.domElement?.parentNode?.removeChild(renderer.domElement)
    renderer = null
  }
}
```

**Purpose:** Called only in `onUnmounted` — fully tears down the 3D
renderer when the user navigates away from the species page.

Sequence matters:
1. **Cancel animation frame first** — stop the render loop before
   touching anything it references.
2. **Dispose controls** — `OrbitControls` adds pointer/wheel/touch event
   listeners to the canvas; `dispose()` removes them all.
3. **Dispose scene** — free all GPU geometry, materials, textures.
4. **Dispose environment map** — the IBL texture from `RoomEnvironment`
   is not part of the scene graph, so it must be disposed separately.
5. **`forceContextLoss()`** — explicitly signals the WebGL context as
   lost, immediately freeing the context slot. Android WebView allows
   only ~8 simultaneous WebGL contexts; without this, switching pages
   multiple times exhausts the limit and crashes the app.
6. **`dispose()`** — releases Three.js's internal renderer caches.
7. **Remove canvas from DOM** — cleans up the DOM node.

`forceContextLoss()` is used here (page unmount) but **not** in
`destroyAR()` (AR toggle). On some Android GPU drivers, calling
`forceContextLoss()` on the AR renderer after 30 seconds of rendering
crashes the GPU process. Since `dispose()` alone is sufficient for the
AR toggle case (the context is released when the canvas is GC'd),
`forceContextLoss` is intentionally omitted there.

---

## Script — `destroyAR()`

```js
function destroyAR () {
  if (arCountdownTimer) { clearInterval(arCountdownTimer); arCountdownTimer = null }
  arCountdown.value = 30
  if (arFrameId) { cancelAnimationFrame(arFrameId); arFrameId = null }
  if (arStream)  { arStream.getTracks().forEach(t => t.stop()); arStream = null }
  if (arTouchLayer) { /* remove listeners + DOM node */ arTouchLayer = null }
  if (arScene) {
    if (arScene.environment) { arScene.environment.dispose(); arScene.environment = null }
    arScene = null
  }
  arModel = null; arCamera = null
  if (arRenderer) {
    arRenderer.dispose()
    arRenderer.domElement?.parentNode?.removeChild(arRenderer.domElement)
    arRenderer = null
  }
  arContainer.value?.querySelector('video')?.remove()
}
```

**Purpose:** Tears down all AR resources. Safe to call multiple times
(all branches null-check). Called from both `exitAR()` and `onUnmounted`.

Sequence explanation:

1. **Stop countdown timer** — prevents the `setInterval` from firing
   `exitAR()` again after cleanup has started. Reset `arCountdown` to
   30 so it is ready for the next AR session.
2. **Cancel AR animation frame** — stops the AR render loop. This is
   done first because the render loop references `arRenderer`,
   `arScene`, and `arCamera`. If we freed those before cancelling the
   loop, the next frame callback would crash on null references.
3. **Stop camera tracks** — releases the hardware camera. Each track
   in `arStream` maps to a physical camera pipeline. Calling `stop()`
   releases the camera so other apps can use it and removes the
   camera-active indicator from the system UI.
4. **Remove touch layer** — the `<div>` that captured all touch events
   during AR. Event listeners must be removed before removing the node
   to prevent memory leaks.
5. **Dispose AR scene environment** — the IBL env map was created
   specifically for `arRenderer` via a fresh `PMREMGenerator`. It is
   AR-exclusive (not shared with the 3D scene) so it is safe to dispose.
   The scene's geometry/material children are NOT disposed (see
   `disposeThreeObject` note above).
6. **`arRenderer.dispose()`** — frees Three.js renderer caches for the
   AR WebGL context.
7. **Remove AR canvas from DOM** — removes the transparent WebGL canvas
   that was overlaid on the camera feed.
8. **Remove video element** — the `<video>` was appended directly to
   `arContainer`, not managed by Vue. It must be removed manually.
   `arContainer.value` is still valid at this point because `mode` has
   not been set to `'3d'` yet — `destroyAR()` is always called before
   the mode switch in `exitAR()`.

---

## Script — Touch Handlers

```js
function arTouchStart (e) { ... }
function arTouchMove  (e) { ... }
function arTouchEnd   (e) { ... }
```

**Purpose:** Handle finger gestures on the AR touch layer div.

All three call `e.preventDefault()` (registered with `{ passive: false }`)
to prevent the browser from scrolling or zooming the page during AR.

**1-finger drag (rotate):**
```
dx = current X − last X  →  arModel.rotation.y += dx × 0.008
dy = current Y − last Y  →  arModel.rotation.x += dy × 0.008
```
X-rotation is clamped to ±90° to prevent the model flipping upside down.

**2-finger pinch (scale):**
```
newDist = distance between finger 0 and finger 1
scale = current scale × (newDist / lastDist)
scale = clamp(scale, baseScale × 0.3, baseScale × 3)
```
Scale is clamped to prevent the model shrinking to invisible or growing
beyond a usable size. `arBaseScale` is the initial scale set by
`scaleAndCenterForAR()` and serves as the reference for the clamp bounds.

`touch.count` tracks the current number of fingers so the move handler
can distinguish a single-finger drag from a two-finger pinch that
transitions through a 1-finger state as fingers lift.

---

## Script — `initThree()`

**Purpose:** Called once on mount. Sets up the entire 3D scene.

```
1. Read container dimensions (clientWidth/Height or window fallback)
2. Create WebGLRenderer → append canvas to threeContainer
3. Create PMREMGenerator → bake RoomEnvironment into IBL texture → dispose generator
4. Create Scene → set dark background + IBL environment
5. Create sceneGroup (Group) → model + floor live here
6. Add GridHelper (blue grid, 10×10 units, 30 subdivisions)
7. Add floor plane (MeshStandard, dark blue, semi-transparent, slight metalness)
8. Create PerspectiveCamera (FOV 45, near 0.01, far 1000)
9. Add AmbientLight (white, intensity 1) + DirectionalLight (white, intensity 2)
10. Create OrbitControls → damping enabled (factor 0.06), distance 0.3–30
11. GLTFLoader.load(SPECIES.model, onSuccess, undefined, onError)
12. Call animate() to start render loop
13. window.addEventListener('resize', onResize)
```

**GLTFLoader callback (onSuccess):**
```
- Guard: if (destroyed) { disposeThreeObject(gltf.scene); return }
  ↑ user navigated away before model finished downloading
- Normalize model: compute bounding box, scale to 2 units tall, center on origin
- Sit model on floor: translate down so bounding box min.y = 0
- Add model to sceneGroup
- loading.value = false → hides the spinner
- Reposition camera to frame the model nicely
```

The `destroyed` guard is essential because `GLTFLoader.load` is
asynchronous — the user could navigate to another page while the model
is still downloading. Without the guard, the callback would try to add
the model to a scene that has already been disposed.

---

## Script — `animate()`

```js
function animate () {
  if (!renderer || !scene || !camera || !controls) return
  animFrameId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
```

**Purpose:** The 3D render loop. Runs once per display refresh (~60fps).

- **Defined at module scope** (outside `initThree`), not as an inner
  function. This is critical — `exitAR()` calls `animate()` to restart
  the loop after AR exits. If it were defined inside `initThree`, it
  would be inaccessible from `exitAR`.
- **Null-guard at the top** — if any ref is null (e.g. one final frame
  fires after `destroyViewer()` has cleared the refs), the function
  returns immediately without crashing.
- **Paused during AR** — `enterAR()` calls
  `cancelAnimationFrame(animFrameId)` before starting the camera. Only
  one WebGL context renders at a time. Running both simultaneously for
  30 seconds exhausts the Android GPU and crashes the app when AR
  cleanup is attempted.
- **Restarted after AR** — `exitAR()` calls `animate()` after switching
  mode back to `'3d'` and resizing the canvas. The 3D view resumes from
  exactly the state it was frozen in when AR started.

---

## Script — `onResize()`

```js
function onResize () {
  if (!renderer || !threeContainer.value) return
  const w = threeContainer.value.clientWidth, h = threeContainer.value.clientHeight
  if (!w || !h) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}
```

**Purpose:** Keeps the 3D canvas correctly sized when the device
rotates or when the species panel changes height.

The `if (!w || !h) return` guard prevents a zero-dimension resize.
This can happen if `onResize()` is called while the `threeContainer` is
still transitioning from `display:none` back to visible after AR exits —
the browser may not have recalculated layout yet at that exact tick.
A 0×0 resize would set `camera.aspect = NaN`, corrupting the projection
matrix. Also registered on `window` for device rotation handling.

---

## Script — `enterAR()`

**Purpose:** Transitions from 3D mode to full-screen AR mode.

Full sequence:

```
1.  arExiting = false (reset guard)
    mode = 'ar'          → Vue shows AR overlay, hides 3D panel
    arLoading = true     → shows "Starting camera…" spinner
    cancelAnimationFrame(animFrameId) → pause 3D loop

2.  await nextTick()     → Vue renders AR overlay into DOM
    guard: if (destroyed) return

3.  getUserMedia({ facingMode: 'environment', 1280×720 })
    → on failure: revert mode to '3d', show alert

4.  Create <video>, attach stream, append to arContainer
    await video.oncanplay (or 2s timeout)

5.  Create arRenderer (alpha: true, transparent background)
    setPixelRatio, setSize, setClearColor(0,0,0,0) → fully transparent
    Append canvas to arContainer (z-index: 1)

6.  Create arTouchLayer <div> (z-index: 2)
    Register touchstart/move/end listeners (passive: false)
    Append to arContainer

7.  Create arScene, arCamera (FOV 60, distance 3)
    Create fresh PMREMGenerator for arRenderer → bake IBL → dispose
    Add AmbientLight + DirectionalLight to arScene

8.  Clone model:
    if (loadedGltf) → loadedGltf.scene.clone(true)  ← shallow clone, no re-download
    else            → fresh GLTFLoader download (fallback)

9.  scaleAndCenterForAR(arModel) → normalize size for AR viewport
    arScene.add(arModel)

10. Start arAnimate() loop
    arLoading = false → hides spinner, reveals exit button + countdown + hint

11. Start countdown:
    arCountdown = 30
    setInterval every 1000ms → decrement arCountdown
    at 0: clearInterval, then setTimeout(700ms) → exitAR()
```

**Why `loadedGltf.scene.clone(true)`:**
The GLB is already downloaded and parsed into memory. Cloning avoids a
second network request and re-parse (which would take several seconds on
a mobile device). The clone is shallow — new `Object3D` nodes but shared
geometry and material instances — which is why `destroyAR()` must not
dispose them.

**Why 700ms delay before `exitAR()` from countdown:**
When `arCountdown.value--` reaches 0 inside the `setInterval` callback,
Vue queues a reactive DOM update to display `[0]`. If `exitAR()` were
called in the same synchronous tick, Vue would be mid-update when the
WebGL teardown begins. On Android WebView this collision can crash the
GPU process. The 700ms delay ensures Vue has fully flushed the `[0]`
update and the screen shows the final countdown value before any
cleanup starts.

---

## Script — `scaleAndCenterForAR(model)`

```js
function scaleAndCenterForAR (model) {
  model.scale.set(1, 1, 1)
  model.position.set(0, 0, 0)
  model.rotation.set(0, 0, 0)
  const box    = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray())
  const scale  = (2 * AR_DIST * Math.tan((AR_FOV / 2) * (Math.PI / 180))) / maxDim
  model.scale.setScalar(scale)
  const sc = center.clone().multiplyScalar(scale)
  model.position.set(-sc.x, -sc.y, -sc.z)
}
```

**Purpose:** Normalize the cloned model so it fills a comfortable
portion of the AR viewport regardless of the original GLB's scale.

The formula `2 * AR_DIST * tan(FOV/2)` computes the visible world-space
width at the camera's focal distance (3 units). Dividing by `maxDim`
gives the scale factor needed to make the model fill exactly that width.
The model is then re-centered to the camera origin.

The model's transform is reset to identity first (`scale(1,1,1)`,
`position(0,0,0)`, `rotation(0,0,0)`) because it was previously scaled
and positioned for the 3D viewer. Starting from a clean identity ensures
the bounding box calculation is accurate.

---

## Script — `exitAR()`

```js
async function exitAR () {
  if (arExiting) return                          // prevent double-call
  arExiting = true
  if (arFrameId) { cancelAnimationFrame(arFrameId); arFrameId = null }
  arLoadingMsg.value = 'Closing camera…'
  arLoading.value = true                         // show closing spinner
  await new Promise(r => setTimeout(r, 400))    // GPU goes idle, user sees feedback
  destroyAR()                                    // free all AR resources
  mode.value = '3d'                             // Vue restores 3D view
  await nextTick()                              // Vue DOM fully settled
  onResize()                                    // fit canvas to visible container
  animate()                                     // restart 3D render loop
  arLoading.value = false
  arExiting = false
}
```

**Purpose:** Gracefully exit AR and return to the 3D viewer.

Step-by-step rationale:

1. **`arExiting` guard** — prevents the exit button and the countdown
   timer from both firing `exitAR()` simultaneously.

2. **Cancel AR animation frame immediately** — the GPU stops drawing AR
   frames before the 400ms delay begins. This is the key fix: the
   original code waited 500ms with the AR loop still running, which
   submitted GPU frames to a renderer mid-teardown and could crash.

3. **Show loading spinner (400ms)** — gives the user visible feedback
   that something is happening. The AR canvas is now frozen (render
   loop stopped) but still visible underneath the spinner, creating a
   clean "pause then close" effect.

4. **`destroyAR()`** — releases all AR resources (see above).

5. **`mode.value = '3d'`** — Vue removes the AR overlay from DOM
   (with the `ar-fade-leave` transition fading it out over 0.5s) and
   makes the 3D canvas visible again (`v-show`).

6. **`await nextTick()`** — waits for Vue's DOM update to apply. Without
   this, the threeContainer might still report 0 dimensions.

7. **`onResize()`** — recalculates and applies the correct canvas size
   now that the 3D container is visible and has valid dimensions.

8. **`animate()`** — restarts the 3D render loop. The scene, camera, and
   controls were never destroyed — they were just idle. The 3D viewer
   resumes exactly where it was frozen when AR started.

---

## Script — Lifecycle Hooks

```js
onMounted(() => { nextTick(initThree) })
```

`nextTick` defers `initThree()` until after Vue has rendered the
component's DOM. Without this, `threeContainer.value` would be null
because the `ref` is only populated after the first render.

```js
onUnmounted(() => {
  destroyed = true
  window.removeEventListener('resize', onResize)
  destroyViewer()
  destroyAR()
})
```

**`destroyed = true`** is set first, before any disposal. Any async
callback (GLTFLoader, camera promise) that is still in-flight checks
this flag and aborts early instead of operating on freed resources.

`destroyAR()` is called even if the user was in 3D mode — it is a no-op
if all AR refs are already null. This covers the edge case where the
user navigates away mid-AR-entry (before all promises resolved).

---

## Script — AR Render Loop (`arAnimate`)

```js
function arAnimate () {
  if (!arRenderer || !arScene || !arCamera) return
  arFrameId = requestAnimationFrame(arAnimate)
  arRenderer.render(arScene, arCamera)
}
```

Defined inside `enterAR()` as a closure (unlike `animate()` which is
module-scope). It does not need to be restartable from outside — once
destroyed it is never restarted; a fresh `arAnimate` closure is created
on the next `enterAR()` call.

The null-guard at the top ensures that if one final frame fires after
`destroyAR()` has cleared the refs (due to RAF scheduling), it exits
silently rather than crashing.

---

## CSS — Key Layout Rules

```scss
.model-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);   /* full viewport minus the 50px app header */
  padding: 0 !important;         /* override Quasar's default page padding */
  overflow: hidden;
}
```

The page is a vertical flex column. Two children:
- `.viewer-container` — `flex: 1; min-height: 0` → fills all space above the panel
- `.species-panel` — `height: 260px` (fixed) → always 260px at the bottom

`min-height: 0` on `.viewer-container` is required by the CSS flexbox
spec to allow the child to shrink below its content size. Without it,
if the model canvas is taller than the available space, it would overflow
and push the panel off-screen.

```scss
.ar-overlay {
  position: fixed; inset: 0; z-index: 9999;
}
```

`position: fixed` removes the AR overlay from the normal document flow
and covers 100% of the physical screen, including the app header. This
is necessary for the camera feed to be truly full-screen on Android.

```scss
.panel-tab-panels {
  flex: 1; min-height: 0; overflow: hidden;
  :deep(.q-tab-panel) { height: 100%; overflow-y: auto; }
}
```

The tab panel area fills remaining space inside the 260px species panel.
Each individual tab panel scrolls independently. `:deep()` is required
to pierce Quasar's scoped styles.

---

## Summary: AR Safety Rules

| Rule | Reason |
|---|---|
| `animate()` at module scope | Must be callable from `exitAR()` to restart loop |
| Pause 3D loop on AR entry | Dual rendering for 30s exhausts Android GPU |
| Cancel AR loop before loading spinner | No GPU frames during the 400ms closing delay |
| Do NOT call `disposeThreeObject(arScene)` | AR model is a shallow clone — shared GPU resources would be destroyed |
| Do NOT call `arRenderer.forceContextLoss()` | Crashes some Android GPU drivers after 30s of rendering |
| 700ms delay before countdown triggers `exitAR()` | Lets Vue flush the reactive `[0]` update before WebGL teardown |
| `if (mode.value === 'ar')` guard in countdown timeout | Prevents double-exit if user clicked X during the 700ms window |
| `destroyed` flag checked in all async callbacks | Guards against GLTFLoader/getUserMedia resolving after unmount |
