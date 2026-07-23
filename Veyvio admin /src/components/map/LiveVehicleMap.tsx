import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LiveDispatchVehicle } from '@/lib/api/types'
import { veyvioMapStyle } from '@/features/live-operations/map/veyvioMapStyle'
import { LiveMapDriverCard } from './LiveMapDriverCard'

const DEFAULT_CENTER: [number, number] = [-0.1278, 51.5074]
const DEFAULT_ZOOM = 11
/** Fixed panel height so MapLibre never mounts into a 0×0 box. */
export const LIVE_MAP_PANEL_HEIGHT_PX = 420

export interface LiveVehicleMapHandle {
  fitFleet: () => void
}

export type MapStopMarker = {
  id: string
  longitude: number
  latitude: number
  label: string
  kind?: 'pickup' | 'dropoff' | 'other'
  order?: number
}

interface LiveVehicleMapProps {
  vehicles: LiveDispatchVehicle[]
  className?: string
  selectedDutyId?: string | null
  selectedVehicle?: LiveDispatchVehicle | null
  onSelectDuty?: (dutyId: string) => void
  staleOnly?: boolean
  edgeToEdge?: boolean
  routeLine?: [number, number][]
  trailLine?: [number, number][]
  /** Planned pickup / drop-off pins (shown in addition to the vehicle marker). */
  stopMarkers?: MapStopMarker[]
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
  map.resize()
  requestAnimationFrame(() => map.resize())
  window.setTimeout(() => map.resize(), 100)
  window.setTimeout(() => map.resize(), 400)
}

export const LiveVehicleMap = forwardRef<LiveVehicleMapHandle, LiveVehicleMapProps>(
  function LiveVehicleMap(
    {
      vehicles,
      className = '',
      selectedDutyId,
      selectedVehicle,
      onSelectDuty,
      staleOnly = false,
      edgeToEdge = false,
      routeLine = [],
      trailLine = [],
      stopMarkers = [],
    },
    ref,
  ) {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const markersRef = useRef<maplibregl.Marker[]>([])
    const stopMarkersRef = useRef<maplibregl.Marker[]>([])
    const positioned = useMemo(
      () => positionedVehicles(vehicles, staleOnly),
      [vehicles, staleOnly],
    )
    const [mapError, setMapError] = useState<string | null>(null)
    const [mapReady, setMapReady] = useState(false)

    const showDefaultView = useCallback(() => {
      const map = mapRef.current
      if (!map) return
      map.jumpTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })
      scheduleResize(map)
    }, [])

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
      for (const stop of stopMarkers) {
        bounds.extend([stop.longitude, stop.latitude])
        hasBounds = true
      }

      if (!hasBounds) {
        showDefaultView()
        return
      }

      if (
        positioned.length === 1 &&
        routeLine.length === 0 &&
        trailLine.length === 0 &&
        stopMarkers.length === 0
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
    }, [positioned, routeLine, trailLine, stopMarkers, showDefaultView])

    useImperativeHandle(ref, () => ({ fitFleet }), [fitFleet])

    // Create the map only once the container has a real non-zero size.
    useEffect(() => {
      const container = containerRef.current
      const wrapper = wrapperRef.current
      if (!container || !wrapper) return

      let cancelled = false
      let raf = 0
      let attempts = 0

      const init = () => {
        if (cancelled || mapRef.current) return
        attempts += 1
        const w = container.clientWidth
        const h = container.clientHeight
        if (w < 2 || h < 2) {
          if (attempts < 60) raf = requestAnimationFrame(init)
          return
        }

        try {
          const map = new maplibregl.Map({
            container,
            style: veyvioMapStyle,
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            attributionControl: false,
          })

          map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
          map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

          map.on('load', () => {
            if (cancelled) return
            scheduleResize(map)
            map.jumpTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })
            setMapReady(true)
            setMapError(null)
          })

          map.on('error', (event) => {
            const mapErr = event as { error?: { message?: string }; sourceId?: string; tile?: unknown }
            if (mapErr.sourceId || mapErr.tile) return
            setMapError(mapErr.error?.message ?? 'Map failed to load')
          })

          mapRef.current = map
          // Show chrome quickly; tiles continue loading underneath.
          setMapReady(true)
          scheduleResize(map)
        } catch (err) {
          setMapError(err instanceof Error ? err.message : 'Could not create map')
        }
      }

      raf = requestAnimationFrame(init)

      const resizeObserver = new ResizeObserver(() => {
        mapRef.current?.resize()
      })
      resizeObserver.observe(wrapper)

      return () => {
        cancelled = true
        cancelAnimationFrame(raf)
        resizeObserver.disconnect()
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []
        stopMarkersRef.current.forEach((marker) => marker.remove())
        stopMarkersRef.current = []
        mapRef.current?.remove()
        mapRef.current = null
        setMapReady(false)
      }
    }, [])

    useEffect(() => {
      if (!mapRef.current || !mapReady) return
      const mapInstance: maplibregl.Map = mapRef.current

      function upsertLineLayer(
        sourceId: string,
        layerId: string,
        coordinates: [number, number][],
        color: string,
        dasharray?: number[],
      ) {
        if (!mapInstance.isStyleLoaded()) return

        const geojson = {
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'LineString' as const, coordinates },
        }

        if (mapInstance.getSource(sourceId)) {
          ;(mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson)
        } else if (coordinates.length >= 2) {
          mapInstance.addSource(sourceId, { type: 'geojson', data: geojson })
          mapInstance.addLayer({
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

        if (coordinates.length < 2 && mapInstance.getLayer(layerId)) {
          mapInstance.removeLayer(layerId)
          mapInstance.removeSource(sourceId)
        }
      }

      const apply = () => {
        upsertLineLayer(ROUTE_SOURCE, `${ROUTE_SOURCE}-line`, routeLine, '#2f6bff')
        upsertLineLayer(TRAIL_SOURCE, `${TRAIL_SOURCE}-line`, trailLine, '#059669', [2, 2])
        if (
          routeLine.length >= 2 ||
          trailLine.length >= 2 ||
          positioned.length > 0 ||
          stopMarkers.length > 0
        ) {
          fitFleet()
        } else showDefaultView()
      }

      if (mapInstance.isStyleLoaded()) apply()
      else mapInstance.once('load', apply)
    }, [mapReady, routeLine, trailLine, stopMarkers, positioned.length, fitFleet, showDefaultView])

    useEffect(() => {
      const map = mapRef.current
      if (!map || !mapReady) return

      stopMarkersRef.current.forEach((marker) => marker.remove())
      stopMarkersRef.current = []

      for (const stop of stopMarkers) {
        const kind = stop.kind ?? 'other'
        const el = document.createElement('button')
        el.type = 'button'
        el.className = `route-stop-marker route-stop-marker--${kind}`
        el.title = stop.label
        el.setAttribute('aria-label', stop.label)
        el.innerHTML = `<span>${stop.order ?? ''}</span>`
        stopMarkersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([stop.longitude, stop.latitude])
            .setPopup(
              new maplibregl.Popup({ offset: 18, closeButton: false }).setText(stop.label),
            )
            .addTo(map),
        )
      }
    }, [mapReady, stopMarkers])

    useEffect(() => {
      const map = mapRef.current
      if (!map || !mapReady) return

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      for (const vehicle of positioned) {
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

        markersRef.current.push(
          new maplibregl.Marker({ element: markerEl })
            .setLngLat([vehicle.lastLongitude!, vehicle.lastLatitude!])
            .addTo(map),
        )
      }

      if (!positioned.length && !stopMarkers.length) {
        showDefaultView()
        return
      }

      if (selectedDutyId) {
        const selected = positioned.find((v) => v.dutyId === selectedDutyId)
        if (selected && stopMarkers.length === 0) {
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
    }, [positioned, mapReady, selectedDutyId, onSelectDuty, fitFleet, showDefaultView, stopMarkers.length])

    const shellClass = edgeToEdge
      ? `relative w-full overflow-hidden ${className}`
      : `relative w-full overflow-hidden rounded-lg border border-border ${className}`

    const showFloatingCard =
      selectedVehicle &&
      selectedVehicle.lastLatitude != null &&
      selectedVehicle.lastLongitude != null

    return (
      <div
        ref={wrapperRef}
        className={shellClass}
        style={{ height: LIVE_MAP_PANEL_HEIGHT_PX, minHeight: LIVE_MAP_PANEL_HEIGHT_PX }}
      >
        <div
          ref={containerRef}
          className="veyvio-map-container h-full w-full"
          style={{ height: '100%', width: '100%', background: '#EEF4FF' }}
        />

        {!mapReady && !mapError && (
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center text-sm text-muted">
            Loading map…
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-amber-50 p-4 text-center text-sm text-amber-950">
            Could not load map tiles ({mapError}). Check network access to map tile servers.
          </div>
        )}

        {mapReady && showFloatingCard && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[min(100%-1.5rem,16rem)]">
            <LiveMapDriverCard vehicle={selectedVehicle} />
          </div>
        )}
      </div>
    )
  },
)
