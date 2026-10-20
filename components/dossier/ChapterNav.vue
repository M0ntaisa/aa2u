<script setup lang="ts">
/**
 * Chapter navigation (identity-dossier §3.7).
 *
 * variant="rail" — desktop list in the sticky rail. The chapter in view has
 *                  aria-current="true" and a filled square tick in --signal.
 * variant="bar"  — tablet/mobile sticky bar under the header ("02/06 CONCEPT ▾");
 *                  a disclosure button opens the chapter list.
 *
 * Both are plain anchor links (#ch-<key>), so they work without JS; the
 * parent intercepts clicks to offset for the fixed header and move focus.
 */
import type { Chapter } from '~/types/content'

const props = defineProps<{
  chapters: { key: Chapter, no: number }[]
  current: Chapter | null
  variant: 'rail' | 'bar'
}>()

const emit = defineEmits<{ navigate: [key: Chapter, event: MouseEvent] }>()

const { t } = useI18n()
const open = ref(false)
const listId = useId()

const total = computed(() => pad2(props.chapters.length))
const currentChapter = computed(() =>
  props.chapters.find(c => c.key === props.current) ?? props.chapters[0],
)

function go(key: Chapter, e: MouseEvent) {
  open.value = false
  emit('navigate', key, e)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    open.value = false
    ;(e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('.chap-bar__toggle')?.focus()
  }
}
</script>

<template>
  <nav
    v-if="variant === 'rail'"
    class="chap-nav"
    :aria-label="t('dossier.chapters')"
  >
    <p class="mono-s text-muted mb-1" aria-hidden="true">{{ t('dossier.chapters') }}</p>
    <ol>
      <li v-for="c in chapters" :key="c.key">
        <a
          :href="`#ch-${c.key}`"
          class="chap-nav__link mono-s"
          :aria-current="current === c.key ? 'true' : undefined"
          @click="go(c.key, $event)"
        >
          <span class="chap-nav__tick" aria-hidden="true" />
          <span>{{ pad2(c.no) }}&ensp;{{ t(`dossier.chapter.${c.key}`) }}</span>
        </a>
      </li>
    </ol>
  </nav>

  <nav
    v-else
    class="chap-bar"
    :aria-label="t('dossier.chapters')"
    @keydown="onKeydown"
  >
    <div class="sheet-wrap">
      <button
        type="button"
        class="chap-bar__toggle mono-s"
        :aria-expanded="open"
        :aria-controls="listId"
        @click="open = !open"
      >
        <span>
          <span class="sr-only">{{ t('dossier.chapter_current') }}: </span>
          <span class="text-muted">{{ pad2(currentChapter?.no ?? 1) }}/{{ total }}</span>
          &ensp;{{ currentChapter ? t(`dossier.chapter.${currentChapter.key}`) : '' }}
        </span>
        <span class="chap-bar__caret" aria-hidden="true">▾</span>
      </button>
      <ol v-show="open" :id="listId" class="chap-bar__list">
        <li v-for="c in chapters" :key="c.key">
          <a
            :href="`#ch-${c.key}`"
            class="chap-nav__link mono-s"
            :aria-current="current === c.key ? 'true' : undefined"
            @click="go(c.key, $event)"
          >
            <span class="chap-nav__tick" aria-hidden="true" />
            <span>{{ pad2(c.no) }}&ensp;{{ t(`dossier.chapter.${c.key}`) }}</span>
          </a>
        </li>
      </ol>
    </div>
  </nav>
</template>

<style scoped>
.chap-nav ol,
.chap-bar__list { list-style: none; margin: 0; padding: 0; }

.chap-nav__link {
  display: flex;
  align-items: center;
  gap: .625rem;
  min-height: 2rem;
  color: var(--color-muted);
  transition: color var(--d-1) var(--ease-draft);
}
.chap-nav__link:hover,
.chap-nav__link[aria-current="true"] { color: var(--color-fg); }
.chap-nav__tick {
  width: 8px;
  height: 8px;
  flex: none;
  border: 1px solid var(--color-line-strong);
  transition: background-color var(--d-1) var(--ease-draft), border-color var(--d-1) var(--ease-draft);
}
/* Current chapter tick — one of the four --signal uses (§1.1.1). */
.chap-nav__link[aria-current="true"] .chap-nav__tick {
  background: var(--color-signal);
  border-color: var(--color-signal);
}

.chap-bar {
  position: relative;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-line);
}
.chap-bar__toggle {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  color: var(--color-fg);
}
.chap-bar__caret { transition: transform var(--d-2) var(--ease-draft); }
.chap-bar__toggle[aria-expanded="true"] .chap-bar__caret { transform: rotate(180deg); }
.chap-bar .sheet-wrap { position: relative; }
/* Overlay, so opening the list never shifts the page under the sticky bar. */
.chap-bar__list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  padding: .25rem var(--sheet-margin) .5rem;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-line-strong);
}
.chap-bar__list .chap-nav__link { min-height: 44px; }
</style>
