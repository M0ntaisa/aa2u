<script setup lang="ts">
import type { AdminIconName } from '~/utils/admin-icons'

const { toasts, dismiss } = useToast()

const iconFor: Record<string, AdminIconName> = {
  success: 'checkCircle',
  error: 'alert',
  warning: 'alert',
  info: 'info',
}

const colorFor: Record<string, string> = {
  success: 'text-[var(--ad-success)]',
  error: 'text-[var(--ad-danger)]',
  warning: 'text-[var(--ad-warning)]',
  info: 'text-[var(--ad-accent)]',
}
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <TransitionGroup
        tag="div"
        name="ad-toast"
        class="fixed bottom-5 right-5 z-[120] flex flex-col gap-2.5"
        aria-live="polite"
      >
        <div v-for="t in toasts" :key="t.id" class="ad-toast" :class="`ad-toast-${t.tone}`">
          <AdminIcon :name="iconFor[t.tone]" :size="16" :class="[colorFor[t.tone], 'mt-0.5']" />
          <div class="min-w-0 flex-1">
            <p class="font-medium">{{ t.title }}</p>
            <p v-if="t.description" class="mt-0.5 text-[12px] leading-snug text-[var(--ad-fg-muted)] break-words">
              {{ t.description }}
            </p>
          </div>
          <button
            type="button"
            class="-mr-1 -mt-0.5 rounded p-1 text-[var(--ad-fg-subtle)] transition-colors hover:text-[var(--ad-fg)]"
            aria-label="Tutup notifikasi"
            @click="dismiss(t.id)"
          >
            <AdminIcon name="x" :size="13" />
          </button>
        </div>
      </TransitionGroup>
    </Teleport>
  </ClientOnly>
</template>
