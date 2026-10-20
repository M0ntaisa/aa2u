/**
 * Drag-and-drop + keyboard reorder for a project's child rows (gallery,
 * drawings, materials). Persists sort_order for every row after a move;
 * if any update fails, the list and every row's sort_order roll back to
 * the snapshot taken before the move (rows already written are restored).
 */
export const useProjectMediaReorder = <T extends { id: string; sort_order: number }>(
  items: Ref<T[]>,
  table: 'project_images' | 'project_drawings' | 'project_materials',
  successMessage: string,
) => {
  const supabase = useSupabaseClient()
  const toast = useToast()

  const dragIndex = ref<number | null>(null)
  const dropIndex = ref<number | null>(null)
  /** True while a reorder batch is in flight; further moves are ignored. */
  const busy = ref(false)

  function onDragStart(i: number) { dragIndex.value = i }
  function onDragOver(e: DragEvent, i: number) {
    e.preventDefault()
    dropIndex.value = i
  }
  function onDragEnd() {
    dragIndex.value = null
    dropIndex.value = null
  }

  async function onDrop(targetIndex: number) {
    const from = dragIndex.value
    onDragEnd()
    if (from === null || from === targetIndex) return
    // One batch at a time: overlapping batches race (out-of-order writes,
    // a rollback restoring a stale snapshot).
    if (busy.value) return
    busy.value = true
    try {
      return await persistMove(from, targetIndex)
    } finally {
      busy.value = false
    }
  }

  async function persistMove(from: number, targetIndex: number) {
    const snapshot = items.value.map(it => ({ item: it, sort_order: it.sort_order }))
    const reordered = [...items.value]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIndex, 0, moved!)
    reordered.forEach((it, idx) => { it.sort_order = idx })
    items.value = reordered

    const write = (rows: { id: string; sort_order: number }[]) => Promise.all(rows.map(it =>
      (supabase.from(table) as any).update({ sort_order: it.sort_order }).eq('id', it.id),
    ))
    const results = await write(reordered)
    const firstError = results.find((r: any) => r.error) as any
    if (firstError?.error) {
      // Restore UI and DB to the pre-move order.
      snapshot.forEach(s => { s.item.sort_order = s.sort_order })
      items.value = snapshot.map(s => s.item)
      const undo = await write(snapshot.map(s => ({ id: s.item.id, sort_order: s.sort_order })))
      if (undo.some((r: any) => r.error)) {
        toast.error('Urutan gagal disimpan', `${firstError.error.message}. Urutan di database mungkin tidak konsisten — muat ulang halaman.`)
      } else {
        toast.error('Urutan gagal disimpan', `${firstError.error.message} — urutan dikembalikan.`)
      }
      return false
    }
    toast.success(successMessage)
    return true
  }

  /** Keyboard reorder — drag-and-drop alone is not accessible. */
  async function move(index: number, delta: number) {
    const target = index + delta
    if (busy.value || target < 0 || target >= items.value.length) return
    dragIndex.value = index
    await onDrop(target)
  }

  return { dragIndex, dropIndex, busy, onDragStart, onDragOver, onDragEnd, onDrop, move }
}
