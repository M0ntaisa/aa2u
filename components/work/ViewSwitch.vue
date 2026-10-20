<script setup lang="ts">
/**
 * INDEX | ATLAS | MAP segmented control (identity-dossier §2.3).
 * A radiogroup with a roving tabindex: Tab enters on the checked segment,
 * arrow keys (and Home/End) move and select, like native radio buttons.
 */
import { WORK_VIEWS, type WorkView } from '~/utils/work-views'

const model = defineModel<WorkView>({ required: true })
const { t } = useI18n()

const buttons = ref<HTMLButtonElement[]>([])

function select(v: WorkView, focus = false) {
  model.value = v
  if (focus) nextTick(() => buttons.value[WORK_VIEWS.indexOf(v)]?.focus())
}

function onKeydown(e: KeyboardEvent) {
  const i = WORK_VIEWS.indexOf(model.value)
  const n = WORK_VIEWS.length
  let next: number
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown': next = (i + 1) % n; break
    case 'ArrowLeft':
    case 'ArrowUp': next = (i + n - 1) % n; break
    case 'Home': next = 0; break
    case 'End': next = n - 1; break
    default: return
  }
  e.preventDefault()
  select(WORK_VIEWS[next]!, true)
}
</script>

<template>
  <div
    class="view-switch mono-s"
    role="radiogroup"
    :aria-label="t('work.view.label')"
    @keydown="onKeydown"
  >
    <button
      v-for="v in WORK_VIEWS"
      :key="v"
      ref="buttons"
      type="button"
      role="radio"
      class="view-switch__btn"
      :aria-checked="model === v"
      :tabindex="model === v ? 0 : -1"
      @click="select(v)"
    >{{ t(`work.view.${v}`) }}</button>
  </div>
</template>

<style scoped>
.view-switch {
  display: inline-flex;
  border: 1px solid var(--color-line-strong);
}
.view-switch__btn {
  position: relative;
  min-height: 40px;
  padding: 0 1rem;
  color: var(--color-muted);
  border-right: 1px solid var(--color-line-strong);
  transition: color var(--d-1) var(--ease-draft);
}
.view-switch__btn:last-child { border-right: 0; }
.view-switch__btn:hover { color: var(--color-fg); }
.view-switch__btn[aria-checked='true'] { color: var(--color-fg); }
.view-switch__btn[aria-checked='true']::after {
  content: '';
  position: absolute;
  left: .5rem;
  right: .5rem;
  bottom: 6px;
  height: 2px;
  background: var(--color-accent);
}
.view-switch__btn:focus-visible { outline-offset: -4px; }

@media (max-width: 639px) {
  .view-switch { display: flex; width: 100%; }
  .view-switch__btn { flex: 1; min-height: 44px; padding: 0 .5rem; }
}
</style>
