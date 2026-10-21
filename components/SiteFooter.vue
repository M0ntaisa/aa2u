<script setup lang="ts">
/**
 * Structured closer footer.
 *   Top    : contact CTA (left) + nav + socials (right)
 *   Block  : drawing title block (§2.8) — studio · address · studio time
 *            (or coordinates once site settings carry them) · contact ·
 *            sheet/scale/©. Replaces the old giant AA2U logotype.
 *   Bottom : colophon row (links + credit)
 */

const { t } = useI18n()
const tt = useT()
const localePath = useLocalePath()
const { data: site } = await useSiteSettings()

// Newsletter signup was removed: there is no provider wired, and the old
// form faked success while discarding the address. It returns (keys under
// `footer.newsletter_*` are kept) once Resend / MailerLite is connected.

const navLinks = [
  { key: 'work',    path: '/work' },
  { key: 'about',   path: '/about' },
  { key: 'contact', path: '/contact' },
] as const

const socials = computed(() => {
  const s = site.value?.socials ?? {}
  return [
    { label: 'Instagram', url: s.instagram },
    { label: 'LinkedIn',  url: s.linkedin  },
    { label: 'Behance',   url: s.behance   },
  ].filter((x): x is { label: string; url: string } => isHttpUrl(x.url))
})

const currentYear = new Date().getFullYear()

// Studio coordinates are optional in site settings (not in the type yet);
// until present, the cell shows the live studio time instead.
const studioCoords = computed(() => {
  const st = site.value as ({ lat?: number; lng?: number } & Record<string, unknown>) | null
  return formatDms(st?.lat, st?.lng)
})
const time = ref('')
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  time.value = studioTime()
  timer = setInterval(() => { time.value = studioTime() }, 30_000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <footer class="site-footer relative z-[1] text-white">
    <!-- Top section -->
    <div class="sheet-wrap pt-24 md:pt-32 pb-12 md:pb-16">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        <!-- LEFT: contact CTA -->
        <div class="lg:col-span-7">
          <h2 class="font-display display-l max-w-md">
            <NuxtLink
              :to="localePath('/contact')"
              class="footer-cta inline"
              :data-cursor-label="t('footer.write_us')"
            >
              {{ t('footer.lets_build_a') }} {{ t('footer.lets_build_b') }}
              <span class="footer-cta-arrow inline-block" aria-hidden="true">→</span>
            </NuxtLink>
          </h2>
        </div>

        <!-- RIGHT: pages + socials -->
        <div class="lg:col-span-5 grid grid-cols-2 gap-8 md:gap-12 lg:pl-8">
          <nav :aria-label="t('footer.nav_label')">
            <ul class="space-y-3 md:space-y-4">
              <li v-for="link in navLinks" :key="link.key">
                <NuxtLink
                  :to="localePath(link.path)"
                  class="footer-nav-link"
                >
                  {{ t(`nav.${link.key}`) }}
                </NuxtLink>
              </li>
            </ul>
          </nav>
          <ul class="space-y-3 md:space-y-4">
            <li v-for="s in socials" :key="s.label">
              <a
                :href="s.url"
                target="_blank"
                rel="noopener"
                class="footer-nav-link"
              >
                {{ s.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Drawing title block -->
      <dl class="title-block mt-16 md:mt-24">
        <div class="tb-cell">
          <dt class="mono-s text-muted">{{ t('footer.tb_studio') }}</dt>
          <dd>{{ site?.studio_name || 'AA2U' }}</dd>
        </div>
        <div v-if="site?.address" class="tb-cell">
          <dt class="mono-s text-muted">{{ t('footer.tb_address') }}</dt>
          <dd>{{ tt(site.address) }}</dd>
        </div>
        <div v-if="studioCoords" class="tb-cell">
          <dt class="mono-s text-muted">{{ t('footer.tb_coord') }}</dt>
          <dd class="mono-s" :aria-label="studioCoords.spoken">{{ studioCoords.text }}</dd>
        </div>
        <div v-else class="tb-cell">
          <dt class="mono-s text-muted">{{ t('nav.studio_time') }}</dt>
          <dd class="mono-s">
            JKT <span class="tabular-nums">{{ time || '--:--' }}</span> WIB
          </dd>
        </div>
        <div v-if="site?.contact_email || site?.contact_phone" class="tb-cell tb-cell--wide">
          <dt class="mono-s text-muted">{{ t('footer.tb_contact') }}</dt>
          <dd class="flex flex-col gap-1">
            <a
              v-if="site?.contact_email"
              :href="`mailto:${site.contact_email}`"
              class="footer-link"
            >{{ site.contact_email }}</a>
            <a
              v-if="site?.contact_phone"
              :href="`tel:${site.contact_phone.replace(/\s+/g, '')}`"
              class="footer-link"
            >{{ site.contact_phone }}</a>
          </dd>
        </div>
        <div class="tb-cell">
          <dt class="mono-s text-muted">{{ t('footer.tb_sheet') }}</dt>
          <dd class="mono-s">A-000 · {{ t('footer.tb_scale') }} · &copy; {{ currentYear }}</dd>
        </div>
      </dl>
    </div>

    <!-- Colophon -->
    <div class="border-t border-line">
      <div class="sheet-wrap py-5 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-3 mono-s text-fg-2">
        <ul class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <li>
            <NuxtLink :to="localePath('/work')" class="footer-colophon-link">
              {{ t('nav.work') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink :to="localePath('/about')" class="footer-colophon-link">
              {{ t('nav.about') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink :to="localePath('/contact')" class="footer-colophon-link">
              {{ t('nav.contact') }}
            </NuxtLink>
          </li>
        </ul>
        <span class="text-muted">{{ t('footer.built_with') }}</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer { margin-top: 8rem; }

/* Title block: a grid of cells with hairline borders, like the corner of a
   drawing sheet. The 1px gaps over a line-coloured ground draw the rules,
   so they stay right whatever cells are present; cells are opaque so the
   sheet grid doesn't run through them. 5 across ≥1024, 2 columns below
   (contact gets a full row there so long emails don't break). */
.title-block {
  display: grid;
  grid-template-columns: 2fr 2fr 1.5fr 2fr 2fr;
  grid-auto-flow: row dense;
  gap: 1px;
  padding: 1px;
  background: var(--color-line-strong);
}
.tb-cell {
  min-width: 0;
  padding: 1rem;
  background: var(--color-bg);
}
.tb-cell dd {
  margin-top: .375rem;
  font-size: .875rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.tb-cell dd.mono-s { font-size: .75rem; }
@media (max-width: 1023px) {
  .title-block { grid-template-columns: 1fr 1fr; }
  .tb-cell--wide { grid-column: 1 / -1; }
}

.footer-link {
  position: relative;
  color: var(--color-fg);
  transition: color var(--d-1) var(--ease-draft);
}
.footer-link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform var(--d-3) var(--ease-draft);
}
.footer-link:hover::after {
  transform: scaleX(1);
  transform-origin: left center;
}

.footer-nav-link {
  position: relative;
  display: inline-block;
  font-family: 'General Sans', 'Inter', system-ui, sans-serif;
  font-size: clamp(1.5rem, 2.4vw, 2rem);
  letter-spacing: -0.01em;
  line-height: 1.15;
  color: #fff;
  transition: color var(--d-2) var(--ease-draft);
}
.footer-nav-link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform var(--d-3) var(--ease-draft);
}
.footer-nav-link:hover {
  color: var(--color-accent);
}
.footer-nav-link:hover::after {
  transform: scaleX(1);
  transform-origin: left center;
}

.footer-cta {
  color: #fff;
  transition: color var(--d-2) var(--ease-draft);
}
.footer-cta:hover { color: var(--color-accent); }
.footer-cta-arrow {
  transition: transform var(--d-3) var(--ease-draft);
}
.footer-cta:hover .footer-cta-arrow { transform: translateX(6px); }

.footer-colophon-link {
  position: relative;
  color: inherit;
  transition: color var(--d-1) var(--ease-draft);
}
.footer-colophon-link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform var(--d-3) var(--ease-draft);
}
.footer-colophon-link:hover { color: #fff; }
.footer-colophon-link:hover::after {
  transform: scaleX(1);
  transform-origin: left center;
}
</style>
