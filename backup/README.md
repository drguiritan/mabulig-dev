# Backup — Patch Files for Production Build

These files are ready-to-copy replacements for files that get wiped or reset
during `npm install`, `pnpm install`, or `npx cap sync`.

---

## Files in this folder

---

### `capacitor-builder.js`

| | |
|---|---|
| **Copy to** | `node_modules/@quasar/app-vite/lib/modes/capacitor/capacitor-builder.js` |
| **When to patch** | Every time you run `npm install` or `pnpm install` (node_modules gets wiped) |
| **Why** | The original file calls `./gradlew.bat` via `cross-spawn` which Windows cannot resolve without a full path. This patched version uses `join(androidDir, 'gradlew.bat')` so the build succeeds on Windows. Without this patch the Android build fails immediately with a "command not found" or "not recognized" error. |

**Quick patch command (from project root):**
```bash
cp backup/capacitor-builder.js node_modules/@quasar/app-vite/lib/modes/capacitor/capacitor-builder.js
```

---

### `MainActivity.java`

| | |
|---|---|
| **Copy to** | `src-capacitor/android/app/src/main/java/demo/app/mabulig/MainActivity.java` |
| **When to patch** | If `npx cap sync` or Capacitor upgrade resets the file to its default stub |
| **Why** | The default Capacitor `MainActivity` does not request camera permission at runtime, nor does it grant WebView-level camera access. This patched version adds two overrides: `onCreate` requests the Android system CAMERA permission on first launch, and `onStart` overrides `WebChromeClient.onPermissionRequest` to auto-grant camera access to the WebView so `getUserMedia` works inside the AR viewer. Without this patch the camera is silently denied on Android. |

**Quick patch command (from project root):**
```bash
cp backup/MainActivity.java src-capacitor/android/app/src/main/java/demo/app/mabulig/MainActivity.java
```

---

### `AndroidManifest.xml`

| | |
|---|---|
| **Copy to** | `src-capacitor/android/app/src/main/AndroidManifest.xml` |
| **When to patch** | If `npx cap sync` or a Capacitor upgrade overwrites the manifest and removes the camera permissions |
| **Why** | Android requires `<uses-permission android:name="android.permission.CAMERA" />` declared in the manifest before the app can request it at runtime. Without this the runtime permission request in `MainActivity.java` is silently ignored and the camera never works. Also includes `<uses-feature>` tags so the Play Store correctly marks the camera as optional (not required). |

**Quick patch command (from project root):**
```bash
cp backup/AndroidManifest.xml src-capacitor/android/app/src/main/AndroidManifest.xml
```

---

## Patch All at Once

Run this from the project root to apply all three patches in one go:

```bash
cp backup/capacitor-builder.js node_modules/@quasar/app-vite/lib/modes/capacitor/capacitor-builder.js
cp backup/MainActivity.java src-capacitor/android/app/src/main/java/demo/app/mabulig/MainActivity.java
cp backup/AndroidManifest.xml src-capacitor/android/app/src/main/AndroidManifest.xml
```

---

## After Patching — Build

```bash
# Debug APK (for device testing)
quasar build -m capacitor -T android --debug

# Release APK (for production)
quasar build -m capacitor -T android
```

APK output:
```
src-capacitor/android/app/build/outputs/apk/
```
