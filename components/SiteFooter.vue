<script setup lang="ts">
/**
 * Structured closer footer.
 *   Top    : journal signup (left) + nav + socials (right)
 *   Mid    : address / email / phone meta strip
 *   Large  : giant fully-visible AA2U logotype (architectural signature)
 *   Bottom : colophon row (legal links + copyright + credit)
 */

const { t } = useI18n()
const tt = useT()
const localePath = useLocalePath()
const { data: site } = await useSiteSettings()

const email = ref('')
const submitting = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

async function onSubscribe() {
  if (!email.value.trim()) return
  errorMsg.value = ''
  submitting.value = true
  try {
    // TODO: wire to actual newsletter provider (Resend / MailerLite) later.
    // For now, simulate success so the UI flow is testable.
    await new Promise((r) => setTimeout(r, 450))
    submitted.value = true
    email.value = ''
  } catch (e: any) {
    errorMsg.value = e?.message || t('footer.newsletter_error')
  } finally {
    submitting.value = false
  }
}

const navLinks = [
  { key: 'work',    path: '/work' },
  { key: 'about',   path: '/about' },
  { key: 'contact', path: '/contact' },
] as const

const socials = computed(() => {
  const s = site.value?.socials ?? {}
  return [
    s.instagram ? { label: 'Instagram', url: s.instagram } : null,
    s.linkedin  ? { label: 'LinkedIn',  url: s.linkedin  } : null,
    s.behance   ? { label: 'Behance',   url: s.behance   } : null,
  ].filter(Boolean) as { label: string; url: string }[]
})

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer relative bg-[var(--color-bg)] text-white">
    <!-- Top section -->
    <div class="px-6 md:px-10 pt-24 md:pt-32 pb-10 md:pb-16">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        <!-- LEFT: journal signup + meta strip -->
        <div class="lg:col-span-7">
          <h2 class="font-display tracking-tight text-2xl md:text-3xl lg:text-4xl max-w-md">
            {{ t('footer.newsletter_heading') }}
          </h2>

          <form class="mt-8 max-w-xl" novalidate @submit.prevent="onSubscribe">
            <div class="flex items-center gap-3 border-b border-white/25 pb-3 focus-within:border-white/80 transition-colors duration-300">
              <input
                v-model="email"
                type="email"
                required
                :placeholder="t('footer.newsletter_placeholder')"
                :disabled="submitting || submitted"
                class="flex-1 bg-transparent text-base md:text-lg placeholder:text-white/35 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                :disabled="submitting || submitted || !email"
                class="footer-arrow-btn text-xl shrink-0"
                :aria-label="t('footer.newsletter_submit')"
                :data-cursor-label="t('footer.newsletter_submit')"
              >→</button>
            </div>
            <Transition name="meta">
              <p v-if="submitted" class="mt-3 text-xs uppercase tracking-[0.22em] text-[var(--color-accent,#c0caf5)]">
                {{ t('footer.newsletter_success') }}
              </p>
              <p v-else-if="errorMsg" class="mt-3 text-xs uppercase tracking-[0.22em] text-red-300">
                {{ errorMsg }}
              </p>
            </Transition>
          </form>

          <!-- Meta strip: 3 columns of contact info -->
          <div class="mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-10">
            <div v-if="site?.address">
              <div class="footer-label">{{ t('footer.head_office') }}</div>
              <p class="footer-value mt-3">{{ tt(site.address) }}</p>
            </div>
            <div v-if="site?.contact_email">
              <div class="footer-label">{{ t('footer.email_us') }}</div>
              <a
                :href="`mailto:${site.contact_email}`"
                class="footer-link mt-3 inline-block"
                :data-cursor-label="t('footer.write_us')"
              >
                {{ site.contact_email }}
              </a>
            </div>
            <div v-if="site?.contact_phone">
              <div class="footer-label">{{ t('footer.call_us') }}</div>
              <a
                :href="`tel:${site.contact_phone.replace(/\s+/g, '')}`"
                class="footer-link mt-3 inline-block"
              >
                {{ site.contact_phone }}
              </a>
            </div>
          </div>
        </div>

        <!-- RIGHT: pages + socials -->
        <div class="lg:col-span-5 grid grid-cols-2 gap-8 md:gap-12 lg:pl-8">
          <nav>
            <ul class="space-y-3 md:space-y-4">
              <li v-for="link in navLinks" :key="link.key">
                <NuxtLink
                  :to="localePath(link.path)"
                  class="footer-nav-link"
                  :data-cursor-label="t(`nav.${link.key}`)"
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
                :data-cursor-label="s.label.slice(0, 2).toUpperCase()"
              >
                {{ s.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Giant logotype — fully visible, viewport-spanning -->
    <div class="footer-logo-row px-6 md:px-10 pb-6 md:pb-10 select-none" aria-hidden="true">
      <div class="footer-logo font-display tracking-tight">AA2U</div>
    </div>

    <!-- Colophon -->
    <div class="px-6 md:px-10 py-5 md:py-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-white/55">
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
        <li>
          <a href="/sitemap.xml" class="footer-colophon-link">{{ t('footer.sitemap') }}</a>
        </li>
      </ul>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span>&copy; {{ currentYear }} {{ site?.studio_name || 'AA2U' }}</span>
        <span class="text-white/35">{{ t('footer.built_with') }}</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer { margin-top: 8rem; }

.footer-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  color: rgba(255, 255, 255, 0.4);
}
.footer-value {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  line-height: 1.55;
}

.footer-link {
  position: relative;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  line-height: 1.4;
  transition: color 0.25s ease;
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
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
.footer-link:hover { color: #fff; }
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
  transition: color 0.25s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
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
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.footer-nav-link:hover {
  color: var(--color-accent, #c0caf5);
}
.footer-nav-link:hover::after {
  transform: scaleX(1);
  transform-origin: left center;
}

.footer-arrow-btn {
  color: rgba(255, 255, 255, 0.7);
  transition: color 0.25s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.footer-arrow-btn:not(:disabled):hover {
  color: #fff;
  transform: translateX(4px);
}
.footer-arrow-btn:disabled {
  cursor: not-allowed;
}

.footer-logo-row {
  margin-top: 2rem;
}
.footer-logo {
  /* Fully visible, viewport-spanning. Tight letter-spacing fills width. */
  font-size: clamp(5rem, 28vw, 22rem);
  line-height: 0.9;
  letter-spacing: -0.045em;
  color: #fff;
  white-space: nowrap;
  text-align: left;
}
@media (min-width: 768px) {
  .footer-logo-row { margin-top: 3rem; }
  .footer-logo { letter-spacing: -0.055em; }
}

.footer-colophon-link {
  position: relative;
  color: inherit;
  transition: color 0.25s ease;
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
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.footer-colophon-link:hover { color: #fff; }
.footer-colophon-link:hover::after {
  transform: scaleX(1);
  transform-origin: left center;
}

.meta-enter-active,
.meta-leave-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.meta-enter-from { opacity: 0; transform: translateY(6px); }
.meta-leave-to   { opacity: 0; transform: translateY(-6px); }
</style>
