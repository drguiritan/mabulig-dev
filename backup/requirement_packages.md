# Required Packages

All packages used by this project — their purpose, version, and how to install
in the project root and/or the Capacitor Android directory.

---

## Project Root (`D:\quasar\deepseek\demo`)

---

### Runtime Dependencies

---

#### `quasar` `^2.16.0`

| | |
|---|---|
| **Purpose** | Core UI framework (Vue 3). Provides all UI components: `q-page`, `q-btn`, `q-tabs`, `q-toggle`, `q-drawer`, `q-badge`, `q-input`, `q-dialog`, etc. Also provides the app shell (router-view, layout system, Sass variables). |
| **Used in** | Every `.vue` file, `quasar.config.js` |

```bash
npm install quasar@^2.16.0
```

---

#### `@quasar/extras` `^1.16.4`

| | |
|---|---|
| **Purpose** | Ships Material Design icon fonts (used via `icon="..."` props on Quasar components). Required alongside `quasar` — without it, all icons render as blank squares. |
| **Used in** | `quasar.config.js` — configured under `extras: ['material-icons']` |

```bash
npm install @quasar/extras@^1.16.4
```

---

#### `vue` `^3.5.22`

| | |
|---|---|
| **Purpose** | The core Vue 3 framework. Provides `ref`, `computed`, `onMounted`, `onUnmounted`, `nextTick`, `<script setup>`, `<Transition>`, etc. |
| **Used in** | All `.vue` files |

```bash
npm install vue@^3.5.22
```

---

#### `vue-router` `^5.0.3`

| | |
|---|---|
| **Purpose** | SPA routing. Manages navigation between `/`, `/scan`, `/notes`, and `/model/{speciesId}`. Runs in **hash mode** (`createWebHashHistory`) which is required for Capacitor WebView — the WebView has no server to handle HTML5 history fallbacks. |
| **Used in** | `src/router/index.js`, `src/router/routes.js`, `MainLayout.vue`, `ScanPage.vue`, species pages |

```bash
npm install vue-router@^5.0.3
```

---

#### `pinia` `^3.0.4`

| | |
|---|---|
| **Purpose** | State management store. Manages the notes feature — stores user notes per species, persists them to `localStorage`, and exposes reactive getters. Registered via `src/boot/pinia.js`. |
| **Used in** | `src/stores/notes.js`, all species pages, `NotesPage.vue` |

```bash
npm install pinia@^3.0.4
```

---

#### `three` `^0.183.2`

| | |
|---|---|
| **Purpose** | 3D rendering engine. Powers both the 3D viewer and the AR mode. Provides: `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `GLTFLoader`, `OrbitControls`, `RoomEnvironment`, `PMREMGenerator`, lights, geometries, materials, raycasting. |
| **Used in** | All `src/pages/species/*.vue` files |

```bash
npm install three@^0.183.2
```

---

#### `troika-three-text` `^0.52.4`

| | |
|---|---|
| **Purpose** | High-quality SDF (Signed Distance Field) 3D text renderer that integrates with Three.js. Used to render annotation labels directly in the 3D scene. Labels stay crisp at any zoom level and billboard to always face the camera. |
| **Used in** | All `src/pages/species/*.vue` files (annotation system) |

```bash
npm install troika-three-text@^0.52.4
```

**Usage in species pages:**
```js
import { Text } from 'troika-three-text'

const txt = new Text()
txt.text        = 'Label name'
txt.fontSize    = 0.07
txt.color       = 0x00ccff
txt.anchorX     = 'center'
txt.anchorY     = 'middle'
txt.outlineWidth = '8%'
txt.outlineColor = 0x000000
txt.position.set(x, y, z)
txt.sync()          // triggers async SDF glyph bake
scene.add(txt)

// In animate loop — make text face camera:
txt.quaternion.copy(camera.quaternion)

// Cleanup:
txt.dispose()
```

---

#### `jsqr` `^1.4.0`

| | |
|---|---|
| **Purpose** | QR code decoder. Reads raw pixel data from a hidden `<canvas>` element (populated from the live camera `<video>`) and returns the decoded string if a QR code is detected. Runs on every `requestAnimationFrame` tick inside `ScanPage.vue`. |
| **Used in** | `src/pages/ScanPage.vue` |

```bash
npm install jsqr@^1.4.0
```

**Usage:**
```js
import jsQR from 'jsqr'

// Inside rAF loop:
ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
const code = jsQR(imageData.data, imageData.width, imageData.height)
if (code) console.log(code.data)  // decoded QR string
```

---

### Dev Dependencies

---

#### `@quasar/app-vite` `^2.5.1`

| | |
|---|---|
| **Purpose** | Quasar's Vite-based build toolchain. Provides `quasar dev`, `quasar build`, Capacitor integration, asset pipeline, and the `quasar.config.js` config system. Not bundled into the app — dev tooling only. |
| **Used in** | Build process only |

```bash
npm install --save-dev @quasar/app-vite@^2.5.1
```

---

#### `autoprefixer` `^10.4.27`

| | |
|---|---|
| **Purpose** | PostCSS plugin that automatically adds browser vendor prefixes to CSS (e.g. `-webkit-`, `-moz-`). Required by Quasar's Vite pipeline for cross-browser SCSS compilation. |
| **Used in** | `postcss.config.js` |

```bash
npm install --save-dev autoprefixer@^10.4.27
```

---

#### `postcss` `^8.5.8`

| | |
|---|---|
| **Purpose** | CSS transformation tool. Required peer dependency of `autoprefixer`. Quasar's Vite pipeline uses it to process SCSS → CSS with vendor prefixes. |
| **Used in** | `postcss.config.js` |

```bash
npm install --save-dev postcss@^8.5.8
```

---

## Install All at Once (Project Root)

```bash
cd D:\quasar\deepseek\demo

# All runtime dependencies
npm install quasar@^2.16.0 @quasar/extras@^1.16.4 vue@^3.5.22 vue-router@^5.0.3 pinia@^3.0.4 three@^0.183.2 troika-three-text@^0.52.4 jsqr@^1.4.0

# Dev dependencies
npm install --save-dev @quasar/app-vite@^2.5.1 autoprefixer@^10.4.27 postcss@^8.5.8
```

Or simply:

```bash
cd D:\quasar\deepseek\demo
npm install
```

`npm install` reads `package.json` and installs everything automatically.

---

## Capacitor Android Directory (`src-capacitor/android/`)

The Capacitor Android project is a standard Gradle/Android project. Its
dependencies are declared in `build.gradle` files — not in `package.json`.
These are managed by Gradle automatically during the Android build.

### Capacitor Core (auto-managed by `npx cap sync`)

| Package | Purpose |
|---|---|
| `com.capacitorjs:core` | Capacitor runtime — bridges the WebView to native Android APIs |
| `androidx.appcompat:appcompat` | Android AppCompat library — required by Capacitor |
| `androidx.coordinatorlayout:coordinatorlayout` | Android layout — required by Capacitor |

These are declared in `src-capacitor/android/app/build.gradle` and pulled
from Maven Central automatically when you run:

```bash
# From src-capacitor/android/
./gradlew assembleDebug
```

Or triggered automatically via:

```bash
# From project root
quasar build -m capacitor -T android
```

### Adding a New Capacitor Plugin

If you need to add a native Capacitor plugin (e.g. for file system access):

```bash
# 1. Install JS side (project root)
cd D:\quasar\deepseek\demo
npm install @capacitor/filesystem

# 2. Sync to Android project
npx cap sync android
```

`npx cap sync` copies the web build into the Android project and installs
the native plugin's Android AAR into the Gradle dependencies.

---

## Package Quick-Reference Table

| Package | Version | Type | Purpose |
|---|---|---|---|
| `quasar` | ^2.16.0 | runtime | UI framework |
| `@quasar/extras` | ^1.16.4 | runtime | Material icons |
| `vue` | ^3.5.22 | runtime | Vue 3 core |
| `vue-router` | ^5.0.3 | runtime | SPA routing (hash mode) |
| `pinia` | ^3.0.4 | runtime | State management / notes store |
| `three` | ^0.183.2 | runtime | 3D / WebGL rendering |
| `troika-three-text` | ^0.52.4 | runtime | 3D SDF text labels (annotations) |
| `jsqr` | ^1.4.0 | runtime | QR code decoding |
| `@quasar/app-vite` | ^2.5.1 | devDep | Build toolchain |
| `autoprefixer` | ^10.4.27 | devDep | CSS vendor prefixes |
| `postcss` | ^8.5.8 | devDep | CSS pipeline |
