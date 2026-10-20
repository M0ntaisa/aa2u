/**
 * True when `value` parses as an absolute http(s) URL. Used to keep
 * `javascript:` / `data:` and other schemes out of user-supplied links
 * (admin-entered socials) before they reach an href.
 */
export const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const { protocol } = new URL(value.trim())
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
