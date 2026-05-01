<script setup lang="ts">
const { locale } = useI18n()
useHead({
  htmlAttrs: { lang: locale.value },
})

const { onLeave, onEnter } = usePageTransition()
</script>

<template>
  <NuxtLayout>
    <NuxtPage
      :transition="{
        mode: 'out-in',
        css: false,
        onLeave,
        onEnter,
      }"
    />
  </NuxtLayout>

  <ClientOnly>
    <CustomCursor />
  </ClientOnly>
</template>
