# Adding a New Species Page

## Overview

All species pages share an identical structure. The only meaningful difference between them is the `SPECIES` data object and the `.glb` model file. To add a new species, duplicate an existing page and update those values.

---

## Step 1 — Copy an existing species page

Duplicate either of these files:

```
src/pages/species/platymantis.vue
src/pages/species/ansoniamuelleri.vue
```

Rename the copy to match the new species, e.g.:

```
src/pages/species/yourspecies.vue
```

---

## Step 2 — Update the SPECIES object

At the top of `<script setup>`, find the `SPECIES` constant and update every field:

```js
const SPECIES = {
  id:           'yourspecies',           // unique key — used for notes storage, must not clash
  scientific:   'Genus species',         // latin/scientific name
  common:       'Common Name',           // display name shown in the panel header
  family:       'Familyname',            // taxonomic family
  order:        'Anura',                 // taxonomic order (usually Anura for frogs/toads)
  habitat:      'Describe the habitat',
  distribution: 'Region, Country',
  conservation: 'Least Concern',         // IUCN status string
  badgeColor:   'positive',              // Quasar color: 'positive' | 'warning' | 'negative' | 'grey'
  description:  'Full description text shown in the About tab.',
  model:        'models/yourspecies.glb' // path relative to /public
}
```

### Badge color guide

| IUCN Status | `badgeColor` |
|---|---|
| Least Concern | `'positive'` |
| Near Threatened / Vulnerable | `'warning'` |
| Endangered / Critically Endangered | `'negative'` |
| Data Deficient / Not Evaluated | `'grey'` |

---

## Step 3 — Add the 3D model

Place the `.glb` file in:

```
public/models/yourspecies.glb
```

The `SPECIES.model` path is resolved relative to `/public`, so `'models/yourspecies.glb'` maps to `public/models/yourspecies.glb`.

---

## Step 4 — Register the route

Open `src/router/routes.js` and add a new route entry inside the children array of the main layout:

```js
{
  path: '/species/yourspecies',
  component: () => import('pages/species/yourspecies.vue')
}
```

---

## Step 5 — Link to the new page (optional)

If your species list or scan result navigates to the page, use:

```js
router.push('/species/yourspecies')
```

Or as a `<router-link>`:

```html
<router-link to="/species/yourspecies">Your Species</router-link>
```

---

## What NOT to change

Everything below is shared boilerplate — do not modify unless fixing a bug that affects all species pages:

- The entire `<template>` block
- All imports
- All reactive state variables (`mode`, `loading`, `arLoading`, etc.)
- `disposeThreeObject`, `destroyViewer`, `destroyAR`
- Touch handlers (`arTouchStart`, `arTouchMove`, `arTouchEnd`)
- `initThree`, `animate`, `onResize`
- `enterAR`, `exitAR`, `scaleAndCenterForAR`
- `onMounted`, `onUnmounted`
- All `<style scoped>` CSS

---

## Summary checklist

- [ ] Duplicate an existing species `.vue` file
- [ ] Update all fields in `SPECIES` (especially `id` and `model`)
- [ ] Add `.glb` file to `public/models/`
- [ ] Add route to `src/router/routes.js`
- [ ] (Optional) Add navigation link to the new route
