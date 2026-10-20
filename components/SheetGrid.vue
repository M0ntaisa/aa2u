<script setup lang="ts">
/**
 * Fixed hairline column grid behind the page — "the sheet" (§1.4).
 * 12 columns ≥1024, 8 on tablet, 4 on mobile; decorative only. Full-bleed
 * images sit on a higher layer so the lines never run across photos.
 * The crosshair cursor reads `[data-sheet-grid]` to compute its X readout.
 */
</script>

<template>
  <div class="sheet-grid" aria-hidden="true">
    <div class="sheet-wrap sheet-cols h-full" data-sheet-grid>
      <i v-for="n in 12" :key="n" />
    </div>
  </div>
</template>

<style scoped>
.sheet-grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
i {
  border-left: 1px solid var(--color-line);
}
i:nth-child(12) { border-right: 1px solid var(--color-line); }

@media (max-width: 1023px) {
  i:nth-child(n + 9) { display: none; }
  i:nth-child(8) { border-right: 1px solid var(--color-line); }
}
@media (max-width: 639px) {
  i:nth-child(n + 5) { display: none; }
  i:nth-child(4) { border-right: 1px solid var(--color-line); }
}
</style>
