<template>
  <q-page class="notes-page q-pa-md">

    <!-- ── Header row ─────────────────────────────────────────── -->
    <div class="row items-center q-mb-md">
      <q-icon name="edit_note" color="primary" size="28px" class="q-mr-sm" />
      <q-select
        v-model="selectedSpecies"
        :options="filterOptions"
        dense dark borderless
        emit-value map-options
        options-dark options-dense
        class="notes-filter-select"
      />
      <q-space />
      <q-btn
        v-if="notesStore.allNotes.length"
        flat dense round icon="mail_outline"
        color="primary" size="md"
        title="Send all notes via email"
        @click="sendEmail"
      />
      <q-btn
        v-if="notesStore.allNotes.length"
        flat dense round icon="delete_sweep"
        color="negative" size="md"
        title="Delete all notes"
        class="q-ml-xs"
        @click="confirmDeleteAll"
      />
    </div>

    <!-- ── Empty state ────────────────────────────────────────── -->
    <div v-if="!filteredNotes.length" class="empty-state column items-center q-mt-xl">
      <q-icon name="notes" size="64px" color="grey-8" />
      <div class="text-body2 text-grey-6 q-mt-md">
        {{ notesStore.allNotes.length ? 'No notes for this species' : 'No notes yet' }}
      </div>
      <div v-if="!notesStore.allNotes.length" class="text-caption text-grey-7 q-mt-xs">
        Open a species page and add notes from the Notes tab
      </div>
    </div>

    <!-- ── Notes grouped by species ──────────────────────────── -->
    <div v-for="group in filteredNotes" :key="group.speciesId" class="species-group q-mb-lg">

      <!-- Species heading -->
      <div class="group-header row items-center no-wrap q-mb-sm">
        <q-icon name="category" color="primary" size="16px" class="q-mr-xs" />
        <div class="text-subtitle2 text-primary text-weight-bold col">
          {{ speciesLabel(group.speciesId) }}
        </div>
        <q-btn
          flat dense round icon="delete_sweep"
          color="grey-6" size="xs"
          title="Clear all notes for this species"
          @click="clearSpecies(group.speciesId)"
        />
      </div>

      <!-- Individual notes -->
      <div
        v-for="note in group.notes"
        :key="note.id"
        class="note-card q-mb-sm"
      >
        <div class="row items-start no-wrap">
          <span class="note-bullet text-primary">•</span>
          <div class="col note-body q-ml-xs" v-html="renderMarkdown(note.text)" />
          <q-btn
            flat dense round icon="delete_outline"
            color="grey-6" size="xs" class="q-ml-xs self-start"
            @click="notesStore.deleteNote(group.speciesId, note.id)"
          />
        </div>
        <div class="note-time text-grey-7 q-mt-xxs q-ml-md">{{ formatDate(note.createdAt) }}</div>
      </div>

    </div>

    <!-- ── Confirm delete-all dialog ─────────────────────────── -->
    <q-dialog v-model="deleteAllDialog" persistent>
      <q-card dark class="delete-dialog">
        <q-card-section class="row items-center">
          <q-avatar icon="delete_forever" color="negative" text-color="white" />
          <span class="q-ml-sm text-white">Delete ALL notes from every species?</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-4" v-close-popup />
          <q-btn flat label="Delete All" color="negative" @click="deleteAll" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNotesStore } from 'src/stores/notes.js'
import SPECIES_LIST from 'src/data/species.json'

const notesStore = useNotesStore()
const deleteAllDialog = ref(false)

// Build quick lookup: id → display label
const speciesMap = Object.fromEntries(
  SPECIES_LIST.map(s => [s.id, `${s.common} (${s.scientific})`])
)

function speciesLabel (id) {
  return speciesMap[id] || id
}

// ── Species filter ─────────────────────────────────────────────
const selectedSpecies = ref(null)

const filterOptions = computed(() => [
  { label: 'All Notes', value: null },
  ...notesStore.allNotes.map(g => ({
    label: speciesMap[g.speciesId] || g.speciesId,
    value: g.speciesId
  }))
])

const filteredNotes = computed(() =>
  selectedSpecies.value === null
    ? notesStore.allNotes
    : notesStore.allNotes.filter(g => g.speciesId === selectedSpecies.value)
)

function formatDate (ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ── Simple Markdown → HTML ─────────────────────────────────────
// Handles: **bold**, *italic*, `code`, line-breaks
function renderMarkdown (text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// ── Actions ────────────────────────────────────────────────────
function clearSpecies (id) {
  notesStore.deleteAllNotesForSpecies(id)
}

function confirmDeleteAll () {
  deleteAllDialog.value = true
}

function deleteAll () {
  notesStore.allNotes.forEach(g => notesStore.deleteAllNotesForSpecies(g.speciesId))
}

function sendEmail () {
  const lines = []
  lines.push('MABULIG Species Notes')
  lines.push('')
  notesStore.allNotes.forEach((group, gi) => {
    lines.push(`${gi + 1}. ${speciesLabel(group.speciesId).toUpperCase()}`)
    group.notes.forEach(n => {
      lines.push(`    ${n.text}`)
      lines.push(`    ${formatDate(n.createdAt)}`)
      lines.push('')
    })
    lines.push('')
  })
  const subject = encodeURIComponent('MABULIG species notes')
  const body    = encodeURIComponent(lines.join('\n'))
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}
</script>

<style scoped lang="scss">
.notes-page {
  background: #0d1117;
  min-height: 100vh;
}

.notes-filter-select {
  min-width: 120px;
  max-width: 220px;
  :deep(.q-field__control) { color: #ffffff; }
  :deep(.q-field__native)  { font-size: 16px; font-weight: 700; color: #ffffff; }
  :deep(.q-field__append .q-icon) { color: #ffffff; }
}


.empty-state {
  padding: 40px 0;
}

.species-group {
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  padding: 12px;
}

.group-header {
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding-bottom: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  :deep(.text-subtitle2) { font-size: 12px !important; }
}

.note-card {
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  padding: 8px 10px;
}

.note-body {
  font-size: 13px;
  line-height: 1.5;
  color: #e0e0e0;
  word-break: break-word;

  :deep(strong) { color: #ffffff; }
  :deep(em)     { color: #b0bec5; font-style: italic; }
  :deep(code)   {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    padding: 1px 4px;
    font-family: monospace;
    font-size: 12px;
    color: #80cbc4;
  }
}

.note-bullet {
  font-size: 10px;
  line-height: 1.5;
  flex-shrink: 0;
}

.note-time {
  font-size: 6px;
}

.delete-dialog {
  background: #1a1f2e;
  min-width: 300px;
}
</style>
