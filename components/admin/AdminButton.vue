<script setup lang="ts">
import { NuxtLink } from '#components'
import type { AdminIconName } from '~/utils/admin-icons'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid'
  size?: 'sm' | 'md'
  icon?: AdminIconName
  iconRight?: AdminIconName
  loading?: boolean
  disabled?: boolean
  to?: string
  href?: string
  type?: 'button' | 'submit'
  /** Render as a square icon-only button. `label` still feeds aria-label. */
  iconOnly?: boolean
  label?: string
}>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
})

const variantClass: Record<NonNullable<typeof props.variant>, string> = {
  primary: 'cms-btn-primary',
  secondary: 'cms-btn-secondary',
  ghost: 'cms-btn-ghost',
  danger: 'cms-btn-danger',
  dangerSolid: 'cms-btn-danger-solid',
}

const classes = computed(() => [
  'cms-btn',
  variantClass[props.variant],
  props.size === 'sm' ? 'cms-btn-sm' : '',
  props.iconOnly ? 'cms-btn-icon' : '',
])

const iconSize = computed(() => (props.size === 'sm' ? 14 : 16))
const isDisabled = computed(() => props.disabled || props.loading)
const tag = computed(() => (props.to ? NuxtLink : props.href ? 'a' : 'button'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :href="href"
    :type="to || href ? undefined : type"
    :disabled="to || href ? undefined : isDisabled"
    :aria-disabled="isDisabled || undefined"
    :aria-label="iconOnly ? label : undefined"
    :title="iconOnly ? label : undefined"
    :class="classes"
  >
    <AdminIcon v-if="loading" name="loader" :size="iconSize" class="cms-spin" />
    <AdminIcon v-else-if="icon" :name="icon" :size="iconSize" />
    <span v-if="!iconOnly"><slot>{{ label }}</slot></span>
    <AdminIcon v-if="iconRight && !loading" :name="iconRight" :size="iconSize" />
  </component>
</template>
