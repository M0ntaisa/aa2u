// Mirrors the Supabase schema. Translatable fields use I18nField.

export type Locale = 'id' | 'en'

export interface I18nField {
  id: string
  en: string
}

export interface I18nList {
  id: string[]
  en: string[]
}

export type ProjectStatus = 'draft' | 'in_development' | 'published'

export interface ProjectImage {
  url: string
  alt?: I18nField
  caption?: I18nField
}

export interface Category {
  slug: string
  name: I18nField
}

export interface Project {
  slug: string
  title: I18nField
  year?: number
  location?: I18nField
  category?: Category
  status: ProjectStatus
  partners?: string[]
  description?: I18nField
  process_note?: I18nField
  services_performed?: I18nList
  cover_image: string
  is_featured?: boolean
  sort_order: number
  images?: ProjectImage[]
}

export interface TeamMember {
  name: string
  role: I18nField
  bio?: I18nField
  photo_url?: string
  social_linkedin?: string
  social_instagram?: string
  is_active?: boolean
  sort_order: number
}

export interface StudioPrinciple {
  title: I18nField
  description?: I18nField
  sort_order: number
}

export interface SiteSettings {
  studio_name: string
  tagline?: I18nField
  manifesto?: I18nField
  contact_email?: string
  contact_phone?: string
  address?: I18nField
  socials?: {
    instagram?: string
    linkedin?: string
    behance?: string
  }
}
