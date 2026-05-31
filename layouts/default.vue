<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <IntroCurtain />

    <SiteHeader />

    <main class="flex-1">
      <slot />
    </main>

    <SiteFooter />

    <div class="grain-overlay" aria-hidden="true" />
  </div>
</template>
