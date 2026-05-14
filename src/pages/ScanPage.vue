<template>
  <q-page class="scan-page">

    <!-- Camera feed -->
    <video ref="videoEl" class="scan-video" autoplay playsinline muted />

    <!-- Hidden canvas used by jsQR to read frames -->
    <canvas ref="canvasEl" class="hidden-canvas" />

    <!-- Viewfinder overlay -->
    <div class="scan-overlay">
      <div class="scan-frame">
        <span class="corner tl" />
        <span class="corner tr" />
        <span class="corner bl" />
        <span class="corner br" />
        <div v-if="scanning" class="scan-line" />
      </div>
      <div class="scan-label text-white text-body2 q-mt-lg">
        {{ statusText }}
      </div>
    </div>

    <!-- Error state -->
    <div v-if="cameraError" class="error-overlay column items-center justify-center q-gutter-md">
      <q-icon name="no_photography" size="64px" color="grey-5" />
      <div class="text-white text-center text-body1">{{ cameraError }}</div>
      <q-btn unelevated rounded color="primary" label="Go Back" to="/" />
    </div>

  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import jsQR from 'jsqr'
import SPECIES from 'src/data/species.json'
const SPECIES_MAP = Object.fromEntries(SPECIES.map(s => [s.id, s]))

const router     = useRouter()
const videoEl    = ref(null)
const canvasEl   = ref(null)
const scanning   = ref(true)
const cameraError = ref('')
const statusText  = ref('Align QR code inside the frame')

let stream     = null
let rafId      = null
let ctx        = null
let detected   = false

onMounted(async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    })
    videoEl.value.srcObject = stream
    videoEl.value.oncanplay = startScanning
  } catch (err) {
    cameraError.value = 'Camera access denied.\nGo to Settings → Apps → Permissions → Camera.'
    scanning.value = false
  }
})

onUnmounted(stopCamera)

function startScanning () {
  ctx = canvasEl.value.getContext('2d', { willReadFrequently: true })
  tick()
}

function tick () {
  if (detected) return
  const video  = videoEl.value
  const canvas = canvasEl.value
  if (!video || !canvas || video.readyState < 2) {
    rafId = requestAnimationFrame(tick)
    return
  }

  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert'
  })

  if (code) {
    const raw     = code.data.trim().toLowerCase()
    const species = SPECIES_MAP[raw]
    if (species) {
      detected = true
      scanning.value   = false
      statusText.value = `Found: ${species.common} — loading…`
      stopCamera()
      router.push(`/model/${species.id}`)
    } else {
      statusText.value = `Unknown QR: "${code.data}" — try another`
    }
  }

  rafId = requestAnimationFrame(tick)
}

function stopCamera () {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
}
</script>

<style scoped lang="scss">
.scan-page {
  position: relative;
  width: 100%;
  height: calc(100vh - 50px);
  background: #000;
  overflow: hidden;
}

.scan-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hidden-canvas {
  display: none;
}

/* ── Viewfinder ─────────────────────────────────────── */
.scan-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.scan-frame {
  position: relative;
  width: 240px;
  height: 240px;
}

/* Corner brackets */
.corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: #fff;
  border-style: solid;
}
.tl { top: 0;    left: 0;  border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.tr { top: 0;    right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.bl { bottom: 0; left: 0;  border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

/* Animated scan line */
.scan-line {
  position: absolute;
  left: 4px;
  right: 4px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #1976d2, transparent);
  animation: scanline 2s linear infinite;
}

@keyframes scanline {
  0%   { top: 4px; }
  100% { top: calc(100% - 6px); }
}

.scan-label {
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
  text-align: center;
  padding: 0 24px;
}

/* ── Error overlay ──────────────────────────────────── */
.error-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  padding: 24px;
}
</style>
