<template>
  <q-layout view="hHh lpr fFf">

    <q-header elevated class="bg-dark">
      <q-toolbar>
        <q-btn flat dense round icon="menu" @click="drawerOpen = !drawerOpen" />
        <q-toolbar-title class="text-weight-medium">{{ pageTitle }}</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <!-- ── Species drawer ──────────────────────────────── -->
    <q-drawer v-model="drawerOpen" side="left" bordered :width="300" class="species-drawer">

      <!-- Header -->
      <div class="drawer-header row items-center q-pa-md">
        <q-icon name="view_in_ar" size="28px" color="primary" class="q-mr-sm" />
        <div class="col">
          <div class="text-subtitle1 text-weight-bold text-dark">Frog Species</div>
          <div class="text-caption text-grey-7">{{ availableCount }} / {{ SPECIES.length }} models available</div>
        </div>
        <q-btn
          flat round dense
          icon="home"
          color="grey-7"
          to="/"
          @click="drawerOpen = false"
        />
      </div>

      <q-separator />

      <!-- QR scan shortcut -->
      <q-item clickable class="scan-item q-ma-sm" to="/scan" @click="drawerOpen = false">
        <q-item-section avatar>
          <q-icon name="qr_code_scanner" color="primary" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-primary text-weight-medium">Scan QR Code</q-item-label>
          <q-item-label caption class="text-grey-7">Auto-open matching species</q-item-label>
        </q-item-section>
      </q-item>

      <!-- Field Notes shortcut -->
      <q-item clickable class="scan-item q-ma-sm" to="/notes" @click="drawerOpen = false">
        <q-item-section avatar>
          <q-icon name="edit_note" color="amber-6" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-amber-6 text-weight-medium">Species Notes</q-item-label>
          <q-item-label caption class="text-grey-7">View &amp; manage all your species notes</q-item-label>
        </q-item-section>
        <q-item-section side v-if="totalNotes > 0">
          <q-badge color="amber-7" :label="totalNotes" />
        </q-item-section>
      </q-item>

      <q-separator />

      <!-- Ordered species list -->
      <q-scroll-area class="drawer-scroll">
        <q-list padding>
          <q-item
            v-for="(sp, index) in SPECIES"
            :key="sp.id"
            :clickable="sp.available"
            :to="sp.available ? `/model/${sp.id}` : undefined"
            :active="currentSpeciesId === sp.id"
            active-class="active-species"
            :class="{ 'unavailable-item': !sp.available }"
            @click="sp.available && (drawerOpen = false)"
          >
            <!-- Order number -->
            <q-item-section side class="order-num">
              <span :class="sp.available ? 'text-primary' : 'text-grey-7'">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
            </q-item-section>

            <!-- Name -->
            <q-item-section>
              <q-item-label
                :class="sp.available ? 'text-black text-weight-medium' : 'text-grey-6'"
                lines="1"
              >
                {{ sp.common }}
              </q-item-label>
              <q-item-label caption class="text-italic" :class="sp.available ? 'text-grey-8' : 'text-grey-6'" lines="1">
                {{ sp.scientific }}
              </q-item-label>
            </q-item-section>

            <!-- Status -->
            <q-item-section side>
              <q-icon v-if="sp.available" name="chevron_right" color="grey-5" size="18px" />
              <q-badge v-else color="grey-9" text-color="grey-6" label="Soon" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>

    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import SPECIES from 'src/data/species.json'
import { useNotesStore } from 'src/stores/notes.js'

const route      = useRoute()
const drawerOpen = ref(false)
const notesStore = useNotesStore()
const totalNotes = computed(() => notesStore.allNotes.reduce((sum, g) => sum + g.notes.length, 0))

const availableCount = computed(() => SPECIES.filter(s => s.available).length)

const pageTitle = computed(() => {
  if (route.path === '/scan') return 'Scan QR Code'
  if (route.path === '/notes') return 'Species Notes'
  return 'Project MABULIG'
})

</script>

<style scoped lang="scss">
.species-drawer { background: #ffffff; }

.drawer-header {
  background: linear-gradient(135deg, #e3f0ff, #f5f8ff);
}

.scan-item {
  border-radius: 8px;
}

.drawer-scroll {
  height: calc(100vh - 120px);
}

.order-num {
  min-width: 32px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.active-species {
  background: rgba(25, 118, 210, 0.18);
  border-radius: 8px;
  :deep(.q-item__label) {
    color: #000000 !important;
    font-size: 14px !important;
    font-weight: 700;
  }
  :deep(.q-item__label--caption) {
    color: #333333 !important;
    font-size: 11px !important;
  }
}

.unavailable-item {
  opacity: 0.5;
  cursor: default;
}
</style>
