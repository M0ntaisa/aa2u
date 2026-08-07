/**
 * Promise-based confirmation dialog.
 *
 * `confirm()` in the browser is modal to the whole tab, unstyled, and cannot
 * describe a destructive action properly. This drives <AdminConfirmDialog>,
 * mounted once in layouts/admin.vue.
 *
 *   if (!await ask({ title: 'Hapus projek?', tone: 'danger' })) return
 */
export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

const defaults: ConfirmState = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Lanjutkan',
  cancelLabel: 'Batal',
  tone: 'default',
}

export const useConfirm = () => {
  const state = useState<ConfirmState>('admin-confirm', () => ({ ...defaults }))
  // Kept outside useState: a promise resolver is not serialisable.
  const resolver = useState<{ fn: ((v: boolean) => void) | null }>(
    'admin-confirm-resolver',
    () => ({ fn: null }),
  )

  function ask(options: ConfirmOptions): Promise<boolean> {
    state.value = { ...defaults, ...options, open: true }
    return new Promise<boolean>((resolve) => {
      resolver.value.fn = resolve
    })
  }

  function settle(value: boolean) {
    state.value = { ...state.value, open: false }
    resolver.value.fn?.(value)
    resolver.value.fn = null
  }

  return {
    state,
    ask,
    confirm: () => settle(true),
    cancel: () => settle(false),
  }
}
