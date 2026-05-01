import type { StudioPrinciple } from '~/types/content'

export const principles: StudioPrinciple[] = [
  {
    title: { id: 'Berpikir', en: 'Think' },
    description: {
      id: 'Setiap proyek dimulai dari pertanyaan, bukan jawaban.',
      en: 'Every project begins with a question, not an answer.',
    },
    sort_order: 0,
  },
  {
    title: { id: 'Merancang', en: 'Design' },
    description: {
      id: 'Garis-garis presisi yang melayani kehidupan sehari-hari.',
      en: 'Precise lines that serve everyday life.',
    },
    sort_order: 1,
  },
  {
    title: { id: 'Memodelkan', en: 'Model' },
    description: {
      id: 'BIM bukan sekadar software, tapi cara berpikir yang terkoordinasi.',
      en: 'BIM is not just software, but a coordinated way of thinking.',
    },
    sort_order: 2,
  },
  {
    title: { id: 'Membangun', en: 'Build' },
    description: {
      id: 'Detail di atas kertas harus selaras dengan apa yang berdiri di lapangan.',
      en: 'Detail on paper must align with what stands on site.',
    },
    sort_order: 3,
  },
]
