/**
 * Shared-element transition between pages.
 *
 * Implements the FLIP technique (First-Last-Invert-Play):
 *   1. capture() reads the source element's bounding rect and stashes it
 *      in Nuxt useState so it survives the route change.
 *   2. consume() returns the stash and clears it.
 *   3. The target page reads the stash, finds the destination element by
 *      data-flip-id, and uses gsap.from() with a delta transform to make
 *      the target appear to morph from the source's old position/size.
 *
 * We use a raw rect (not GSAP's Flip plugin Flip.getState) because Flip
 * plugin requires the original DOM nodes to still exist when from() plays
 * — they don't, since Vue unmounts the source page during navigation.
 */

interface FlipRect {
  x: number
  y: number
  width: number
  height: number
}

interface FlipPayload {
  flipId: string
  rect: FlipRect
  borderRadius?: string
}

export const useSharedFlip = () => {
  const payload = useState<FlipPayload | null>('aa2u:shared-flip', () => null)

  function capture(element: HTMLElement, flipId: string) {
    const rect = element.getBoundingClientRect()
    const computed = window.getComputedStyle(element)
    payload.value = {
      flipId,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      borderRadius: computed.borderRadius,
    }
  }

  function consume(): FlipPayload | null {
    const current = payload.value
    payload.value = null
    return current
  }

  const isActive = computed(() => payload.value !== null)

  return { capture, consume, isActive }
}
