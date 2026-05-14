<template>
  <q-page class="landing-page column items-center justify-between">

   
    <!-- Center illustration -->
    <div class="landing-mid column items-center">
      <div class="qr-illustration">
        <q-icon name="qr_code_2" size="140px" color="grey-7" />
      </div>
      <div class="text-caption text-grey-6 q-mt-sm text-center">
        Point your camera at a QR code
      </div>
      <div class="text-caption text-grey-6 q-mt-sm text-center">
        Scan a QR code to view and explore
      </div>
      <div class="text-caption text-grey-6 q-mt-sm text-center">
        3D model in augmented reality
      </div>
    </div>

    <!-- Bottom action -->
    <div class="landing-bottom full-width q-px-lg q-pb-xl column items-center q-gutter-md">
      <q-btn
        unelevated
        rounded
        color="primary"
        size="lg"
        icon="qr_code_scanner"
        label="Scan QR Code"
        class="full-width scan-btn"
        to="/scan"
      />
      <div class="text-caption text-grey-6">Camera permission required</div>
    </div>

  </q-page>
</template>

<style scoped lang="scss">
.landing-page {
  background: radial-gradient(ellipse at top, #0d1f3c 0%, #0a0a0a 70%);
  min-height: 100vh;
}

.landing-top {
  flex: 0 0 auto;
}

.landing-mid {
  flex: 1 1 auto;
  justify-content: center;
}

.landing-bottom {
  flex: 0 0 auto;
}

.app-icon-wrap {
  background: rgba(25, 118, 210, 0.12);
  border-radius: 50%;
  padding: 20px;
  border: 1px solid rgba(25, 118, 210, 0.3);
}

.qr-illustration {
  opacity: 0.4;
}

.scan-btn {
  max-width: 360px;
  font-size: 16px;
  padding: 14px 0;
  letter-spacing: 0.5px;
}
</style>
