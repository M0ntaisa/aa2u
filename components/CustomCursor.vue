<script setup lang="ts">
/**
 * Dual-layer cursor: a small dot that snaps 1:1 to the pointer (zero lag)
 * and an outlined ring that trails with a short lerp. Ring expands when
 * hovering interactive elements (a, button, [data-cursor]). Optional label
 * via `data-cursor-label="..."`.
 *
 * Disabled on touch / no-hover devices and when prefers-reduced-motion.
 */

const dotRef = ref<HTMLElement | null>(null)
const ringRef = ref<HTMLElement | null>(null)
const label = ref('')
const isHovering = ref(false)
const isHidden = ref(true)
const enabled = ref(false)

onMounted(() => {
  const { $gsap } = useNuxtApp() as any
  if (!$gsap || !dotRef.value || !ringRef.value) return

  if (window.matchMedia('(hover: none)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  enabled.value = true

  const dot = dotRef.value
  const ring = ringRef.value

  const ringX = $gsap.quickTo(ring, 'x', { duration: 0.12, ease: 'power2' })
  const ringY = $gsap.quickTo(ring, 'y', { duration: 0.12, ease: 'power2' })

  let rafId = 0
  let pendingX = 0
  let pendingY = 0

  function flush() {
    dot.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0) translate(-50%, -50%)`
    rafId = 0
  }

  function onMouseMove(e: MouseEvent) {
    pendingX = e.clientX
    pendingY = e.clientY
    if (!rafId) rafId = requestAnimationFrame(flush)
    ringX(e.clientX)
    ringY(e.clientY)
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
      const wanted = target.dataset.cursorLabel ?? ''
      // A label that repeats the element's own text just prints the word a
      // second time on top of the link. Only show labels that add something.
      const own = (target.textContent ?? '').replace(/[()\s]+/g, '').toUpperCase()
      label.value = own && own === wanted.replace(/\s+/g, '').toUpperCase() ? '' : wanted
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
    if (rafId) cancelAnimationFrame(rafId)
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
    aria-hidden="true"
    class="custom-cursor-root pointer-events-none"
    :class="{
      'is-hovering': isHovering,
      'is-hidden': isHidden,
      'has-label': !!label,
    }"
  >
    <div ref="dotRef" class="cursor-dot" />
    <div ref="ringRef" class="cursor-ring">
      <span class="cursor-label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.custom-cursor-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  mix-blend-mode: difference;
  transition: opacity 0.25s ease;
}
.is-hidden {
  opacity: 0;
}

.cursor-dot {
  position: fixed;
  top: 0;
  left: 0;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #ffffff;
  will-change: transform;
  transition: opacity 0.2s ease;
}

.cursor-ring {
  position: fixed;
  top: 0;
  left: 0;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  border: 1px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  will-change: transform, width, height;
  transition:
    width 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.3s ease,
    background-color 0.3s ease;
}

.is-hovering .cursor-ring {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.06);
}
.is-hovering .cursor-dot {
  opacity: 0;
}
.has-label.is-hovering .cursor-ring {
  width: 88px;
  height: 88px;
  background: #ffffff;
  border-color: #ffffff;
}

.cursor-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #1a1b26;
  opacity: 0;
  transition: opacity 0.2s ease 0.08s;
  white-space: nowrap;
}
.has-label.is-hovering .cursor-label {
  opacity: 1;
}
</style>
