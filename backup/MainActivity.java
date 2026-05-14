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
