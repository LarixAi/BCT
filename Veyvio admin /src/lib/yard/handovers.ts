import type { YardHandover, YardTask, YardVehicleRow } from './types'

export function buildYardHandoverDraft(
  depotId: string,
  depotName: string,
  shiftLabel: string,
  rows: YardVehicleRow[],
  tasks: YardTask[],
  outgoingSupervisor: string,
): YardHandover {
  const notReady = rows.filter((r) => !['ready', 'ready_with_advisory'].includes(r.readinessState) && r.presenceState !== 'off_site')
  const dueOut = rows.filter((r) => r.nextDeparture)
  const vor = rows.filter((r) => r.readinessState === 'vor')
  const offSite = rows.filter((r) => r.presenceState === 'off_site' || r.presenceState === 'in_transit')
  const unknown = rows.filter((r) => r.presenceState === 'location_unknown')
  const charging = rows.filter((r) => r.activityState === 'charging')
  const openTasks = tasks.filter((t) => !['completed', 'cancelled'].includes(t.status))

  return {
    id: `yh-${depotId}`,
    depotId,
    depotName,
    shiftLabel,
    status: 'draft',
    outgoingSupervisor,
    incomingSupervisor: null,
    notes: null,
    sections: [
      {
        label: 'Vehicles still not ready',
        items: notReady.map((r) => ({
          id: r.vehicleId,
          label: `${r.registrationNumber} — ${r.readinessState.replace(/_/g, ' ')}`,
          vehicleId: r.vehicleId,
          registrationNumber: r.registrationNumber,
        })),
      },
      {
        label: 'Vehicles due out next shift',
        items: dueOut.map((r) => ({
          id: r.vehicleId,
          label: `${r.registrationNumber} — ${r.nextDeparture}`,
          vehicleId: r.vehicleId,
          registrationNumber: r.registrationNumber,
        })),
      },
      {
        label: 'VOR vehicles',
        items: vor.map((r) => ({
          id: r.vehicleId,
          label: r.registrationNumber,
          vehicleId: r.vehicleId,
          registrationNumber: r.registrationNumber,
        })),
      },
      {
        label: 'Vehicles off site',
        items: offSite.map((r) => ({
          id: r.vehicleId,
          label: r.registrationNumber,
          vehicleId: r.vehicleId,
          registrationNumber: r.registrationNumber,
        })),
      },
      {
        label: 'Location unknown',
        items: unknown.map((r) => ({
          id: r.vehicleId,
          label: r.registrationNumber,
          vehicleId: r.vehicleId,
          registrationNumber: r.registrationNumber,
        })),
      },
      {
        label: 'Charging in progress',
        items: charging.map((r) => ({
          id: r.vehicleId,
          label: r.registrationNumber,
          vehicleId: r.vehicleId,
          registrationNumber: r.registrationNumber,
        })),
      },
      {
        label: 'Outstanding yard tasks',
        items: openTasks.map((t) => ({
          id: t.id,
          label: `${t.registrationNumber} — ${t.title}`,
          vehicleId: t.vehicleId,
          registrationNumber: t.registrationNumber,
        })),
      },
    ],
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    acceptedBy: null,
  }
}
