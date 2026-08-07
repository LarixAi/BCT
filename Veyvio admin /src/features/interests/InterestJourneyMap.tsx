import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { veyvioMapStyle } from '@/features/live-operations/map/veyvioMapStyle'
import type { JourneyRequestFields } from '@/lib/interests/journey-request'
import { displayValue } from '@/lib/interests/journey-request'

const MAP_HEIGHT_PX = 380
const LONDON: [number, number] = [-0.1278, 51.5074]
const ROUTE_SOURCE = 'interest-journey-route'
const ROUTE_LAYER = 'interest-journey-route-line'
const ROUTE_CASING = 'interest-journey-route-casing'

type JourneyMapPoint = {
  lng: number
  lat: number
  label: string
  kind: 'pickup' | 'dropoff'
}

type ResolvedRoute = {
  points: JourneyMapPoint[]
  coordinates: [number, number][]
  distanceM: number | null
  durationS: number | null
  routed: boolean
}

function parseCoordPair(value: string | null | undefined): { lng: number; lat: number } | null {
  const text = displayValue(value)
  if (!text) return null
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const a = Number(match[1])
  const b = Number(match[2])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  // Stored as "lat, lng" in CoLoop payloads.
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b }
  if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return { lat: b, lng: a }
  return null
}

async function geocodeUkAddress(query: string): Promise<{ lng: number; lat: number } | null> {
  const q = query.trim()
  if (q.length < 3) return null
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '1')
  url.searchParams.set('lang', 'en')
  url.searchParams.set('lat', '51.5074')
  url.searchParams.set('lon', '-0.1278')

  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!response.ok) return null
  const body = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>
  }
  const coords = body.features?.[0]?.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const [lng, lat] = coords
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return { lng, lat }
}

async function fetchDrivingRoute(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
): Promise<{ coordinates: [number, number][]; distanceM: number; durationS: number } | null> {
  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url =
    `https://router.project-osrm.org/route/v1/driving/${path}` +
    '?overview=full&geometries=geojson&steps=false'
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) return null
  const body = (await response.json()) as {
    code?: string
    routes?: Array<{
      distance?: number
      duration?: number
      geometry?: { coordinates?: [number, number][] }
    }>
  }
  if (body.code !== 'Ok' || !body.routes?.[0]?.geometry?.coordinates?.length) return null
  const route = body.routes[0]
  return {
    coordinates: route.geometry!.coordinates!,
    distanceM: Number(route.distance ?? 0),
    durationS: Number(route.duration ?? 0),
  }
}

function markerElement(kind: 'pickup' | 'dropoff', label: string) {
  const el = document.createElement('div')
  el.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;'

  const pin = document.createElement('div')
  pin.textContent = kind === 'pickup' ? 'A' : 'B'
  pin.style.cssText = [
    'width:30px',
    'height:30px',
    'border-radius:999px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'font:700 12px/1 Inter, system-ui, sans-serif',
    'color:#fff',
    `background:${kind === 'pickup' ? '#2F6BFF' : '#0B1526'}`,
    'border:2px solid #fff',
    'box-shadow:0 2px 8px rgba(11,21,38,0.28)',
  ].join(';')

  const caption = document.createElement('div')
  caption.textContent = label
  caption.style.cssText = [
    'max-width:150px',
    'padding:2px 6px',
    'border-radius:6px',
    'background:rgba(255,255,255,0.94)',
    'border:1px solid rgba(15,23,42,0.08)',
    'font:600 10px/1.2 Inter, system-ui, sans-serif',
    'color:#0B1526',
    'text-align:center',
    'white-space:nowrap',
    'overflow:hidden',
    'text-overflow:ellipsis',
  ].join(';')

  el.append(pin, caption)
  return el
}

function formatDistance(meters: number | null): string | null {
  if (meters == null || !Number.isFinite(meters) || meters <= 0) return null
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null
  const mins = Math.max(1, Math.round(seconds / 60))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

function scheduleResize(map: maplibregl.Map) {
  map.resize()
  requestAnimationFrame(() => map.resize())
  window.setTimeout(() => map.resize(), 120)
}

function setRouteOnMap(map: maplibregl.Map, coordinates: [number, number][]) {
  const line: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  }
  if (map.getSource(ROUTE_SOURCE)) {
    ;(map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource).setData(line)
    return
  }
  map.addSource(ROUTE_SOURCE, { type: 'geojson', data: line })
  map.addLayer({
    id: ROUTE_CASING,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#ffffff',
      'line-width': 8,
      'line-opacity': 0.95,
    },
  })
  map.addLayer({
    id: ROUTE_LAYER,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#2F6BFF',
      'line-width': 4.5,
      'line-opacity': 0.95,
    },
  })
}

export function InterestJourneyMap({ journey }: { journey: JourneyRequestFields }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [route, setRoute] = useState<ResolvedRoute | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const pickupLabel = displayValue(journey.pickup)
  const destinationLabel = displayValue(journey.destination)
  const lookupKey = useMemo(
    () =>
      [
        journey.pickupCoords ?? '',
        journey.destinationCoords ?? '',
        pickupLabel ?? '',
        destinationLabel ?? '',
      ].join('|'),
    [journey.pickupCoords, journey.destinationCoords, pickupLabel, destinationLabel],
  )

  useEffect(() => {
    let cancelled = false

    async function resolveRoute() {
      setStatus('loading')
      setError(null)

      const points: JourneyMapPoint[] = []

      const pickupParsed = parseCoordPair(journey.pickupCoords)
      if (pickupParsed) {
        points.push({ ...pickupParsed, label: 'Pickup', kind: 'pickup' })
      } else if (pickupLabel) {
        const geo = await geocodeUkAddress(pickupLabel).catch(() => null)
        if (geo) points.push({ ...geo, label: 'Pickup', kind: 'pickup' })
      }

      const dropParsed = parseCoordPair(journey.destinationCoords)
      if (dropParsed) {
        points.push({ ...dropParsed, label: 'Drop-off', kind: 'dropoff' })
      } else if (destinationLabel) {
        const geo = await geocodeUkAddress(destinationLabel).catch(() => null)
        if (geo) points.push({ ...geo, label: 'Drop-off', kind: 'dropoff' })
      }

      if (cancelled) return

      if (points.length === 0) {
        setRoute(null)
        setStatus('empty')
        setError('Map needs a pickup or destination address to plot.')
        return
      }

      if (points.length === 1) {
        setRoute({
          points,
          coordinates: [[points[0].lng, points[0].lat]],
          distanceM: null,
          durationS: null,
          routed: false,
        })
        setStatus('ready')
        return
      }

      const [from, to] = points
      const driving = await fetchDrivingRoute(from, to).catch(() => null)
      if (cancelled) return

      if (driving?.coordinates?.length) {
        setRoute({
          points,
          coordinates: driving.coordinates,
          distanceM: driving.distanceM,
          durationS: driving.durationS,
          routed: true,
        })
      } else {
        setRoute({
          points,
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
          distanceM: null,
          durationS: null,
          routed: false,
        })
      }
      setStatus('ready')
    }

    void resolveRoute().catch(() => {
      if (cancelled) return
      setStatus('error')
      setError('Could not map this journey route.')
    })

    return () => {
      cancelled = true
    }
  }, [lookupKey, journey.pickupCoords, journey.destinationCoords, pickupLabel, destinationLabel])

  useEffect(() => {
    if (!containerRef.current || status !== 'ready' || !route || route.points.length === 0) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: veyvioMapStyle,
      center: [route.points[0].lng, route.points[0].lat],
      zoom: 12,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    const onReady = () => {
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []

      const bounds = new maplibregl.LngLatBounds()
      for (const point of route.points) {
        bounds.extend([point.lng, point.lat])
        markersRef.current.push(
          new maplibregl.Marker({
            element: markerElement(point.kind, point.label),
            anchor: 'bottom',
          })
            .setLngLat([point.lng, point.lat])
            .addTo(map),
        )
      }

      if (route.coordinates.length >= 2) {
        setRouteOnMap(map, route.coordinates)
        for (const coord of route.coordinates) bounds.extend(coord)
      }

      if (route.points.length === 1) {
        map.jumpTo({ center: [route.points[0].lng, route.points[0].lat], zoom: 14 })
      } else {
        map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 0 })
      }
      scheduleResize(map)
    }

    if (map.loaded()) onReady()
    else map.once('load', onReady)

    return () => {
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []
      map.remove()
    }
  }, [route, status])

  if (!pickupLabel && !destinationLabel && !journey.pickupCoords && !journey.destinationCoords) {
    return null
  }

  const distanceLabel = formatDistance(route?.distanceM ?? null)
  const durationLabel = formatDuration(route?.durationS ?? null)
  const summaryBits = [
    distanceLabel,
    durationLabel,
    route?.routed ? 'road route A → B' : route && route.points.length >= 2 ? 'direct line (routing unavailable)' : null,
  ].filter(Boolean)

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-muted/40 px-3 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Journey map</p>
          <p className="text-xs text-muted">
            {summaryBits.length > 0 ? summaryBits.join(' · ') : 'Pickup and destination'}
          </p>
        </div>
        {status === 'loading' ? <p className="text-xs text-muted">Routing…</p> : null}
      </div>
      <div className="relative" style={{ height: MAP_HEIGHT_PX }}>
        {(status === 'empty' || status === 'error') && error ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface px-4 text-center text-sm text-ink-soft">
            {error}
          </div>
        ) : null}
        {status === 'loading' ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 text-sm text-ink-soft">
            Mapping route from pickup to destination…
          </div>
        ) : null}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  )
}
