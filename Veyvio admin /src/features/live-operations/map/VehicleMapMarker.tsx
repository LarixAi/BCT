export type VehicleOperationalStatus =
  | 'ON_TIME'
  | 'AT_RISK'
  | 'LATE'
  | 'BLOCKED'
  | 'OFFLINE'
  | 'SELECTED'

interface VehicleMapMarkerProps {
  driverName: string
  statusLabel: string
  registration?: string
  status: VehicleOperationalStatus
  selected?: boolean
  onClick?: () => void
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function VehicleMapMarker({
  driverName,
  statusLabel,
  registration,
  status,
  selected = false,
  onClick,
}: VehicleMapMarkerProps) {
  const displayName = driverName.trim() || registration || 'Unassigned'
  const offline = status === 'OFFLINE'

  return (
    <div className={`veyvio-driver-marker${selected ? ' veyvio-driver-marker--selected' : ''}${offline ? ' veyvio-driver-marker--offline' : ''}`}>
      <button
        type="button"
        onClick={onClick}
        className="veyvio-driver-marker__label"
        aria-label={`${displayName}, ${statusLabel}`}
      >
        <span className="veyvio-driver-marker__avatar" aria-hidden="true">
          {initials(displayName)}
        </span>
        <span className="veyvio-driver-marker__text">
          <span className="veyvio-driver-marker__name">{displayName}</span>
          <span className="veyvio-driver-marker__status">/ {statusLabel}</span>
        </span>
      </button>
      <span className="veyvio-driver-marker__pin" aria-hidden="true" />
    </div>
  )
}
