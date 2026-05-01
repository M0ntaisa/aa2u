import { serverSupabaseServiceRole } from '#supabase/server'

interface InquiryBody {
  name?: string
  email?: string
  phone?: string
  project_type?: string
  message?: string
  locale?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<InquiryBody>(event)

  if (!body?.name?.trim() || !body?.email?.trim() || !body?.message?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'name, email, and message are required',
    })
  }

  // Don't try to call Supabase if the service role key isn't configured.
  // Lets the form succeed during local dev with placeholder credentials.
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!serviceKey) {
    return { ok: true, persisted: false }
  }

  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase.from('inquiries').insert({
    name: body.name.trim(),
    email: body.email.trim(),
    phone: body.phone?.trim() || null,
    project_type: body.project_type?.trim() || null,
    message: body.message.trim(),
    locale: body.locale ?? 'id',
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true, persisted: true }
})
