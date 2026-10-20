<script setup lang="ts">
import type { TeamMember } from '~/types/content'

const props = defineProps<{
  member: TeamMember
  index: number
}>()

const t = useT()
</script>

<template>
  <div class="group">
    <div class="relative overflow-hidden aspect-[4/5] hatch">
      <NuxtImg
        v-if="props.member.photo_url"
        :src="props.member.photo_url"
        :alt="props.member.name"
        sizes="sm:50vw md:25vw lg:20vw xl:20vw 2xl:20vw"
        loading="lazy"
        format="webp"
        class="w-full h-full object-cover"
      />
      <span class="absolute top-0 left-0 px-2.5 py-1.5 mono-s bg-[var(--color-bg)]">
        N°{{ String(props.index + 1).padStart(2, '0') }}
      </span>
    </div>
    <div class="mt-4">
      <h4 class="font-display text-xl tracking-tight">{{ props.member.name }}</h4>
      <p class="mt-1 mono-s text-muted">{{ t(props.member.role) }}</p>
    </div>
  </div>
</template>
