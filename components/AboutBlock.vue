<script setup lang="ts">
defineProps<{
  number: string
  heading: string
  body: string
}>()
</script>

<template>
  <article class="grid md:grid-cols-12 gap-6 md:gap-12 py-16 md:py-24 border-t border-line">
    <div class="md:col-span-3">
      <div class="mono-s text-muted">
        N°{{ number }}
      </div>
    </div>
    <div class="md:col-span-9">
      <h3 class="font-display text-3xl md:text-5xl tracking-tight leading-[1.05] mb-6">
        {{ heading }}
      </h3>
      <p class="text-lg md:text-xl text-fg-2 leading-relaxed max-w-3xl">
        {{ body }}
      </p>
    </div>
  </article>
</template>
