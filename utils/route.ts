/**
 * True for the admin panel (`/admin`, `/admin/…`, `/en/admin…`) only.
 * A plain `includes('/admin')` also matched public slugs such as
 * `/work/administrasi-kantor`, which then lost the cursor + page transition.
 */
export const isAdminPath = (path: string): boolean =>
  /^\/(en\/)?admin(\/|$)/.test(path)
