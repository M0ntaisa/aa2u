/**
 * Serialize a JSON-LD object for injection into a
 * `<script type="application/ld+json">` via innerHTML.
 *
 * JSON.stringify leaves `<` untouched, so CMS content containing
 * `</script>` could break out of the tag. Escaping it as `\u003c` keeps
 * the JSON identical once parsed.
 */
export const jsonLd = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c')
