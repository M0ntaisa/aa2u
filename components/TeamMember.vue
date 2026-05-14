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
    <div class="relative overflow-hidden aspect-[4/5] bg-[var(--color-muted)]/10">
      <NuxtImg
        v-if="props.member.photo_url"
        :src="props.member.photo_url"
        :alt="props.member.name"
        sizes="(max-width: 768px) 50vw, 25vw"
        loading="lazy"
        format="webp"
        class="w-full h-full object-cover transition-transform duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
      />
      <span class="absolute top-3 left-3 text-xs tracking-[0.25em] text-white mix-blend-difference">
        N°{{ String(props.index + 1).padStart(2, '0') }}
      </span>
    </div>
    <div class="mt-4">
      <h4 class="font-display text-xl tracking-tight">{{ props.member.name }}</h4>
      <p class="mt-1 text-sm text-[var(--color-muted)]">{{ t(props.member.role) }}</p>
    </div>
  </div>
</template>
