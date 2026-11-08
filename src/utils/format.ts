/** Presentation-only helpers. Nothing here interprets a value, only renders it. */

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : DATE_TIME.format(parsed)
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value).getTime()
  if (Number.isNaN(parsed)) return '—'
  const minutes = Math.round((Date.now() - parsed) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function formatBounty(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount) : amount
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `฿${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

/** Similarity arrives as a DECIMAL, which PostgREST serialises as a string. */
export function formatSimilarity(score: number | string | null | undefined): string {
  const value = typeof score === 'string' ? Number(score) : score
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

/**
 * `sighted_location` comes back as PostGIS text. ST_AsText gives POINT(lon lat)
 * and GeoJSON gives {coordinates:[lon,lat]}; both are shown lat, lon because
 * that is the order every map tool takes when pasted.
 */
export function parseLocationStr(location: string | null | undefined): { lat: number, lng: number } | null {
  if (!location) return null
  const wkt = /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(location)
  if (wkt) return { lat: Number(wkt[2]), lng: Number(wkt[1]) }
  
  // EWKB Point (50 hex chars)
  if (location.length === 50 && /^[0-9A-Fa-f]+$/.test(location)) {
    try {
      const buf = new Uint8Array(location.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
      const view = new DataView(buf.buffer)
      return { lng: view.getFloat64(9, true), lat: view.getFloat64(17, true) }
    } catch {}
  }

  try {
    const parsed = JSON.parse(location) as { coordinates?: number[] }
    const [lon, lat] = parsed.coordinates ?? []
    if (typeof lat === 'number' && typeof lon === 'number') {
      return { lat, lng: lon }
    }
  } catch {}
  
  return null
}

export function formatLocation(location: string | null | undefined): string {
  const coords = parseLocationStr(location)
  if (coords) return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
  return location || '—'
}

export function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : '—'
}
