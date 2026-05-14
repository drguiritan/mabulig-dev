## OLD-1


const pageTitle = computed(() => {
  if (route.path === '/scan')  return 'Scan QR Code'
  if (route.path === '/notes') return 'Species Notes'
  const sp = currentSpeciesId.value ? SPECIES.find(s => s.id === currentSpeciesId.value) : null
  return sp ? sp.common : 'Project MABULIG'
})

## NEW-1   MainLayout.vuew line range 123-127

const pageTitle = computed(() => {
  if (route.path === '/scan') return 'Scan QR Code'
  if (route.path === '/notes') return 'Species Notes'
  return 'Project MABULIG'
})


## OLD-2

  <!-- Top branding -->
    <div class="landing-top column items-center q-pt-xl">
      <div class="app-icon-wrap q-mb-md">
        <q-icon name="view_in_ar" size="72px" color="primary" />
      </div>
      <div class="text-h4 text-weight-bold text-white">AR Viewer</div>
      <div class="text-body2 text-grey-5 q-mt-sm text-center q-px-xl">
        Scan a QR code to view and explore a 3D model in augmented reality
      </div>
    </div>

## NEW-2 totally removed.    