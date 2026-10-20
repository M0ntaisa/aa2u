<script setup lang="ts">
/**
 * Fact sheet (identity-dossier §2.4). A <dl>; a row is rendered only when
 * its data exists. Order: Location, Coordinates, Year, Status, Typology,
 * Site area, Built area, Client, Team, Collaborators, Photographer.
 *
 * variant="rail"    — the plain list for the sticky desktop rail.
 * variant="compact" — tablet/mobile: a MetaLine summary (Location, Year,
 *                     Status, Built area) above a closed <details>.
 *
 * Coordinates are the public, already rounded lat/lng from the API: they
 * are formatted and linked as-is and never derived from anything else.
 */
import type { Project } from '~/types/content'

const props = defineProps<{
  project: Project
  variant: 'rail' | 'compact'
}>()

const { t, locale } = useI18n()
const tt = useT()

interface Row {
  key: string
  label: string
  value: string
  /** Coordinates row: rendered as an OSM link. */
  map?: { href: string, text: string, spoken: string }
}

const dms = computed(() => formatDms(props.project.lat, props.project.lng))

/** Localised spoken form, e.g. "8 derajat 50 menit lintang selatan, …". */
const spokenDms = computed(() => {
  if (!dms.value) return ''
  const parts = [...dms.value.text.matchAll(/(\d+)°(\d+)′([NSEW])/g)]
  return parts
    .map(m => t('dossier.dms', { d: Number(m[1]), m: Number(m[2]), dir: t(`dossier.dir.${m[3]}`) }))
    .join(', ')
})

const rows = computed<Row[]>(() => {
  const p = props.project
  const out: Row[] = []
  const push = (key: string, value: string | undefined | null, extra: Partial<Row> = {}) => {
    if (value) out.push({ key, label: t(`dossier.facts.${key}`), value, ...extra })
  }
  push('location', tt(p.location))
  if (dms.value && typeof p.lat === 'number' && typeof p.lng === 'number') {
    push('coordinates', dms.value.text, {
      map: { href: dossierOsmUrl(p.lat, p.lng), text: dms.value.text, spoken: spokenDms.value },
    })
  }
  push('year', p.year ? String(p.year) : '')
  push('status', p.build_status ? t(`dossier.status.${p.build_status}`) : '')
  push('typology', p.category ? tt(p.category.name) : '')
  push('site_area', formatDossierArea(p.area_site_m2, locale.value))
  push('built_area', formatDossierArea(p.area_built_m2, locale.value))
  push('client', tt(p.client_label))
  push('team', p.team?.length ? p.team.join(', ') : '')
  push('partners', p.partners?.length ? p.partners.join(', ') : '')
  push('photographer', p.photographer)
  return out
})

const summary = computed(() =>
  ['location', 'year', 'status', 'built_area']
    .map(k => rows.value.find(r => r.key === k)?.value)
    .filter(Boolean) as string[],
)
</script>

<template>
  <div v-if="rows.length" class="facts" :class="`facts--${variant}`">
    <template v-if="variant === 'rail'">
      <h2 class="mono-s text-muted mb-2">{{ t('dossier.facts_title') }}</h2>
      <dl class="facts__list">
        <div v-for="row in rows" :key="row.key" class="facts__row">
          <dt class="mono-s text-muted">{{ row.label }}</dt>
          <dd>
            <a
              v-if="row.map"
              :href="row.map.href"
              target="_blank"
              rel="noopener"
              class="facts__map"
            >
              <span class="mono-s normal-case" aria-hidden="true">{{ row.map.text }}</span>
              <span class="sr-only">{{ row.map.spoken }}</span>
              <span aria-hidden="true">&nbsp;↗</span>
              <span class="sr-only"> {{ t('dossier.opens_map') }}</span>
            </a>
            <template v-else>{{ row.value }}</template>
          </dd>
        </div>
      </dl>
    </template>

    <template v-else>
      <p v-if="summary.length" class="mono-s text-fg-2 mb-3">
        <template v-for="(s, i) in summary" :key="i">
          <span v-if="i > 0" class="text-muted" aria-hidden="true"> · </span>{{ s }}
        </template>
      </p>
      <details class="facts__details">
        <summary class="facts__summary mono-s">
          <span>{{ t('dossier.facts_count', { n: rows.length }) }}</span>
          <span class="facts__plus" aria-hidden="true">+</span>
        </summary>
        <dl class="facts__list pb-2">
          <div v-for="row in rows" :key="row.key" class="facts__row">
            <dt class="mono-s text-muted">{{ row.label }}</dt>
            <dd>
              <a
                v-if="row.map"
                :href="row.map.href"
                target="_blank"
                rel="noopener"
                class="facts__map"
              >
                <span class="mono-s normal-case" aria-hidden="true">{{ row.map.text }}</span>
                <span class="sr-only">{{ row.map.spoken }}</span>
                <span aria-hidden="true">&nbsp;↗</span>
                <span class="sr-only"> {{ t('dossier.opens_map') }}</span>
              </a>
              <template v-else>{{ row.value }}</template>
            </dd>
          </div>
        </dl>
      </details>
    </template>
  </div>
</template>

<style scoped>
.facts__row {
  display: grid;
  grid-template-columns: minmax(6.5rem, 40%) 1fr;
  gap: .5rem;
  padding: .625rem 0;
  border-bottom: 1px solid var(--color-line);
  font-size: .875rem;
  line-height: 1.45;
}
.facts__row dt { padding-top: .125rem; }
.facts__row dd { margin: 0; color: var(--color-fg); min-width: 0; overflow-wrap: anywhere; }
.facts__map {
  text-decoration: underline;
  text-decoration-color: var(--color-line-strong);
  text-underline-offset: 3px;
  transition: text-decoration-color var(--d-1) var(--ease-draft);
}
.facts__map:hover { text-decoration-color: currentColor; }
.facts__map .mono-s { letter-spacing: 0; }

.facts__summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  border-top: 1px solid var(--color-line-strong);
  border-bottom: 1px solid var(--color-line);
  color: var(--color-fg);
}
.facts__summary::-webkit-details-marker { display: none; }
.facts__plus { font-size: 1rem; line-height: 1; transition: transform var(--d-2) var(--ease-draft); }
.facts__details[open] .facts__plus { transform: rotate(45deg); }
</style>
