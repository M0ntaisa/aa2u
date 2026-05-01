import type { Project, Category } from '~/types/content'

export const categories: Category[] = [
  { slug: 'residential', name: { id: 'Residensial', en: 'Residential' } },
  { slug: 'commercial',  name: { id: 'Komersial',   en: 'Commercial' } },
  { slug: 'cultural',    name: { id: 'Kultural',    en: 'Cultural' } },
  { slug: 'office',      name: { id: 'Perkantoran', en: 'Office' } },
  { slug: 'public',      name: { id: 'Publik',      en: 'Public' } },
]

const cat = (slug: string) => categories.find(c => c.slug === slug)!

export const projects: Project[] = [
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
    images: [
      { url: 'https://picsum.photos/seed/aa2u-rs1/1600/1000' },
      { url: 'https://picsum.photos/seed/aa2u-rs2/1600/1000' },
      { url: 'https://picsum.photos/seed/aa2u-rs3/1600/1000' },
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
    images: [
      { url: 'https://picsum.photos/seed/aa2u-pk1/1600/1000' },
      { url: 'https://picsum.photos/seed/aa2u-pk2/1600/1000' },
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
    images: [
      { url: 'https://picsum.photos/seed/aa2u-ss1/1600/1000' },
      { url: 'https://picsum.photos/seed/aa2u-ss2/1600/1000' },
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
  },
]

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
