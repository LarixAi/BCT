import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { veyvioMapStyle } from '@/features/live-operations/map/veyvioMapStyle'

type LineStringFeature = {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}


const DEFAULT_HEIGHT_PX = 360
const ROUTE_SOURCE = 'stop-sequence-route'
const ROUTE_LAYER = 'stop-sequence-route-line'
const ROUTE_CASING = 'stop-sequence-route-casing'

export type RouteMapStop = {
  id: string
  label: string
  address?: string | null
  kind?: 'pickup' | 'dropoff' | 'other'
  plannedTime?: string | null
}

type MapPoint = {
  id: string
  lng: number
  lat: number
  label: string
  kind: 'pickup' | 'dropoff' | 'other'
  letter: string
}

type ResolvedRoute = {
  points: MapPoint[]
  coordinates: [number, number][]
  distanceM: number | null
  durationS: number | null
  routed: boolean
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
  points: Array<{ lng: number; lat: number }>,
): Promise<{ coordinates: [number, number][]; distanceM: number; durationS: number } | null> {
  if (points.length < 2) return null
  const path = points.map((p) => `${p.lng},${p.lat}`).join(';')
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

function markerElement(letter: string, kind: MapPoint['kind'], caption: string) {
  const el = document.createElement('div')
  el.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;'
  const pin = document.createElement('div')
  pin.textContent = letter
  const bg = kind === 'pickup' ? '#2F6BFF' : kind === 'dropoff' ? '#0B1526' : '#64748B'
  pin.style.cssText = [
    'min-width:28px',
    'height:28px',
    'padding:0 6px',
    'border-radius:999px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'font:700 11px/1 Inter, system-ui, sans-serif',
    'color:#fff',
    `background:${bg}`,
    'border:2px solid #fff',
    'box-shadow:0 2px 8px rgba(11,21,38,0.28)',
  ].join(';')
  const label = document.createElement('div')
  label.textContent = caption
  label.style.cssText = [
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
  el.append(pin, label)
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
  const line: LineStringFeature = {
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
    paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.95 },
  })
  map.addLayer({
    id: ROUTE_LAYER,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#2F6BFF', 'line-width': 4.5, 'line-opacity': 0.95 },
  })
}

function stopQuery(stop: RouteMapStop): string | null {
  const address = stop.address?.trim()
  if (address) return address
  const label = stop.label?.trim()
  if (!label || /^drop\s*off/i.test(label)) return null
  return label
}

export function StopSequenceRouteMap({
  stops,
  heightPx = DEFAULT_HEIGHT_PX,
  title = 'Route map',
}: {
  stops: RouteMapStop[]
  heightPx?: number
  title?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [route, setRoute] = useState<ResolvedRoute | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const lookupKey = useMemo(
    () =>
      stops
        .map((s) => `${s.id}|${s.kind ?? ''}|${s.address ?? ''}|${s.label}`)
        .join('||'),
    [stops],
  )

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      setStatus('loading')
      setError(null)

      const points: MapPoint[] = []
      let letterCode = 0
      for (const stop of stops) {
        const query = stopQuery(stop)
        if (!query) continue
        const geo = await geocodeUkAddress(query).catch(() => null)
        if (!geo) continue
        const letter = String.fromCharCode(65 + (letterCode % 26))
        letterCode += 1
        points.push({
          id: stop.id,
          ...geo,
          label: stop.kind === 'pickup' ? 'Pickup' : stop.kind === 'dropoff' ? 'Drop-off' : stop.label,
          kind: stop.kind ?? 'other',
          letter,
        })
      }

      if (cancelled) return
      if (points.length === 0) {
        setRoute(null)
        setStatus('empty')
        setError('Could not locate stop addresses on the map.')
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

      const driving = await fetchDrivingRoute(points).catch(() => null)
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
          coordinates: points.map((p) => [p.lng, p.lat]),
          distanceM: null,
          durationS: null,
          routed: false,
        })
      }
      setStatus('ready')
    }

    void resolve().catch(() => {
      if (cancelled) return
      setStatus('error')
      setError('Could not build the route map.')
    })

    return () => {
      cancelled = true
    }
  }, [lookupKey, stops])

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
            element: markerElement(point.letter, point.kind, point.label),
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
        map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 0 })
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

  if (stops.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-ink-soft">
        No stops to map yet.
      </div>
    )
  }

  const summary = [
    formatDistance(route?.distanceM ?? null),
    formatDuration(route?.durationS ?? null),
    route?.routed
      ? 'road route'
      : route && route.points.length >= 2
        ? 'direct line (routing unavailable)'
        : null,
  ].filter(Boolean)

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-muted/40 px-3 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</p>
          <p className="text-xs text-muted">
            {summary.length > 0 ? summary.join(' · ') : 'Stop sequence on roads'}
          </p>
        </div>
        {status === 'loading' ? <p className="text-xs text-muted">Routing…</p> : null}
      </div>
      <div className="relative" style={{ height: heightPx }}>
        {(status === 'empty' || status === 'error') && error ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface px-4 text-center text-sm text-ink-soft">
            {error}
          </div>
        ) : null}
        {status === 'loading' ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 text-sm text-ink-soft">
            Mapping stops on the road network…
          </div>
        ) : null}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  )
}
