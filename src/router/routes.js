// Auto-discover every file in src/pages/species/*.vue
// File name = species id = route path segment
// e.g.  species/platymantis.vue     → /model/platymantis
//       species/ansoniamuelleri.vue → /model/ansoniamuelleri
// To register a new species page: just drop the .vue file in that folder.
// No changes needed here.
const speciesModules = import.meta.glob('../pages/species/*.vue')

const speciesRoutes = Object.entries(speciesModules).map(([filePath, component]) => {
  const id = filePath.replace('../pages/species/', '').replace('.vue', '')
  return { path: `model/${id}`, component }
})

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '',      component: () => import('pages/IndexPage.vue') },
      { path: 'scan',  component: () => import('pages/ScanPage.vue') },
      { path: 'notes', component: () => import('pages/NotesPage.vue') },
      ...speciesRoutes
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
