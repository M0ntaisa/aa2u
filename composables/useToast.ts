/**
 * Toast notifications for the admin panel.
 *
 * Replaces `alert()` and the per-row "Tersimpan ✓" spans that used to be
 * scattered through the admin pages. State lives in a shared `useState` so any
 * page can push and the single <AdminToaster> in layouts/admin.vue renders.
 */
export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

let nextId = 0

export const useToast = () => {
  const toasts = useState<Toast[]>('admin-toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function push(tone: ToastTone, title: string, description?: string, timeout = 3600) {
    const id = ++nextId
    toasts.value = [...toasts.value, { id, tone, title, description }]
    if (import.meta.client && timeout > 0) {
      setTimeout(() => dismiss(id), timeout)
    }
    return id
  }

  return {
    toasts,
    dismiss,
    success: (title: string, description?: string) => push('success', title, description),
    error:   (title: string, description?: string) => push('error', title, description, 6000),
    info:    (title: string, description?: string) => push('info', title, description),
    warning: (title: string, description?: string) => push('warning', title, description, 5000),
  }
}
