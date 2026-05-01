import type { TeamMember } from '~/types/content'

export const team: TeamMember[] = [
  {
    name: 'Aditya Pratama',
    role: { id: 'Co-Founder & Principal Architect', en: 'Co-Founder & Principal Architect' },
    bio: {
      id: 'Memimpin desain konseptual dengan latar belakang 12 tahun praktik arsitektur tropis.',
      en: 'Leads conceptual design with 12 years of tropical architecture practice.',
    },
    photo_url: 'https://picsum.photos/seed/aa2u-team-aditya/800/1000',
    social_linkedin: '#',
    is_active: true,
    sort_order: 0,
  },
  {
    name: 'Maya Sari',
    role: { id: 'Co-Founder & BIM Director', en: 'Co-Founder & BIM Director' },
    photo_url: 'https://picsum.photos/seed/aa2u-team-maya/800/1000',
    social_linkedin: '#',
    is_active: true,
    sort_order: 1,
  },
  {
    name: 'Rizky Hadi',
    role: { id: 'Senior Architect', en: 'Senior Architect' },
    photo_url: 'https://picsum.photos/seed/aa2u-team-rizky/800/1000',
    is_active: true,
    sort_order: 2,
  },
  {
    name: 'Tanti Wulandari',
    role: { id: 'Project Architect', en: 'Project Architect' },
    photo_url: 'https://picsum.photos/seed/aa2u-team-tanti/800/1000',
    is_active: true,
    sort_order: 3,
  },
  {
    name: 'Bima Nugroho',
    role: { id: 'BIM Specialist', en: 'BIM Specialist' },
    photo_url: 'https://picsum.photos/seed/aa2u-team-bima/800/1000',
    is_active: true,
    sort_order: 4,
  },
]
