<template>
  <q-page class="model-page">

    <!-- ── 3D VIEW ──────────────────────────────────────────── -->
    <div v-show="mode === '3d'" ref="threeContainer" class="viewer-container">
      <transition name="fade">
        <div v-if="loading" class="loading-overlay">
          <q-spinner-cube color="primary" size="3.5em" />
          <div class="q-mt-md text-white text-body1">Loading model…</div>
        </div>
      </transition>
      <div v-if="loadError" class="loading-overlay">
        <q-icon name="error_outline" size="3em" color="negative" />
        <div class="q-mt-md text-white text-body1">Failed to load model</div>
      </div>
    </div>

    <!-- ── AR OVERLAY ───────────────────────────────────────── -->
    <transition name="ar-fade">
      <div v-if="mode === 'ar'" ref="arContainer" class="ar-overlay">
        <transition name="fade">
          <div v-if="arLoading" class="loading-overlay ar-loading">
            <q-spinner-cube color="primary" size="3.5em" />
            <div class="q-mt-md text-white text-body1">{{ arLoadingMsg }}</div>
          </div>
        </transition>
        <transition name="fade">
          <q-btn
            v-if="!arLoading"
            class="ar-exit-btn"
            round unelevated size="lg"
            color="white" text-color="dark" icon="close"
            :disable="arExiting"
            @click="exitAR"
          />
        </transition>
        <transition name="fade">
          <div v-if="!arLoading" class="ar-hint">
            <q-icon name="view_in_ar" size="18px" class="q-mr-xs" />
            1 finger: rotate • 2 fingers: zoom
          </div>
        </transition>
        <transition name="fade">
          <div v-if="!arLoading" class="ar-note">
            <q-icon name="timer" size="14px" class="q-mr-xs" />
            Best View 30 seconds [{{ arCountdown }}]
          </div>
        </transition>
      </div>
    </transition>

    <!-- ── Species info panel + AR button ──────────────────────── -->
    <div v-if="mode === '3d'" class="species-panel">
      <div class="panel-header row items-center no-wrap q-px-md q-py-sm q-gutter-x-sm">
        <div class="col">
          <div class="text-white text-weight-bold text-body2">{{ SPECIES.common }}</div>
          <div class="text-grey-4 text-caption text-italic">{{ SPECIES.scientific }}</div>
          <q-badge :color="SPECIES.badgeColor" class="q-mt-xs">{{ SPECIES.conservation }}</q-badge>
        </div>
        <div class="column items-center q-gutter-y-sm self-center">
          <q-btn
            unelevated
            rounded
            color="primary"
            icon="view_in_ar"
            label="AR"
            size="sm"
            class="ar-launch-btn full-width"
            @click="enterAR"
          />
          <div class="annotation-toggle-row row items-center no-wrap q-gutter-x-xs">
            <q-toggle
              v-model="annotationsVisible"
              color="primary" size="md"
              @update:model-value="toggleAnnotations"
            />
            <span class="annotation-toggle-label">Annotation</span>
          </div>
        </div>
      </div>
      <q-tabs v-model="activeTab" dense align="left" active-color="primary" indicator-color="primary" class="species-tabs">
        <q-tab name="info"  icon="info_outline" label="Info" />
        <q-tab name="about" icon="article"      label="About" />
        <q-tab name="notes" icon="edit_note"    :label="speciesNotes.length ? `Notes (${speciesNotes.length})` : 'Notes'" />
      </q-tabs>
      <q-separator dark />
      <q-tab-panels v-model="activeTab" animated class="panel-tab-panels">

        <!-- Tab 1 — Info -->
        <q-tab-panel name="info" class="q-pa-sm q-gutter-y-xs">
          <div class="meta-row">
            <span class="meta-label">Family</span>
            <span class="meta-value">{{ SPECIES.family }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Habitat</span>
            <span class="meta-value">{{ SPECIES.habitat }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Distribution</span>
            <span class="meta-value">{{ SPECIES.distribution }}</span>
          </div>
        </q-tab-panel>

        <!-- Tab 2 — About -->
        <q-tab-panel name="about" class="q-pa-sm">
          <div class="text-caption text-grey-4">{{ SPECIES.description }}</div>
        </q-tab-panel>

        <!-- Tab 3 — Notes -->
        <q-tab-panel name="notes" class="q-pa-sm">
          <div class="row no-wrap q-gutter-x-xs q-mb-sm">
            <q-input
              v-model="newNoteText"
              dense dark outlined autogrow
              placeholder="Add a note…"
              class="col"
              @keyup.enter.exact.prevent="addNote"
            />
            <q-btn dense flat round color="primary" icon="add" class="self-start" title="Add note" @click="addNote" />
            <q-btn dense flat round color="grey-4" icon="list" class="self-start" title="View all notes" @click="goToAllNotes" />
          </div>
          <div v-if="!speciesNotes.length" class="text-caption text-grey-6 text-center q-py-xs">
            No notes yet
          </div>
          <div v-if="lastNote" class="note-item row items-start no-wrap q-mb-xs">
            <div class="col text-caption text-grey-3 note-text">{{ lastNote.text }}</div>
            <q-btn flat dense round icon="delete_outline" color="grey-6" size="xs" @click="notesStore.deleteNote(SPECIES.id, lastNote.id)" />
          </div>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- Annotation popup -->
    <Transition name="fade">
      <div
        v-if="annotationPopup"
        class="annotation-popup"
        :style="{ left: annotationPopup.x + 'px', top: annotationPopup.y + 'px' }"
      >
        <div class="row items-center no-wrap q-mb-xs">
          <span class="col annotation-popup-title">{{ annotationPopup.label }}</span>
          <q-btn flat dense round icon="close" size="xs" color="grey-5" @click="annotationPopup = null" />
        </div>
        <div class="annotation-popup-desc">{{ annotationPopup.description }}</div>
      </div>
    </Transition>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useNotesStore } from 'src/stores/notes.js'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Text } from 'troika-three-text'
import speciesJson from 'src/data/species.json'

// ── Species data ───────────────────────────────────────────────
const SPECIES = {
  id:           'platymantis',
  scientific:   'Platymantis corrugatus',
  common:       'Corrugated Forest Frog',
  family:       'Ceratobatrachidae',
  habitat:      'Primary and secondary rainforest floor, leaf litter',
  distribution: 'Luzon Island, Philippines',
  conservation: 'Least Concern',
  badgeColor:   'positive',
  description:  'A direct-developing frog found in the leaf litter of Philippine rainforests. It lays eggs on the ground that hatch directly into small frogs, bypassing a free-living tadpole stage.',
  model:        'models/platymantis.glb'
}

// ── Annotations ────────────────────────────────────────────────
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
const annotationsVisible = ref(false)
const annotationPopup    = ref(null)
let annotationGroup = null
const annotationMap = new Map()  // mesh uuid → { label, description }
const _raycaster    = new THREE.Raycaster()
const _pointer      = new THREE.Vector2()

function buildAnnotations () {
  clearAnnotations()
  if (!scene || !ANNOTATIONS.length) return
  annotationGroup = new THREE.Group()
  const modelCenter = new THREE.Vector3(0, 0.5, 0)
  ANNOTATIONS.forEach(f => {
    const pt    = new THREE.Vector3(...f.point)
    const color = CAT_COLOR[f.cat] ?? 0xffffff
    const dir   = pt.clone().sub(modelCenter).normalize()
    const lp    = pt.clone().addScaledVector(dir, 0.55)

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 10, 10),
      new THREE.MeshBasicMaterial({ color })
    )
    dot.position.copy(pt)
    annotationMap.set(dot.uuid, { label: f.label, description: f.description })
    annotationGroup.add(dot)

    const lg = new THREE.BufferGeometry().setFromPoints([pt, lp])
    annotationGroup.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 })))

    const txt = new Text()
    txt.text         = f.label
    txt.fontSize     = 0.07
    txt.color        = color
    txt.anchorX      = 'center'
    txt.anchorY      = 'middle'
    txt.outlineWidth = '8%'
    txt.outlineColor = 0x000000
    txt.position.copy(lp)
    txt.sync()
    annotationMap.set(txt.uuid, { label: f.label, description: f.description })
    annotationGroup.add(txt)
  })
  scene.add(annotationGroup)
  renderer.domElement.addEventListener('click',        onAnnotationClick)
  renderer.domElement.addEventListener('pointermove',  onAnnotationHover)
}

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
    if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose())
  })
  scene?.remove(annotationGroup)
  annotationGroup = null
}

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

function onAnnotationClick (e) {
  const hit = _raycastAnnotations(e)
  if (hit) {
    const data = annotationMap.get(hit.object.uuid)
    const x = Math.min(e.clientX + 14, window.innerWidth  - 250)
    const y = Math.min(Math.max(e.clientY, 60), window.innerHeight - 160)
    annotationPopup.value = { label: data.label, description: data.description, x, y }
  } else {
    annotationPopup.value = null
  }
}

function onAnnotationHover (e) {
  if (!renderer) return
  const hit = _raycastAnnotations(e)
  renderer.domElement.style.cursor = hit ? 'pointer' : ''
}

function toggleAnnotations (val) {
  if (sceneGrid)  sceneGrid.visible  = !val
  if (sceneFloor) sceneFloor.visible = !val
  if (val) { if (!loading.value) buildAnnotations() }
  else clearAnnotations()
}

// ── Notes ──────────────────────────────────────────────────────
const router       = useRouter()
const notesStore   = useNotesStore()
const activeTab    = ref('info')
const newNoteText  = ref('')
const speciesNotes = computed(() => notesStore.getSpeciesNotes(SPECIES.id))
const lastNote     = computed(() => speciesNotes.value[0] ?? null)
function addNote () {
  notesStore.addNote(SPECIES.id, newNoteText.value)
  newNoteText.value = ''
}
function goToAllNotes () {
  router.push('/notes')
}

// ── State ──────────────────────────────────────────────────────
let destroyed        = false
const mode           = ref('3d')
const loading        = ref(true)
const loadError      = ref(false)
const arLoading      = ref(false)
const arLoadingMsg   = ref('Starting camera…')
const threeContainer = ref(null)
const arContainer    = ref(null)

// ── 3D viewer refs ─────────────────────────────────────────────
let renderer, scene, camera, controls, animFrameId, loadedGltf, sceneGrid, sceneFloor

// ── AR refs ────────────────────────────────────────────────────
let arRenderer, arScene, arCamera, arFrameId, arStream, arModel, arTouchLayer
let arExiting        = false
let arBaseScale      = 1
let arCountdownTimer = null
const arCountdown    = ref(30)
const touch          = { x: 0, y: 0, dist: 0, count: 0 }
const AR_FOV    = 60
const AR_DIST   = 3

// ── Disposal helpers ───────────────────────────────────────────
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

function destroyViewer () {
  clearAnnotations()
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

function destroyAR () {
  if (arCountdownTimer) { clearInterval(arCountdownTimer); arCountdownTimer = null }
  arCountdown.value = 30
  if (arFrameId) { cancelAnimationFrame(arFrameId); arFrameId = null }
  if (arStream)  { arStream.getTracks().forEach(t => t.stop()); arStream = null }
  if (arTouchLayer) {
    arTouchLayer.removeEventListener('touchstart', arTouchStart)
    arTouchLayer.removeEventListener('touchmove',  arTouchMove)
    arTouchLayer.removeEventListener('touchend',   arTouchEnd)
    arTouchLayer.parentNode?.removeChild(arTouchLayer)
    arTouchLayer = null
  }
  if (arScene) {
    // Only dispose AR-exclusive resources.
    // Do NOT call disposeThreeObject(arScene) — arModel is a shallow clone of
    // loadedGltf.scene and shares the same geometry/material instances. Disposing
    // them here would destroy the main 3D viewer's materials and crash the app.
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

// ── Touch handlers ─────────────────────────────────────────────
function arTouchStart (e) {
  e.preventDefault()
  touch.count = e.touches.length
  if (e.touches.length === 1) {
    touch.x = e.touches[0].clientX; touch.y = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    touch.dist = Math.sqrt(dx * dx + dy * dy)
  }
}
function arTouchMove (e) {
  e.preventDefault()
  if (!arModel) return
  if (e.touches.length === 1 && touch.count === 1) {
    const dx = e.touches[0].clientX - touch.x
    const dy = e.touches[0].clientY - touch.y
    arModel.rotation.y += dx * 0.008
    arModel.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, arModel.rotation.x + dy * 0.008))
    touch.x = e.touches[0].clientX; touch.y = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (touch.dist > 0) {
      const next = arModel.scale.x * (dist / touch.dist)
      arModel.scale.setScalar(Math.max(arBaseScale * 0.3, Math.min(arBaseScale * 3, next)))
    }
    touch.dist = dist; touch.count = 2
  }
}
function arTouchEnd (e) {
  touch.count = e.touches.length
  if (e.touches.length === 0) touch.dist = 0
}

// ── Three.js setup ─────────────────────────────────────────────
function initThree () {
  const container = threeContainer.value
  if (!container) return
  const w = container.clientWidth || window.innerWidth
  const h = container.clientHeight || window.innerHeight

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(w, h)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  container.appendChild(renderer.domElement)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment()).texture
  pmrem.dispose()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1117)
  scene.environment = envTexture

  // Group that holds model + floor — shift this up to clear the bottom panel
  const sceneGroup = new THREE.Group()
  scene.add(sceneGroup)

  // Grid floor
  sceneGrid = new THREE.GridHelper(10, 30, 0x1a6fa8, 0x0d3a5c)
  sceneGrid.material.transparent = true
  sceneGrid.material.opacity = 0.6
  sceneGroup.add(sceneGrid)

  // Subtle reflective floor plane
  const floorGeo = new THREE.PlaneGeometry(10, 10)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a1628,
    metalness: 0.4,
    roughness: 0.6,
    transparent: true,
    opacity: 0.7
  })
  sceneFloor = new THREE.Mesh(floorGeo, floorMat)
  sceneFloor.rotation.x = -Math.PI / 2
  sceneFloor.position.y = -0.001
  sceneGroup.add(sceneFloor)

  camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000)
  camera.position.set(0, 1.5, 4)

  scene.add(new THREE.AmbientLight(0xffffff, 1))
  const dirLight = new THREE.DirectionalLight(0xffffff, 2)
  dirLight.position.set(5, 10, 7); scene.add(dirLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = 0.06
  controls.minDistance = 0.3; controls.maxDistance = 30
  controls.target.set(0, 0, 0); controls.update()

  new GLTFLoader().load(
    SPECIES.model,
    (gltf) => {
      if (destroyed) { disposeThreeObject(gltf.scene); return }
      loadedGltf = gltf
      const model = gltf.scene
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray())
      const scale  = 2.0 / maxDim
      model.scale.setScalar(scale)
      model.position.copy(center.multiplyScalar(-scale))
      model.position.y -= new THREE.Box3().setFromObject(model).min.y
      sceneGroup.add(model)
      model.traverse(c => { if (c.isMesh) c.material.needsUpdate = true })
      loading.value = false
      if (annotationsVisible.value) buildAnnotations()
      const dist = maxDim * scale * 2.2
      sceneGroup.position.y = 0
      const midY = sceneGroup.position.y + maxDim * scale * 0.5
      camera.position.set(0, midY, dist)
      controls.target.set(0, midY, 0); controls.update()
    },
    undefined,
    () => { if (!destroyed) { loading.value = false; loadError.value = true } }
  )

  animate()
  window.addEventListener('resize', onResize)
}

function animate () {
  if (!renderer || !scene || !camera || !controls) return
  animFrameId = requestAnimationFrame(animate)
  controls.update()
  if (annotationGroup) {
    annotationGroup.traverse(obj => { if (obj.isText) obj.quaternion.copy(camera.quaternion) })
  }
  renderer.render(scene, camera)
}

function onResize () {
  if (!renderer || !threeContainer.value) return
  const w = threeContainer.value.clientWidth, h = threeContainer.value.clientHeight
  if (!w || !h) return
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h)
}

// ── AR ─────────────────────────────────────────────────────────
async function enterAR () {
  arExiting = false; mode.value = 'ar'; arLoadingMsg.value = 'Starting camera…'; arLoading.value = true
  // Pause 3D render loop — only one WebGL context renders at a time during AR
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null }
  await nextTick()
  if (destroyed) return

  try {
    arStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
    })
  } catch {
    mode.value = '3d'; arLoading.value = false
    alert('Camera access was denied.\nGo to Settings → Apps → (this app) → Permissions → Camera.')
    return
  }
  if (destroyed) { destroyAR(); return }

  const container = arContainer.value
  if (!container) return

  const video = document.createElement('video')
  video.srcObject = arStream; video.autoplay = true; video.playsInline = true; video.muted = true
  video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;'
  container.appendChild(video)
  await new Promise(r => { video.oncanplay = r; setTimeout(r, 2000) })
  if (destroyed) { destroyAR(); return }

  const w = container.clientWidth || window.innerWidth
  const h = container.clientHeight || window.innerHeight

  arRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  arRenderer.setPixelRatio(window.devicePixelRatio)
  arRenderer.setSize(w, h)
  arRenderer.setClearColor(0x000000, 0)
  arRenderer.outputColorSpace = THREE.SRGBColorSpace
  arRenderer.toneMapping = THREE.ACESFilmicToneMapping
  arRenderer.toneMappingExposure = 1.0
  arRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;'
  container.appendChild(arRenderer.domElement)

  arTouchLayer = document.createElement('div')
  arTouchLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;'
  arTouchLayer.addEventListener('touchstart', arTouchStart, { passive: false })
  arTouchLayer.addEventListener('touchmove',  arTouchMove,  { passive: false })
  arTouchLayer.addEventListener('touchend',   arTouchEnd,   { passive: false })
  container.appendChild(arTouchLayer)

  arScene = new THREE.Scene()
  arCamera = new THREE.PerspectiveCamera(AR_FOV, w / h, 0.01, 1000)
  arCamera.position.set(0, 0, AR_DIST)

  const arPmrem = new THREE.PMREMGenerator(arRenderer)
  arScene.environment = arPmrem.fromScene(new RoomEnvironment()).texture
  arPmrem.dispose()

  arScene.add(new THREE.AmbientLight(0xffffff, 1))
  const arSun = new THREE.DirectionalLight(0xffffff, 2)
  arSun.position.set(5, 10, 7); arScene.add(arSun)

  if (loadedGltf) {
    arModel = loadedGltf.scene.clone(true)
  } else {
    const ok = await new Promise(r =>
      new GLTFLoader().load(SPECIES.model, g => { arModel = g.scene; r(true) }, undefined, () => r(false))
    )
    if (!ok || destroyed) { destroyAR(); mode.value = '3d'; arLoading.value = false; return }
  }
  if (destroyed) { destroyAR(); return }
  scaleAndCenterForAR(arModel)
  arBaseScale = arModel.scale.x
  arScene.add(arModel)

  function arAnimate () {
    if (!arRenderer || !arScene || !arCamera) return
    arFrameId = requestAnimationFrame(arAnimate)
    arRenderer.render(arScene, arCamera)
  }
  arAnimate()
  arLoading.value = false

  // ── Countdown ──────────────────────────────────────────────
  arCountdown.value = 30
  arCountdownTimer = setInterval(() => {
    arCountdown.value--
    if (arCountdown.value <= 0) {
      clearInterval(arCountdownTimer)
      arCountdownTimer = null
      // Short delay: lets Vue flush the [0] display and gives the user a
      // visible beat before the AR context is torn down.
      setTimeout(() => { if (mode.value === 'ar') exitAR() }, 700)
    }
  }, 1000)
}

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

async function exitAR () {
  if (arExiting) return
  arExiting = true
  // Cancel the render loop immediately — no more GPU frames during the closing delay
  if (arFrameId) { cancelAnimationFrame(arFrameId); arFrameId = null }
  arLoadingMsg.value = 'Closing camera…'
  arLoading.value = true
  await new Promise(r => setTimeout(r, 400))
  destroyAR()
  mode.value = '3d'
  await nextTick()
  onResize()
  animate()
  arLoading.value = false
  arExiting = false
}

onMounted(() => { nextTick(initThree) })
onUnmounted(() => {
  destroyed = true
  window.removeEventListener('resize', onResize)
  destroyViewer()
  destroyAR()
})
</script>

<style scoped lang="scss">
.model-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
  padding: 0 !important;
  margin: 0;
  overflow: hidden;
  width: 100%;
}

.viewer-container {
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
}

.loading-overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: rgba(13, 17, 23, 0.85); z-index: 10;
}
.ar-loading  { background: rgba(0,0,0,0.92); z-index: 10003; }
.ar-overlay  { position: fixed; inset: 0; z-index: 9999; background: #000; overflow: hidden; }

.ar-exit-btn {
  position: absolute; top: 20px; right: 20px; z-index: 10002;
  pointer-events: auto !important; min-width: 56px; min-height: 56px;
}

.ar-hint {
  position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
  z-index: 10001; background: rgba(0,0,0,0.55); color: #fff;
  padding: 8px 18px; border-radius: 24px; font-size: 13px;
  display: flex; align-items: center; white-space: nowrap; backdrop-filter: blur(4px);
}

.ar-note {
  position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
  z-index: 10001; background: rgba(0,0,0,0.55); color: #fff;
  padding: 6px 14px; border-radius: 24px; font-size: 12px;
  display: flex; align-items: center; white-space: nowrap; backdrop-filter: blur(4px);
  transition: background 0.4s ease;
}

.species-panel {
  width: 100vw;
  height: 260px;
  display: flex;
  flex-direction: column;
  background: rgba(13, 17, 23, 0.96);
  border-top: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(8px);
}
.panel-header { background: rgba(255,255,255,0.03); }

.species-tabs {
  background: rgba(255,255,255,0.03);
  min-height: 34px;
  :deep(.q-tab__label) { font-size: 11px; }
  :deep(.q-tab__icon)  { font-size: 14px; width: 14px; height: 14px; }
}

.panel-tab-panels {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: transparent !important;
  :deep(.q-tab-panel) {
    background: transparent;
    height: 100%;
    overflow-y: auto;
  }
}

.note-item {
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  padding: 4px 4px 4px 8px;
}
.note-text { word-break: break-word; line-height: 1.4; }

.meta-row {
  display: flex; gap: 6px; align-items: flex-start;
  font-size: 12px; line-height: 1.5;
}
.meta-label { color: #9e9e9e; min-width: 80px; flex-shrink: 0; }
.meta-value { color: #ffffff; }
.ar-launch-btn { flex-shrink: 0; white-space: nowrap; }

.annotation-toggle-row {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 0px 6px 0px 0px;
  width: 100%;
  min-height: 28px;
  justify-content: center;
}
.annotation-toggle-label {
  color: #90caf9;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.annotation-popup {
  position: fixed;
  z-index: 20000;
  background: rgba(10, 18, 38, 0.97);
  border: 1px solid rgba(144, 202, 249, 0.22);
  border-radius: 10px;
  padding: 10px 12px;
  min-width: 170px;
  max-width: 240px;
  backdrop-filter: blur(14px);
  box-shadow: 0 6px 28px rgba(0,0,0,0.65), 0 0 0 1px rgba(144,202,249,0.08);
  transform: translateY(-50%);
  pointer-events: auto;
}
.annotation-popup-title {
  color: #90caf9;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
}
.annotation-popup-desc {
  color: #90a4ae;
  font-size: 11px;
  line-height: 1.55;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from,   .fade-leave-to     { opacity: 0; }
.ar-fade-enter-active { transition: opacity 0.4s ease; }
.ar-fade-leave-active { transition: opacity 0.5s ease; }
.ar-fade-enter-from, .ar-fade-leave-to { opacity: 0; }
</style>
