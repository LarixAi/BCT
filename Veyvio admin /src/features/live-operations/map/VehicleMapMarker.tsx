import { CarFront } from 'lucide-react'

export type VehicleOperationalStatus =
  | 'ON_TIME'
  | 'AT_RISK'
  | 'LATE'
  | 'BLOCKED'
  | 'OFFLINE'
  | 'SELECTED'

interface VehicleMapMarkerProps {
  registration: string
  status: VehicleOperationalStatus
  selected?: boolean
  onClick?: () => void
}

const STATUS_STYLES: Record<
  VehicleOperationalStatus,
  {
    background: string
    border: string
    text: string
    iconBackground: string
  }
> = {
  ON_TIME: {
    background: '#ECFDF5',
    border: '#34D399',
    text: '#047857',
    iconBackground: '#10B981',
  },
  AT_RISK: {
    background: '#FFF7E6',
    border: '#F59E0B',
    text: '#B45309',
    iconBackground: '#F59E0B',
  },
  LATE: {
    background: '#FFF1F2',
    border: '#FB7185',
    text: '#BE123C',
    iconBackground: '#EF4444',
  },
  BLOCKED: {
    background: '#FFF1F2',
    border: '#EF4444',
    text: '#B91C1C',
    iconBackground: '#DC2626',
  },
  OFFLINE: {
    background: '#F8FAFC',
    border: '#CBD5E1',
    text: '#64748B',
    iconBackground: '#94A3B8',
  },
  SELECTED: {
    background: '#EEF4FF',
    border: '#3165F5',
    text: '#1D4ED8',
    iconBackground: '#3165F5',
  },
}

export function VehicleMapMarker({
  registration,
  status,
  selected = false,
  onClick,
}: VehicleMapMarkerProps) {
  const markerStyle = selected ? STATUS_STYLES.SELECTED : STATUS_STYLES[status]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open vehicle ${registration}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 30,
        padding: '3px 10px 3px 4px',
        borderRadius: 999,
        border: `1.5px solid ${markerStyle.border}`,
        background: markerStyle.background,
        color: markerStyle.text,
        boxShadow: selected
          ? '0 0 0 4px rgba(49, 101, 245, 0.16), 0 8px 20px rgba(15, 23, 42, 0.18)'
          : '0 5px 14px rgba(15, 23, 42, 0.14)',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 700,
        fontSize: 12,
        lineHeight: 1,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: markerStyle.iconBackground,
          color: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <CarFront size={13} strokeWidth={2.4} />
      </span>
      <span className="tabular-nums">{registration}</span>
    </button>
  )
}
