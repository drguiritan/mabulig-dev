import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'ar_viewer_notes'

export const useNotesStore = defineStore('notes', () => {
  // Shape: { [speciesId]: Array<{ id, text, createdAt }> }
  const data = ref({})

  function _persist () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.value))
  }

  function init () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) data.value = JSON.parse(raw)
    } catch {}
  }

  function getSpeciesNotes (speciesId) {
    return data.value[speciesId] || []
  }

  function addNote (speciesId, text) {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!data.value[speciesId]) data.value[speciesId] = []
    data.value[speciesId].unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: trimmed,
      createdAt: Date.now()
    })
    _persist()
  }

  function deleteNote (speciesId, noteId) {
    if (!data.value[speciesId]) return
    data.value[speciesId] = data.value[speciesId].filter(n => n.id !== noteId)
    if (!data.value[speciesId].length) delete data.value[speciesId]
    _persist()
  }

  function deleteAllNotesForSpecies (speciesId) {
    delete data.value[speciesId]
    _persist()
  }

  // All notes grouped by speciesId, only non-empty groups
  const allNotes = computed(() =>
    Object.entries(data.value)
      .filter(([, notes]) => notes.length > 0)
      .map(([speciesId, notes]) => ({ speciesId, notes }))
  )

  init()

  return { data, getSpeciesNotes, addNote, deleteNote, deleteAllNotesForSpecies, allNotes }
})
