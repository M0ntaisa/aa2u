<script setup lang="ts">
const { state, confirm, cancel } = useConfirm()

const confirmButton = ref<HTMLElement | null>(null)

watch(() => state.value.open, async (open) => {
  if (!open) return
  await nextTick()
  ;(confirmButton.value as any)?.$el?.focus?.()
})

function onKeydown(e: KeyboardEvent) {
  if (!state.value.open) return
  if (e.key === 'Escape') cancel()
  if (e.key === 'Enter') confirm()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="ad-fade">
        <div
          v-if="state.open"
          class="ad-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          @click.self="cancel"
        >
          <Transition name="ad-pop" appear>
            <div class="ad-dialog">
              <div class="flex items-start gap-3.5">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  :class="state.tone === 'danger'
                    ? 'bg-[rgba(247,118,142,0.14)] text-[var(--ad-danger)]'
                    : 'bg-[rgba(122,162,247,0.14)] text-[var(--ad-accent)]'"
                >
                  <AdminIcon :name="state.tone === 'danger' ? 'alert' : 'info'" :size="17" />
                </div>
                <div class="min-w-0 flex-1">
                  <h2 class="text-[15px] font-semibold text-[var(--ad-fg)]">{{ state.title }}</h2>
                  <p v-if="state.message" class="mt-1.5 text-[13px] leading-relaxed text-[var(--ad-fg-muted)]">
                    {{ state.message }}
                  </p>
                </div>
              </div>

              <div class="mt-6 flex items-center justify-end gap-2">
                <AdminButton variant="ghost" @click="cancel">{{ state.cancelLabel }}</AdminButton>
                <AdminButton
                  ref="confirmButton"
                  :variant="state.tone === 'danger' ? 'dangerSolid' : 'primary'"
                  @click="confirm"
                >
                  {{ state.confirmLabel }}
                </AdminButton>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
