<script setup lang="ts">
import type { ProjectStatus } from '~/types/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const tt = useT()
const { data: projects, status: fetchStatus } = await useAdminProjects()

type StatusFilter = 'all' | ProjectStatus
type SortKey = 'sort_order' | 'title' | 'year' | 'status'

const search = ref('')
const statusFilter = ref<StatusFilter>('all')
const sortKey = ref<SortKey>('sort_order')
const sortAsc = ref(true)

const statusMeta: Record<ProjectStatus, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  published:      { label: 'Published',      tone: 'success' },
  in_development: { label: 'In development', tone: 'warning' },
  draft:          { label: 'Draft',          tone: 'neutral' },
}

const counts = computed(() => {
  const list = projects.value ?? []
  return {
    all: list.length,
    published: list.filter(p => p.status === 'published').length,
    in_development: list.filter(p => p.status === 'in_development').length,
    draft: list.filter(p => p.status === 'draft').length,
  }
})

const filters: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'published', label: 'Published' },
  { key: 'in_development', label: 'In development' },
  { key: 'draft', label: 'Draft' },
]

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = [...(projects.value ?? [])]

  if (statusFilter.value !== 'all') {
    list = list.filter(p => p.status === statusFilter.value)
  }

  if (q) {
    list = list.filter(p =>
      tt(p.title).toLowerCase().includes(q)
      || p.slug.toLowerCase().includes(q)
      || String(p.year ?? '').includes(q)
      || (p.category ? tt(p.category.name).toLowerCase().includes(q) : false),
    )
  }

  const dir = sortAsc.value ? 1 : -1
  return list.sort((a, b) => {
    switch (sortKey.value) {
      case 'title':  return tt(a.title).localeCompare(tt(b.title)) * dir
      case 'year':   return ((a.year ?? 0) - (b.year ?? 0)) * dir
      case 'status': return a.status.localeCompare(b.status) * dir
      default:       return ((a.sort_order ?? 0) - (b.sort_order ?? 0)) * dir
    }
  })
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
    return
  }
  sortKey.value = key
  sortAsc.value = true
}

function resetFilters() {
  search.value = ''
  statusFilter.value = 'all'
}

const hasFilters = computed(() => !!search.value.trim() || statusFilter.value !== 'all')
</script>

<template>
  <div class="mx-auto max-w-[1180px]">
    <AdminPageHeader title="Projek" description="Semua entri portofolio, termasuk draft.">
      <template #meta>
        <span class="text-[var(--ad-fg-subtle)]">·</span>
        <span>{{ counts.all }} total</span>
        <span class="text-[var(--ad-fg-subtle)]">·</span>
        <span>{{ counts.published }} published</span>
      </template>
      <template #actions>
        <AdminButton to="/admin/projects/new" variant="primary" icon="plus">Tambah projek</AdminButton>
      </template>
    </AdminPageHeader>

    <!-- Toolbar -->
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="cms-input-group max-w-xs flex-1">
        <span class="cms-input-group-icon"><AdminIcon name="search" :size="15" /></span>
        <input
          v-model="search"
          type="search"
          placeholder="Cari judul, slug, tahun…"
          class="cms-input"
          aria-label="Cari projek"
        />
      </div>

      <div class="cms-seg self-start lg:self-auto">
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          class="cms-seg-item"
          :aria-pressed="statusFilter === f.key"
          @click="statusFilter = f.key"
        >
          {{ f.label }}
          <span class="tabular-nums text-[var(--ad-fg-subtle)]">{{ counts[f.key] }}</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <AdminCard v-if="fetchStatus === 'pending'" flush>
      <div class="space-y-3 p-5">
        <div v-for="i in 5" :key="i" class="cms-skeleton h-10 w-full" />
      </div>
    </AdminCard>

    <!-- Table -->
    <AdminCard v-else-if="filtered.length" flush>
      <div class="cms-scroll overflow-x-auto">
        <table class="cms-table">
          <thead>
            <tr>
              <th class="w-14">
                <button type="button" class="flex items-center gap-1 hover:text-[var(--ad-fg)]" @click="toggleSort('sort_order')">
                  #
                  <AdminIcon v-if="sortKey === 'sort_order'" :name="sortAsc ? 'chevronUp' : 'chevronDown'" :size="11" />
                </button>
              </th>
              <th>
                <button type="button" class="flex items-center gap-1 hover:text-[var(--ad-fg)]" @click="toggleSort('title')">
                  Judul
                  <AdminIcon v-if="sortKey === 'title'" :name="sortAsc ? 'chevronUp' : 'chevronDown'" :size="11" />
                </button>
              </th>
              <th class="w-24">
                <button type="button" class="flex items-center gap-1 hover:text-[var(--ad-fg)]" @click="toggleSort('year')">
                  Tahun
                  <AdminIcon v-if="sortKey === 'year'" :name="sortAsc ? 'chevronUp' : 'chevronDown'" :size="11" />
                </button>
              </th>
              <th class="w-40">Kategori</th>
              <th class="w-36">
                <button type="button" class="flex items-center gap-1 hover:text-[var(--ad-fg)]" @click="toggleSort('status')">
                  Status
                  <AdminIcon v-if="sortKey === 'status'" :name="sortAsc ? 'chevronUp' : 'chevronDown'" :size="11" />
                </button>
              </th>
              <th class="w-20 text-center">Featured</th>
              <th class="w-20 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.slug">
              <td class="cms-table-num">{{ String((p.sort_order ?? 0) + 1).padStart(2, '0') }}</td>

              <td>
                <div class="flex items-center gap-3">
                  <div class="h-9 w-12 shrink-0 overflow-hidden rounded bg-[var(--ad-surface-sunk)]">
                    <img
                      v-if="p.cover_image"
                      :src="p.cover_image"
                      alt=""
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center text-[var(--ad-fg-subtle)]">
                      <AdminIcon name="image" :size="13" />
                    </div>
                  </div>
                  <div class="min-w-0">
                    <NuxtLink
                      :to="`/admin/projects/${p.slug}`"
                      class="block truncate font-medium hover:text-[var(--ad-accent)]"
                    >
                      {{ tt(p.title) || '(tanpa judul)' }}
                    </NuxtLink>
                    <span class="block truncate text-[11.5px] text-[var(--ad-fg-subtle)]">/{{ p.slug }}</span>
                  </div>
                </div>
              </td>

              <td class="cms-table-num">{{ p.year ?? '—' }}</td>

              <td class="text-[var(--ad-fg-muted)]">
                {{ p.category ? tt(p.category.name) : '—' }}
              </td>

              <td>
                <AdminBadge :tone="statusMeta[p.status].tone" dot>
                  {{ statusMeta[p.status].label }}
                </AdminBadge>
              </td>

              <td class="text-center">
                <AdminIcon
                  v-if="p.is_featured"
                  name="star"
                  :size="14"
                  class="mx-auto text-[var(--ad-warning)]"
                />
                <span v-else class="text-[var(--ad-fg-subtle)]">—</span>
              </td>

              <td class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <AdminButton
                    :href="`/work/${p.slug}`"
                    variant="ghost"
                    size="sm"
                    icon-only
                    icon="external"
                    label="Lihat di situs"
                  />
                  <AdminButton
                    :to="`/admin/projects/${p.slug}`"
                    variant="ghost"
                    size="sm"
                    icon-only
                    icon="edit"
                    label="Edit projek"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <p class="text-[12px] text-[var(--ad-fg-subtle)]">
          Menampilkan {{ filtered.length }} dari {{ counts.all }} projek.
          Urutan tampil di situs mengikuti kolom <span class="cms-kbd">#</span>.
        </p>
      </template>
    </AdminCard>

    <!-- Empty -->
    <AdminEmptyState
      v-else-if="hasFilters"
      icon="search"
      title="Tidak ada projek yang cocok"
      description="Coba kata kunci lain atau ganti filter status."
    >
      <AdminButton variant="secondary" size="sm" icon="refresh" @click="resetFilters">
        Reset filter
      </AdminButton>
    </AdminEmptyState>

    <AdminEmptyState
      v-else
      icon="projects"
      title="Belum ada projek"
      description="Portofolio masih kosong. Tambahkan entri pertama untuk mulai mengisi halaman /work."
    >
      <AdminButton to="/admin/projects/new" variant="primary" size="sm" icon="plus">
        Tambah projek
      </AdminButton>
    </AdminEmptyState>
  </div>
</template>
