export type PlaceKind = 'depot' | 'customer_site' | 'waypoint'

export interface PlaceRecord {
  id: string
  kind: PlaceKind
  name: string
  address: string | null
  lat: number
  lng: number
  radiusM: number
  createdAt: string | null
}

export interface CreatePlaceInput {
  kind: PlaceKind
  name: string
  address?: string | null
  lat: number
  lng: number
  radiusM?: number
}

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  depot: 'Depot',
  customer_site: 'Customer site',
  waypoint: 'Waypoint',
}
