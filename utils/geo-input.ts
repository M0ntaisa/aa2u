/**
 * Admin helper: pull a lat/lng pair out of whatever the user pasted from
 * Google Maps — "-6.1754, 106.8272", a share URL ("…/@-6.1754,106.8272,17z"
 * or "…!3d-6.1754!4d106.8272"), or DMS ("6°10'31.4\"S 106°49'37.9\"E").
 * Returns null when nothing valid is found.
 */
export function parseLatLng(input: string): { lat: number; lng: number } | null {
  const text = (input ?? '').trim()
  if (!text) return null

  const valid = (lat: number, lng: number) =>
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng }
      : null

  // Place pin inside a Maps URL wins over the viewport centre (@lat,lng).
  const pin = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (pin) return valid(Number(pin[1]), Number(pin[2]))

  const dms = [...text.matchAll(/(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:\.\d+)?)["″]?\s*([NSEW])/gi)]
  if (dms.length === 2) {
    const toDeg = (m: RegExpMatchArray) => {
      const v = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600
      return /[SW]/i.test(m[4]!) ? -v : v
    }
    // Exactly one N/S part and one E/W part, in either order.
    const latPart = dms.find(m => /[NS]/i.test(m[4]!))
    const lngPart = dms.find(m => /[EW]/i.test(m[4]!))
    if (!latPart || !lngPart) return null
    return valid(toDeg(latPart), toDeg(lngPart))
  }
  if (dms.length) return null

  // Anchored so digits can't be borrowed from a longer number: a swapped
  // "115.08, -8.83" or a decimal-comma "-8,8291 115,0849" gives null
  // instead of a silently wrong point.
  const pair = text.match(/(?<![\d.])(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)(?![\d.])/)
  if (pair) return valid(Number(pair[1]), Number(pair[2]))

  return null
}
