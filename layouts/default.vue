<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <IntroCurtain />

    <!-- Decorative hairline column grid ("the sheet"), behind content. -->
    <SheetGrid />

    <SiteHeader />

    <main class="relative z-[1] flex-1">
      <slot />
    </main>

    <SiteFooter />
  </div>
</template>
