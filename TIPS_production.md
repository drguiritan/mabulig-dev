# Production Build Tips — Android (Quasar + Capacitor)

## Stack Versions
| Package | Version |
|---|---|
| Quasar | ^2.16.0 |
| @quasar/app-vite | ^2.5.1 |
| Three.js | ^0.183.2 |
| Capacitor | v8 |

---

## Build Command

### Debug APK (for device testing)
```bash
quasar build -m capacitor -T android --debug
```

### Release APK (for production / Play Store)
```bash
quasar build -m capacitor -T android
```

APK output location:
```
src-capacitor/android/app/build/outputs/apk/
```

---

## Critical Manual Patch — `capacitor-builder.js` (Windows only)

> **Re-apply this patch every time you run `npm install` or `pnpm install`**,
> because it lives inside `node_modules` and gets wiped on reinstall.

**File to patch:**
```
node_modules/@quasar/app-vite/lib/modes/capacitor/capacitor-builder.js
```

**What to change** — find the `spawnSync` call that runs Gradle and replace
the `gradlew.bat` argument with the full absolute path:

```js
// BEFORE (broken on Windows — cmd cannot find ./gradlew.bat via cross-spawn)
await spawnSync('./gradlew.bat', ...)

// AFTER (working — use absolute path via join)
const androidDir = this.ctx.appPaths.resolve.capacitor('android')
await spawnSync(
  process.platform === 'win32' ? join(androidDir, 'gradlew.bat') : './gradlew',
  ...
  { cwd: androidDir },
)
```

Make sure `join` is imported at the top of that file:
```js
import { join } from 'path'
// or
const { join } = require('path')
```

**Why:** `cross-spawn` on Windows spawns `cmd.exe /c gradlew.bat` without
the absolute path, so Windows cannot locate the file. The full path fixes it.

---

## Critical File — `MainActivity.java`

**File location:**
```
src-capacitor/android/app/src/main/java/demo/app/mabulig/MainActivity.java
```

If this file gets reset/wiped (e.g. after `npx cap sync`), restore it to
exactly this content:

```java
package demo.app.mabulig;

import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  private static final int CAMERA_REQUEST_CODE = 1001;

  @Override
  protected void onCreate(android.os.Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Request Android system-level camera permission on first launch
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(
        this,
        new String[]{ Manifest.permission.CAMERA },
        CAMERA_REQUEST_CODE
      );
    }
  }

  @Override
  public void onStart() {
    super.onStart();

    // Allow the WebView to use the camera (required for AR getUserMedia)
    getBridge().getWebView().setWebChromeClient(
      new com.getcapacitor.BridgeWebChromeClient(getBridge()) {
        @Override
        public void onPermissionRequest(final PermissionRequest request) {
          request.grant(request.getResources());
        }
      }
    );
  }
}
```

**Why `onCreate`:** Requests the Android system-level `CAMERA` permission at
app launch. Without this, `getUserMedia` silently fails on Android even if
the user grants permission in the browser dialog.

**Why `onStart` / `onPermissionRequest`:** The Capacitor WebView wraps its
own `WebChromeClient`. Overriding `onPermissionRequest` and calling
`request.grant(request.getResources())` auto-approves the WebView-level
camera permission so the browser `getUserMedia` API works inside the app.

**Why `public` on `onStart`:** The parent `BridgeActivity` declares
`onStart()` as `public`. Java does not allow an override to have weaker
access — using `protected` causes a compile error.

---

## `AndroidManifest.xml` — Required Permissions

**File location:**
```
src-capacitor/android/app/src/main/AndroidManifest.xml
```

These lines must be present inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

---

## Adding a New Species

1. Copy `src/pages/species/platymantis.vue` → rename to e.g. `bufomarinus.vue`
2. Inside the new file edit the `SPECIES` object at the top:
   - `id` — must match the filename without `.vue`
   - `model` — `'models/bufomarinus.glb'`
   - All metadata fields (`scientific`, `common`, `family`, etc.)
3. Drop the `.glb` file into `public/models/`
4. In `src/data/species.json` set `"available": true` for that species entry

The router (`src/router/routes.js`) and drawer (`src/layouts/MainLayout.vue`)
auto-discover new pages via `import.meta.glob` — **no other files need editing**.

---

## QR Codes

The QR scanner (`src/pages/ScanPage.vue`) reads the raw text of a QR code
and matches it against the `id` field in `src/data/species.json`.

Generate QR codes that encode the species `id` string only, e.g.:
```
platymantis
ansoniamuelleri
bufomarinus
```

---

## After `npm install` / `pnpm install` Checklist

- [ ] Re-apply the `capacitor-builder.js` patch (Windows gradlew fix)
- [ ] Verify `MainActivity.java` is still intact
- [ ] Run `npx cap sync` if Capacitor dependencies changed
- [ ] Test build with `quasar build -m capacitor -T android --debug`
