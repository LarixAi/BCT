import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import maplibregl, { LngLatBounds, type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'

import { VehicleMapMarker, type VehicleOperationalStatus } from './VehicleMapMarker'
import { veyvioMapStyle } from './veyvioMapStyle'
import './liveOperationsMap.css'

export type { VehicleOperationalStatus }

export interface LiveVehicle {
  id: string
  registration: string
  fleetNumber?: string
  driverName?: string
  runReference?: string
  latitude: number
  longitude: number
  status: VehicleOperationalStatus
  lastUpdatedAt: string
}

export interface LiveOperationsMapHandle {
  fitFleet: () => void
}

interface LiveOperationsMapProps {
  vehicles: LiveVehicle[]
  selectedVehicleId?: string | null
  onVehicleSelect?: (vehicle: LiveVehicle) => void
  onCollapse?: () => void
  description?: string
}

const DEFAULT_CENTRE: [number, number] = [-0.1276, 51.5072]
const MAP_HEIGHT_PX = 404

export const LiveOperationsMap = forwardRef<LiveOperationsMapHandle, LiveOperationsMapProps>(
  function LiveOperationsMap(
    {
      vehicles,
      selectedVehicleId,
      onVehicleSelect,
      onCollapse,
      description = 'Operating area — live vehicle and trip locations',
    },
    ref,
  ) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<MapLibreMap | null>(null)
    const markerRefs = useRef<Map<string, Marker>>(new Map())
    const markerRootRefs = useRef<Map<string, Root>>(new Map())
    const onSelectRef = useRef(onVehicleSelect)
    onSelectRef.current = onVehicleSelect

    const [isMapReady, setIsMapReady] = useState(false)
    const [mapError, setMapError] = useState<string | null>(null)

    const validVehicles = useMemo(
      () =>
        vehicles.filter(
          (vehicle) => Number.isFinite(vehicle.longitude) && Number.isFinite(vehicle.latitude),
        ),
      [vehicles],
    )

    const fitFleet = useCallback(() => {
      const map = mapRef.current
      if (!map || validVehicles.length === 0) return

      if (validVehicles.length === 1) {
        map.easeTo({
          center: [validVehicles[0].longitude, validVehicles[0].latitude],
          zoom: 13,
          duration: 700,
        })
        return
      }

      const bounds = validVehicles.reduce(
        (currentBounds, vehicle) => currentBounds.extend([vehicle.longitude, vehicle.latitude]),
        new LngLatBounds(
          [validVehicles[0].longitude, validVehicles[0].latitude],
          [validVehicles[0].longitude, validVehicles[0].latitude],
        ),
      )

      map.fitBounds(bounds, {
        padding: { top: 70, right: 70, bottom: 70, left: 70 },
        maxZoom: 13,
        duration: 750,
      })
    }, [validVehicles])

    useImperativeHandle(ref, () => ({ fitFleet }), [fitFleet])

    useEffect(() => {
      const container = mapContainerRef.current
      if (!container || mapRef.current) return

      const map = new maplibregl.Map({
        container,
        style: veyvioMapStyle,
        center: DEFAULT_CENTRE,
        zoom: 9.2,
        minZoom: 4,
        maxZoom: 18,
        attributionControl: false,
        cooperativeGestures: true,
      })

      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

      map.once('load', () => {
        map.resize()
        setIsMapReady(true)
      })

      map.on('error', (event) => {
        const message = event.error?.message ?? 'Map failed to load'
        setMapError(message)
      })

      mapRef.current = map

      const resizeObserver = new ResizeObserver(() => {
        map.resize()
      })
      resizeObserver.observe(container)

      return () => {
        resizeObserver.disconnect()
        markerRootRefs.current.forEach((root) => root.unmount())
        markerRootRefs.current.clear()
        markerRefs.current.forEach((marker) => marker.remove())
        markerRefs.current.clear()
        map.remove()
        mapRef.current = null
      }
    }, [])

    useEffect(() => {
      if (!isMapReady || !mapRef.current) return

      const currentMarkerIds = new Set(validVehicles.map((vehicle) => vehicle.id))

      markerRefs.current.forEach((marker, markerId) => {
        if (currentMarkerIds.has(markerId)) return
        markerRootRefs.current.get(markerId)?.unmount()
        markerRootRefs.current.delete(markerId)
        marker.remove()
        markerRefs.current.delete(markerId)
      })

      validVehicles.forEach((vehicle) => {
        const existingMarker = markerRefs.current.get(vehicle.id)
        if (existingMarker) {
          existingMarker.setLngLat([vehicle.longitude, vehicle.latitude])
          return
        }

        const markerRoot = document.createElement('div')
        markerRoot.className = 'veyvio-vehicle-marker'

        const marker = new maplibregl.Marker({
          element: markerRoot,
          anchor: 'center',
        })
          .setLngLat([vehicle.longitude, vehicle.latitude])
          .addTo(mapRef.current!)

        const root = createRoot(markerRoot)
        markerRefs.current.set(vehicle.id, marker)
        markerRootRefs.current.set(vehicle.id, root)
      })

      fitFleet()
    }, [fitFleet, isMapReady, validVehicles])

    useEffect(() => {
      if (!isMapReady) return

      validVehicles.forEach((vehicle) => {
        const root = markerRootRefs.current.get(vehicle.id)
        root?.render(
          <VehicleMapMarker
            registration={vehicle.registration}
            status={vehicle.status}
            selected={vehicle.id === selectedVehicleId}
            onClick={() => onSelectRef.current?.(vehicle)}
          />,
        )
      })
    }, [isMapReady, selectedVehicleId, validVehicles])

    const zoomIn = () => {
      mapRef.current?.zoomIn({ duration: 250 })
    }

    const zoomOut = () => {
      mapRef.current?.zoomOut({ duration: 250 })
    }

    return (
      <section className="live-map-card">
        <header className="live-map-card__header">
          <div>
            <h2>Live map</h2>
            <p>{description}</p>
          </div>

          <div className="live-map-card__actions">
            <button
              type="button"
              className="live-map-card__fit-button"
              onClick={fitFleet}
              disabled={validVehicles.length === 0}
            >
              Fit fleet
            </button>
            {onCollapse && (
              <button type="button" className="live-map-card__collapse-button" onClick={onCollapse}>
                Collapse map
              </button>
            )}
          </div>
        </header>

        <div className="live-map-card__canvas">
          <div
            ref={mapContainerRef}
            className="live-map-card__map"
            aria-label="Live fleet map"
            style={{ height: MAP_HEIGHT_PX, minHeight: MAP_HEIGHT_PX }}
          />

          {!isMapReady && !mapError && (
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center text-sm text-muted">
              Loading map…
            </div>
          )}

          {mapError && (
            <div className="absolute inset-2 z-[2] flex items-center justify-center rounded-[11px] bg-amber-50 p-4 text-center text-sm text-amber-950">
              Could not load map tiles ({mapError}). Check network access to map tile servers.
            </div>
          )}

          <div className="live-map-card__controls" aria-label="Map controls">
            <button type="button" aria-label="Zoom in" onClick={zoomIn}>
              <Plus size={18} />
            </button>
            <button type="button" aria-label="Zoom out" onClick={zoomOut}>
              <Minus size={18} />
            </button>
            <button type="button" aria-label="Fit all fleet vehicles" onClick={fitFleet}>
              <LocateFixed size={17} />
            </button>
          </div>

          <MapLegend />
        </div>
      </section>
    )
  },
)

function MapLegend() {
  return (
    <div className="live-map-legend">
      <LegendItem colour="#10B981" label="On time" />
      <LegendItem colour="#F59E0B" label="At risk" />
      <LegendItem colour="#EF4444" label="Late" />
      <LegendItem colour="#94A3B8" label="Offline" />
    </div>
  )
}

function LegendItem({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="live-map-legend__item">
      <span className="live-map-legend__dot" style={{ backgroundColor: colour }} />
      {label}
    </span>
  )
}
