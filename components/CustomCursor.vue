<script setup lang="ts">
/**
 * Custom cursor that follows the pointer and expands when hovering over
 * interactive elements (a, button, [data-cursor]). Optional label via
 * `data-cursor-label="..."` on the element.
 *
 * Disabled on touch / no-hover devices — those keep the native cursor.
 */

const cursorRef = ref<HTMLElement | null>(null)
const label = ref('')
const isHovering = ref(false)
const isHidden = ref(true)
const enabled = ref(false)

onMounted(() => {
  const { $gsap } = useNuxtApp() as any
  if (!$gsap || !cursorRef.value) return

  if (window.matchMedia('(hover: none)').matches) return
  enabled.value = true

  const xTo = $gsap.quickTo(cursorRef.value, 'x', { duration: 0.35, ease: 'power3' })
  const yTo = $gsap.quickTo(cursorRef.value, 'y', { duration: 0.35, ease: 'power3' })

  function onMouseMove(e: MouseEvent) {
    xTo(e.clientX)
    yTo(e.clientY)
    if (isHidden.value) isHidden.value = false
  }

  function onMouseLeave() {
    isHidden.value = true
  }

  function onMouseOver(e: Event) {
    const target = (e.target as HTMLElement).closest<HTMLElement>(
      'a, button, [data-cursor]',
    )
    if (target && !target.hasAttribute('data-cursor-ignore')) {
      isHovering.value = true
      label.value = target.dataset.cursorLabel ?? ''
    } else {
      isHovering.value = false
      label.value = ''
    }
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })
  document.addEventListener('mouseleave', onMouseLeave)
  document.addEventListener('mouseover', onMouseOver, { passive: true })

  document.documentElement.classList.add('cursor-hidden')

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseleave', onMouseLeave)
    document.removeEventListener('mouseover', onMouseOver)
    document.documentElement.classList.remove('cursor-hidden')
  })
})
</script>

<template>
  <div
    v-show="enabled"
    ref="cursorRef"
    aria-hidden="true"
    class="custom-cursor fixed top-0 left-0 z-[200] pointer-events-none mix-blend-difference"
    :class="{
      'is-hovering': isHovering,
      'is-hidden': isHidden,
      'has-label': !!label,
    }"
  >
    <div class="cursor-dot">
      <span class="cursor-label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.custom-cursor {
  transform: translate(-50%, -50%);
  transition: opacity 0.25s ease;
}
.is-hidden {
  opacity: 0;
}
.cursor-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    width 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: width, height;
}
.is-hovering .cursor-dot {
  width: 56px;
  height: 56px;
}
.has-label.is-hovering .cursor-dot {
  width: 84px;
  height: 84px;
}
.cursor-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #1a1b26;
  opacity: 0;
  transition: opacity 0.2s ease 0.1s;
  white-space: nowrap;
}
.has-label.is-hovering .cursor-label {
  opacity: 1;
}
</style>
