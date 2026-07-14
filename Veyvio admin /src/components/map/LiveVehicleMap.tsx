import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LiveDispatchVehicle } from '@/lib/api/types'
import { LiveMapDriverCard } from './LiveMapDriverCard'

const MAP_STYLES = [
  import.meta.env.VITE_MAP_TILE_STYLE,
  'https://tiles.openfreemap.org/styles/liberty',
  'https://demotiles.maplibre.org/style.json',
].filter((url): url is string => Boolean(url))

const DEFAULT_CENTER: [number, number] = [-0.1278, 51.5074]
const DEFAULT_ZOOM = 10

export interface LiveVehicleMapHandle {
  fitFleet: () => void
}

interface LiveVehicleMapProps {
  vehicles: LiveDispatchVehicle[]
  className?: string
  selectedDutyId?: string | null
  selectedVehicle?: LiveDispatchVehicle | null
  onSelectDuty?: (dutyId: string) => void
  staleOnly?: boolean
  edgeToEdge?: boolean
  resultsLabel?: string
  routeLine?: [number, number][]
  trailLine?: [number, number][]
}

const ROUTE_SOURCE = 'veyvio-route'
const TRAIL_SOURCE = 'veyvio-trail'

function positionedVehicles(vehicles: LiveDispatchVehicle[], staleOnly: boolean) {
  return vehicles.filter(
    (v) =>
      v.lastLatitude != null &&
      v.lastLongitude != null &&
      (!staleOnly || v.isStale),
  )
}

function scheduleResize(map: maplibregl.Map) {
  requestAnimationFrame(() => map.resize())
  window.setTimeout(() => map.resize(), 50)
  window.setTimeout(() => map.resize(), 250)
}

export const LiveVehicleMap = forwardRef<LiveVehicleMapHandle, LiveVehicleMapProps>(
  function LiveVehicleMap(
    {
      vehicles,
      className = 'h-full min-h-[300px]',
      selectedDutyId,
      selectedVehicle,
      onSelectDuty,
      staleOnly = false,
      edgeToEdge = false,
      resultsLabel,
      routeLine = [],
      trailLine = [],
    },
    ref,
  ) {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const markersRef = useRef<maplibregl.Marker[]>([])
    const styleIndexRef = useRef(0)
    const positioned = useMemo(
      () => positionedVehicles(vehicles, staleOnly),
      [vehicles, staleOnly],
    )
    const [mapError, setMapError] = useState<string | null>(null)
    const [mapReady, setMapReady] = useState(false)

    const fitFleet = useCallback(() => {
      const map = mapRef.current
      if (!map) return

      const bounds = new maplibregl.LngLatBounds()
      let hasBounds = false

      for (const v of positioned) {
        bounds.extend([v.lastLongitude!, v.lastLatitude!])
        hasBounds = true
      }

      for (const coord of [...routeLine, ...trailLine]) {
        bounds.extend(coord)
        hasBounds = true
      }

      if (!hasBounds) return

      if (
        positioned.length === 1 &&
        routeLine.length === 0 &&
        trailLine.length === 0
      ) {
        map.easeTo({
          center: [positioned[0]!.lastLongitude!, positioned[0]!.lastLatitude!],
          zoom: 13,
          duration: 500,
        })
      } else {
        map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 500 })
      }
      scheduleResize(map)
    }, [positioned, routeLine, trailLine])

    useImperativeHandle(ref, () => ({ fitFleet }), [fitFleet])

    useEffect(() => {
      const container = containerRef.current
      const wrapper = wrapperRef.current
      if (!container || !wrapper || mapRef.current) return

      let cancelled = false

      const map = new maplibregl.Map({
        container,
        style: MAP_STYLES[styleIndexRef.current]!,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      })

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

      map.on('load', () => {
        if (cancelled) return
        scheduleResize(map)
        setMapReady(true)
        setMapError(null)
      })

      map.on('error', (event) => {
        const mapErr = event as { sourceId?: string; tile?: unknown }
        if (mapErr.sourceId || mapErr.tile) return

        if (styleIndexRef.current + 1 < MAP_STYLES.length) {
          styleIndexRef.current += 1
          map.setStyle(MAP_STYLES[styleIndexRef.current]!)
          return
        }

        setMapError(
          event.error?.message ??
            (typeof event.error === 'string' ? event.error : 'Map tiles failed to load'),
        )
      })

      mapRef.current = map

      const resizeObserver = new ResizeObserver(() => {
        mapRef.current?.resize()
      })
      resizeObserver.observe(wrapper)

      return () => {
        cancelled = true
        resizeObserver.disconnect()
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []
        map.remove()
        mapRef.current = null
        setMapReady(false)
      }
    }, [])

    useEffect(() => {
      const map = mapRef.current
      if (!map || !mapReady) return

      function upsertLineLayer(
        sourceId: string,
        layerId: string,
        coordinates: [number, number][],
        color: string,
        dasharray?: number[],
      ) {
        if (!map) return

        const geojson = {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
        }

        if (map.getSource(sourceId)) {
          ;(map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson)
        } else if (coordinates.length >= 2) {
          map.addSource(sourceId, { type: 'geojson', data: geojson })
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': 3,
              ...(dasharray ? { 'line-dasharray': dasharray } : {}),
            },
          })
        }

        if (coordinates.length < 2 && map.getLayer(layerId)) {
          map.removeLayer(layerId)
          map.removeSource(sourceId)
        }
      }

      upsertLineLayer(ROUTE_SOURCE, `${ROUTE_SOURCE}-line`, routeLine, '#3b5bdb')
      upsertLineLayer(TRAIL_SOURCE, `${TRAIL_SOURCE}-line`, trailLine, '#059669', [2, 2])

      if (routeLine.length >= 2 || trailLine.length >= 2 || positioned.length > 0) {
        fitFleet()
      }
    }, [mapReady, routeLine, trailLine, positioned.length, fitFleet])

    useEffect(() => {
      const map = mapRef.current
      if (!map || !mapReady) return

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      if (!positioned.length) return

      for (const vehicle of positioned) {
        const lng = vehicle.lastLongitude!
        const lat = vehicle.lastLatitude!
        const selected = vehicle.dutyId === selectedDutyId
        const markerEl = document.createElement('button')
        markerEl.type = 'button'
        markerEl.className = `live-vehicle-marker map-pin${selected ? ' selected' : ''}`
        markerEl.setAttribute(
          'aria-label',
          `${vehicle.vehicleRegistration ?? vehicle.reference} — ${vehicle.driverName ?? 'Driver'}`,
        )
        markerEl.innerHTML = `<span class="${vehicle.isStale ? 'stale' : 'live'}"></span>`
        markerEl.addEventListener('click', (event) => {
          event.stopPropagation()
          onSelectDuty?.(vehicle.dutyId)
        })

        const marker = new maplibregl.Marker({ element: markerEl })
          .setLngLat([lng, lat])
          .addTo(map)

        markersRef.current.push(marker)
      }

      if (selectedDutyId) {
        const selected = positioned.find((v) => v.dutyId === selectedDutyId)
        if (selected) {
          map.easeTo({
            center: [selected.lastLongitude!, selected.lastLatitude!],
            zoom: 14,
            duration: 500,
          })
          scheduleResize(map)
          return
        }
      }

      fitFleet()
    }, [positioned, mapReady, selectedDutyId, onSelectDuty, fitFleet])

    const shellClass = edgeToEdge
      ? `relative overflow-hidden ${className}`
      : `relative overflow-hidden rounded-lg border border-slate-200 ${className}`

    const showFloatingCard =
      selectedVehicle &&
      selectedVehicle.lastLatitude != null &&
      selectedVehicle.lastLongitude != null

    return (
      <div ref={wrapperRef} className={shellClass}>
        {resultsLabel && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-center">
            <div className="pointer-events-auto flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur-sm">
              <span className="font-medium uppercase tracking-wide">{resultsLabel}</span>
            </div>
          </div>
        )}

        <div ref={containerRef} className="veyvio-map-container h-full w-full bg-slate-100" />

        {!mapReady && !mapError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-50/80 text-sm text-slate-500">
            Loading map…
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-4 text-center text-sm text-red-800">
            Could not load map tiles. Check your network connection and refresh.
          </div>
        )}

        {mapReady && positioned.length === 0 && routeLine.length < 2 && trailLine.length < 2 && (
          <div className="pointer-events-none absolute inset-x-4 top-16 rounded-md bg-white/90 px-3 py-2 text-center text-sm text-slate-600 shadow-sm">
            {staleOnly
              ? 'No stale GPS positions for this filter.'
              : 'No GPS positions yet — map will update when drivers report location.'}
          </div>
        )}

        {mapReady && showFloatingCard && (
          <div className="pointer-events-none absolute left-1/2 top-[42%] z-20 -translate-x-1/2">
            <LiveMapDriverCard vehicle={selectedVehicle} />
          </div>
        )}
      </div>
    )
  },
)
