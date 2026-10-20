import type {
  Category, Chapter, DrawingKind, I18nField, ImageLayout, Project, ProjectDrawingRow,
  ProjectImageRow, ProjectMaterialRow, ProjectRow,
} from '~/types/content'
import { mapProjectRow } from '~/utils/project-mapper'

export const categories: Category[] = [
  { slug: 'residential', name: { id: 'Residensial', en: 'Residential' } },
  { slug: 'commercial',  name: { id: 'Komersial',   en: 'Commercial' } },
  { slug: 'cultural',    name: { id: 'Kultural',    en: 'Cultural' } },
  { slug: 'office',      name: { id: 'Perkantoran', en: 'Office' } },
  { slug: 'public',      name: { id: 'Publik',      en: 'Public' } },
]

const cat = (slug: string) => categories.find(c => c.slug === slug)!

// Small builders so each dossier below stays readable.
const i18n = (id: string, en: string): I18nField => ({ id, en })
const img = (
  seed: string, chapter: Chapter, layout: ImageLayout = 'auto',
  width = 1600, height = 1000, alt?: I18nField, caption?: I18nField,
): ProjectImageRow => ({
  url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
  chapter, layout, width, height, alt, caption,
})
const drw = (
  file: string, kind: DrawingKind, sort_order: number,
  caption: I18nField, extra: Partial<ProjectDrawingRow> = {},
): ProjectDrawingRow => ({
  url: `/dummy/drawings/${file}`, kind, caption, alt: caption, sort_order, ...extra,
})
const mat = (seed: string, sort_order: number, name: I18nField, note?: I18nField): ProjectMaterialRow => ({
  name, note, image: `https://picsum.photos/seed/${seed}/800/800`, sort_order,
})

/**
 * Rows in the same shape the anon key reads from Supabase (ProjectRow),
 * mapped below with the same mapProjectRow() as live mode. Like the
 * public DB columns, lat/lng are already rounded to 2 decimals (null when
 * hide_location) and client_name_public is only set when client_mode is
 * 'name' — exact coordinates and private client names are not stored
 * anywhere in the dummy data.
 */
export const projectRows: ProjectRow[] = [
  {
    slug: 'rumah-selat',
    title: { id: 'Rumah Selat', en: 'Strait House' },
    year: 2024,
    location: { id: 'Bali, Indonesia', en: 'Bali, Indonesia' },
    category: cat('residential'),
    status: 'published',
    partners: ['Studio Tanah'],
    description: {
      id: 'Sebuah rumah yang menyatu dengan kontur tebing menghadap selat. Ruang-ruangnya bergerak mengikuti angin dan cahaya, sementara material lokal mengikat bangunan pada tempatnya.',
      en: 'A house that merges with the cliff contour facing the strait. Its spaces flow with the wind and light while local materials anchor the building to its place.',
    },
    process_note: {
      id: 'Setiap garis dirancang untuk mengikuti topografi tanpa memaksanya. Sebuah dialog antara struktur dan lanskap.',
      en: 'Every line follows the topography without forcing it — a dialogue between structure and landscape.',
    },
    services_performed: {
      id: ['Konsultasi awal', 'Desain skematik & DED', 'Pengawasan konstruksi'],
      en: ['Initial consultation', 'Schematic design & DED', 'Construction supervision'],
    },
    cover_image: 'https://picsum.photos/seed/aa2u-rumahselat/1600/1000',
    is_featured: true,
    sort_order: 0,
    build_status: 'completed',
    area_site_m2: 2800,
    area_built_m2: 1240,
    client_mode: 'private',
    team: ['A. Wibowo', 'R. Sari'],
    photographer: 'Mario Wibowo',
    lat: -8.83,
    lng: 115.08,
    chapter_text: {
      site: i18n(
        'Tebing kapur setinggi 70 meter di atas selat, dengan angin barat daya yang konstan dan vegetasi kering yang rapuh.',
        'A 70-metre limestone cliff above the strait, with a constant south-west wind and fragile dry vegetation.',
      ),
      concept: i18n(
        'Tiga lantai bertingkat mengikuti kontur, masing-masing berorientasi pada satu pandangan dan satu arah angin.',
        'Three stepped floors follow the contour, each oriented to one view and one wind direction.',
      ),
      plan: i18n(
        'Ruang hidup terbuka di antara dua dinding batu masif; kamar tidur terselip di balik tebing.',
        'Open living space between two massive stone walls; bedrooms tucked behind the cliff.',
      ),
      section: i18n(
        'Potongan memperlihatkan atap yang miring mengikuti tebing dan ruang bawah yang tertanam di batu.',
        'The section shows a roof that slopes with the cliff and a lower level set into the rock.',
      ),
      material: i18n(
        'Batu paras dari tapak, kayu ulin bekas dermaga, dan teraso dengan agregat pantai.',
        'Paras stone from the site, reclaimed ulin timber from an old jetty, and terrazzo with beach aggregate.',
      ),
      built: i18n('Selesai pada 2024 setelah 22 bulan konstruksi.', 'Completed in 2024 after 22 months on site.'),
    },
    drawings: [
      drw('plan-a.svg', 'plan', 0, i18n('Denah lantai dasar', 'Ground floor plan'), { scale: '1:200', level: 'Level 1' }),
      drw('section-a.svg', 'section', 1, i18n('Potongan A–A', 'Section A–A'), { scale: '1:100' }),
    ],
    materials: [
      mat('aa2u-m-paras', 0, i18n('Batu paras Kerobokan', 'Paras Kerobokan stone'), i18n('Ditambang 12 km dari tapak, finishing bakar.', 'Quarried 12 km from site, flamed finish.')),
      mat('aa2u-m-ulin', 1, i18n('Kayu ulin daur ulang', 'Reclaimed ulin timber'), i18n('Dari dermaga lama di Benoa.', 'From an old jetty in Benoa.')),
      mat('aa2u-m-terrazzo', 2, i18n('Teraso agregat pantai', 'Beach-aggregate terrazzo'), i18n('Dicor di tempat, dipoles matte.', 'Cast in place, honed matte.')),
    ],
    images: [
      img('aa2u-rs1', 'site', 'wide', 1600, 1000, i18n('Tebing di atas selat', 'The cliff above the strait'), i18n('Tapak sebelum konstruksi.', 'The site before construction.')),
      img('aa2u-rs2', 'concept', 'inset', 1600, 1000, i18n('Maket studi massa', 'Massing study model')),
      img('aa2u-rs3', 'built', 'full', 1600, 1000, i18n('Fasad barat saat senja', 'West façade at dusk')),
      img('aa2u-rs4', 'built', 'tall', 1000, 1400, i18n('Tangga batu', 'Stone stair')),
      img('aa2u-rs5', 'built', 'auto', 1600, 1000, i18n('Ruang keluarga', 'Living room')),
      img('aa2u-rs6', 'built', 'auto', 1600, 1000, i18n('Teras atas', 'Upper terrace')),
    ],
  },
  {
    slug: 'paviliun-kemang',
    title: { id: 'Paviliun Kemang', en: 'Kemang Pavilion' },
    year: 2024,
    location: { id: 'Jakarta Selatan', en: 'South Jakarta' },
    category: cat('public'),
    status: 'published',
    description: {
      id: 'Paviliun publik untuk kegiatan komunitas dengan struktur baja ringan dan atap layar yang membayangi tanpa membatasi.',
      en: 'A public pavilion for community events, built with light steel and a sail-like roof that shades without enclosing.',
    },
    services_performed: {
      id: ['Perencanaan tapak', 'Desain arsitektur', 'BIM modeling'],
      en: ['Site planning', 'Architectural design', 'BIM modeling'],
    },
    cover_image: 'https://picsum.photos/seed/aa2u-paviliun/1600/1000',
    is_featured: true,
    sort_order: 1,
    build_status: 'completed',
    area_site_m2: 1600,
    area_built_m2: 420,
    client_mode: 'name',
    client_name_public: 'Yayasan Ruang Kemang',
    team: ['D. Prasetyo', 'N. Halim'],
    photographer: 'Studio Lensa',
    lat: -6.26,
    lng: 106.81,
    chapter_text: {
      site: i18n('Lahan sisa di antara dua jalan kampung, teduh oleh tiga pohon trembesi.', 'A leftover plot between two kampung lanes, shaded by three rain trees.'),
      concept: i18n('Satu atap layar yang mengambang, tanpa dinding, agar pavilion tetap milik jalan.', 'A single floating sail roof without walls, so the pavilion still belongs to the street.'),
    },
    drawings: [
      drw('site-plan.svg', 'site_plan', 0, i18n('Rencana tapak', 'Site plan'), { scale: '1:500' }),
      drw('section-b.svg', 'section', 1, i18n('Potongan memanjang', 'Long section'), { scale: '1:100' }),
    ],
    materials: [
      mat('aa2u-m-corten', 0, i18n('Baja tahan cuaca', 'Weathering steel'), i18n('Kolom dan rangka atap.', 'Columns and roof frame.')),
      mat('aa2u-m-ptfe', 1, i18n('Membran PTFE', 'PTFE membrane'), i18n('Translusen, 12% transmisi cahaya.', 'Translucent, 12% light transmission.')),
      mat('aa2u-m-brick', 2, i18n('Bata daur ulang', 'Recycled brick'), i18n('Dari bongkaran rumah di tapak.', 'From the house previously on site.')),
    ],
    images: [
      img('aa2u-pk1', 'site', 'wide'),
      img('aa2u-pk2', 'built', 'auto'),
    ],
  },
  {
    slug: 'studio-senopati',
    title: { id: 'Studio Senopati', en: 'Senopati Studio' },
    year: 2023,
    location: { id: 'Jakarta', en: 'Jakarta' },
    category: cat('office'),
    status: 'published',
    description: {
      id: 'Renovasi gedung kantor 1980-an menjadi ruang kerja kreatif. Kami menyimpan kerangka beton brutalis dan menambahkan layer kaca yang transparan.',
      en: 'A 1980s office building reborn as a creative workspace. We preserved the brutalist concrete frame and added a transparent glass layer.',
    },
    services_performed: {
      id: ['Penilaian struktur', 'Renovasi & adaptasi', 'Desain interior'],
      en: ['Structural assessment', 'Renovation & adaptation', 'Interior design'],
    },
    cover_image: 'https://picsum.photos/seed/aa2u-senopati/1600/1000',
    is_featured: true,
    sort_order: 2,
    build_status: 'completed',
    area_site_m2: 900,
    area_built_m2: 2100,
    client_mode: 'alias',
    client_alias: i18n('Rumah produksi independen', 'An independent production house'),
    team: ['A. Wibowo', 'T. Lestari', 'B. Kurnia'],
    photographer: 'Mario Wibowo',
    lat: -6.23,
    lng: 106.81,
    chapter_text: {
      concept: i18n('Menyimpan semua yang beton, mengganti semua yang bukan.', 'Keep everything concrete, replace everything that is not.'),
      material: i18n('Beton ekspos asli 1984, kaca rendah besi, dan lantai kayu ek.', 'Original 1984 exposed concrete, low-iron glass and oak floors.'),
    },
    drawings: [
      drw('plan-b.svg', 'plan', 0, i18n('Denah lantai 2', 'Level 2 plan'), { scale: '1:200', level: '+3.60' }),
      drw('section-b.svg', 'elevation', 1, i18n('Tampak timur', 'East elevation'), { scale: '1:200' }),
    ],
    materials: [
      mat('aa2u-m-concrete', 0, i18n('Beton ekspos', 'Exposed concrete'), i18n('Struktur asli, dibersihkan dengan sandblast ringan.', 'Original frame, lightly sandblasted.')),
      mat('aa2u-m-glass', 1, i18n('Kaca rendah besi', 'Low-iron glass'), i18n('Fasad lapis kedua.', 'Second-skin façade.')),
      mat('aa2u-m-oak', 2, i18n('Kayu ek', 'Oak'), i18n('Lantai dan meja kerja.', 'Floors and workbenches.')),
    ],
    images: [
      img('aa2u-ss1', 'concept', 'inset'),
      img('aa2u-ss2', 'built', 'auto'),
    ],
  },
  {
    slug: 'vila-ubud',
    title: { id: 'Vila Ubud', en: 'Ubud Villa' },
    year: 2023,
    location: { id: 'Ubud, Bali', en: 'Ubud, Bali' },
    category: cat('residential'),
    status: 'published',
    partners: ['Arch. Putri Maharani'],
    description: {
      id: 'Sebuah vila yang menyembunyikan dirinya di antara terasering sawah, dengan kolam refleksi yang melanjutkan garis horizon.',
      en: 'A villa hidden among rice terraces, with a reflection pool extending the horizon.',
    },
    services_performed: {
      id: ['Desain konsep', 'Dokumentasi konstruksi', 'Lansekap'],
      en: ['Concept design', 'Construction documentation', 'Landscape'],
    },
    cover_image: 'https://picsum.photos/seed/aa2u-ubud/1600/1000',
    is_featured: true,
    sort_order: 3,
    build_status: 'construction',
    area_site_m2: 3500,
    area_built_m2: 680,
    client_mode: 'private',
    team: ['R. Sari'],
    photographer: 'Mario Wibowo',
    // Location hidden by the admin: the public row carries no coordinates.
    hide_location: true,
    lat: null,
    lng: null,
    chapter_text: {
      site: i18n('Terasering sawah yang masih digarap; vila tidak boleh memutus aliran subak.', 'Rice terraces still in use; the villa must not cut the subak water flow.'),
      concept: i18n('Bangunan sebagai tanggul: rendah, panjang, dan ditanami.', 'The building as an embankment: low, long and planted.'),
    },
    drawings: [
      drw('plan-cad.svg', 'plan', 0, i18n('Denah (ekspor CAD)', 'Plan (CAD export)'), { scale: '1:200', invert: true }),
      drw('diagram.svg', 'diagram', 1, i18n('Diagram aliran air', 'Water-flow diagram')),
    ],
    materials: [
      mat('aa2u-m-alang', 0, i18n('Atap alang-alang', 'Alang-alang thatch'), i18n('Dipasang tukang lokal Tegallalang.', 'Laid by Tegallalang craftsmen.')),
      mat('aa2u-m-riverstone', 1, i18n('Batu kali', 'River stone'), i18n('Dari Sungai Ayung.', 'From the Ayung river.')),
      mat('aa2u-m-teak', 2, i18n('Jati', 'Teak'), i18n('Bersertifikat SVLK.', 'SVLK-certified.')),
    ],
  },
  {
    slug: 'galeri-kuningan',
    title: { id: 'Galeri Kuningan', en: 'Kuningan Gallery' },
    year: 2022,
    location: { id: 'Jakarta', en: 'Jakarta' },
    category: cat('cultural'),
    status: 'published',
    description: {
      id: 'Galeri seni kontemporer dengan dinding putih yang dapat dikonfigurasi ulang dan pencahayaan alami terkontrol melalui clerestory.',
      en: 'A contemporary art gallery with reconfigurable white walls and natural light controlled via clerestory windows.',
    },
    cover_image: 'https://picsum.photos/seed/aa2u-galeri/1600/1000',
    is_featured: true,
    sort_order: 4,
    build_status: 'completed',
    area_built_m2: 1450,
    client_mode: 'name',
    client_name_public: 'Yayasan Seni Kuningan',
    team: ['T. Lestari', 'D. Prasetyo'],
    photographer: 'Studio Lensa',
    lat: -6.23,
    lng: 106.83,
    chapter_text: {
      concept: i18n('Cahaya dari atas, dinding yang bisa berpindah, dan tidak ada jendela ke jalan.', 'Light from above, walls that move, and no windows to the street.'),
      section: i18n('Clerestory utara memantulkan cahaya dua kali sebelum mencapai dinding pamer.', 'North clerestories bounce light twice before it reaches the hanging walls.'),
    },
    drawings: [
      drw('plan-a.svg', 'plan', 0, i18n('Denah galeri', 'Gallery plan'), { scale: '1:200' }),
      drw('section-a.svg', 'section', 1, i18n('Potongan clerestory', 'Clerestory section'), { scale: '1:50' }),
    ],
    materials: [
      mat('aa2u-m-lime', 0, i18n('Plester kapur', 'Lime plaster'), i18n('Dinding pamer, putih alami.', 'Hanging walls, natural white.')),
      mat('aa2u-m-polished', 1, i18n('Beton poles', 'Polished concrete'), i18n('Lantai dengan pemanas pasif.', 'Floor slab with passive cooling.')),
      mat('aa2u-m-oak2', 2, i18n('Ek berasap', 'Smoked oak'), i18n('Bangku dan kusen.', 'Benches and frames.')),
    ],
  },
  {
    slug: 'kafe-bandung',
    title: { id: 'Kafe Bandung', en: 'Bandung Café' },
    year: 2022,
    location: { id: 'Bandung', en: 'Bandung' },
    category: cat('commercial'),
    status: 'published',
    description: {
      id: 'Kafe dengan rangka kayu lokal dan jendela panjang yang membingkai pegunungan Parahyangan.',
      en: 'A café with local timber framing and long windows that frame the Parahyangan mountains.',
    },
    cover_image: 'https://picsum.photos/seed/aa2u-bandung/1600/1000',
    is_featured: true,
    sort_order: 5,
  },
  {
    slug: 'rumah-nuansa',
    title: { id: 'Rumah Nuansa', en: 'Nuansa House' },
    year: 2021,
    location: { id: 'Yogyakarta', en: 'Yogyakarta' },
    category: cat('residential'),
    status: 'published',
    description: {
      id: 'Rumah keluarga dengan courtyard pusat yang membawa langit ke dalam ruang harian.',
      en: 'A family home centered on a courtyard that brings the sky into daily life.',
    },
    cover_image: 'https://picsum.photos/seed/aa2u-nuansa/1600/1000',
    is_featured: true,
    sort_order: 6,
    build_status: 'completed',
    area_site_m2: 450,
    area_built_m2: 320,
    client_mode: 'private',
    team: ['B. Kurnia', 'N. Halim'],
    lat: -7.8,
    lng: 110.37,
    chapter_text: {
      plan: i18n('Semua ruang menghadap courtyard; koridor adalah teras.', 'Every room faces the courtyard; the corridor is a veranda.'),
    },
    drawings: [
      drw('plan-b.svg', 'plan', 0, i18n('Denah dengan courtyard', 'Plan with courtyard'), { scale: '1:100' }),
      drw('diagram.svg', 'axonometric', 1, i18n('Aksonometri', 'Axonometric')),
    ],
    materials: [
      mat('aa2u-m-redbrick', 0, i18n('Bata merah ekspos', 'Exposed red brick'), i18n('Dari Godean.', 'From Godean.')),
      mat('aa2u-m-bengkirai', 1, i18n('Kayu bengkirai', 'Bengkirai timber'), i18n('Kisi-kisi dan pintu.', 'Screens and doors.')),
      mat('aa2u-m-terracotta', 2, i18n('Ubin terakota', 'Terracotta tiles'), i18n('Courtyard dan teras.', 'Courtyard and veranda.')),
    ],
  },
  {
    slug: 'apartemen-cipete',
    title: { id: 'Apartemen Cipete', en: 'Cipete Apartments' },
    year: 2021,
    location: { id: 'Jakarta Selatan', en: 'South Jakarta' },
    category: cat('residential'),
    status: 'in_development',
    description: {
      id: 'Apartemen 12 lantai dengan fasad bernapas — bilah aluminium yang merespons sudut matahari.',
      en: 'A 12-storey apartment with a breathing façade — aluminum fins that respond to the sun angle.',
    },
    cover_image: 'https://picsum.photos/seed/aa2u-cipete/1600/1000',
    is_featured: false,
    sort_order: 7,
    build_status: 'design',
    area_site_m2: 2200,
    area_built_m2: 18400,
    client_mode: 'alias',
    client_alias: i18n('Pengembang swasta', 'Private developer'),
    team: ['A. Wibowo', 'D. Prasetyo'],
    lat: -6.27,
    lng: 106.8,
    drawings: [
      drw('site-plan.svg', 'site_plan', 0, i18n('Rencana tapak', 'Site plan'), { scale: '1:1000' }),
      drw('section-a.svg', 'section', 1, i18n('Potongan tipikal', 'Typical section'), { scale: '1:200' }),
    ],
    materials: [
      mat('aa2u-m-alu', 0, i18n('Bilah aluminium', 'Aluminium fins'), i18n('Anodized, sudut 35°.', 'Anodised, set at 35°.')),
      mat('aa2u-m-precast', 1, i18n('Beton pracetak', 'Precast concrete'), i18n('Panel fasad.', 'Façade panels.')),
      mat('aa2u-m-glass2', 2, i18n('Kaca laminasi', 'Laminated glass'), i18n('Balkon.', 'Balconies.')),
    ],
  },
]

/** Public shape, built with the same mapper as live Supabase rows. */
export const projects: Project[] = projectRows.map(mapProjectRow)

/** Admin form in placeholder mode reads the row (client_mode, alias, …). */
export const projectRowBySlug = (slug: string) =>
  projectRows.find(p => p.slug === slug)

export const featuredProjects = () =>
  projects
    .filter(p => p.is_featured && p.status === 'published')
    .sort((a, b) => a.sort_order - b.sort_order)

export const publishedProjects = () =>
  projects
    .filter(p => p.status === 'published')
    .sort((a, b) => a.sort_order - b.sort_order)

export const projectBySlug = (slug: string) =>
  projects.find(p => p.slug === slug)
