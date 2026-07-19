import type { Dispatch, SetStateAction } from 'react'
import { SectionCard } from '@/components/ui'
import type { DriverDevice } from '@/lib/drivers/types'
import { formatDateTime } from '../utils/driver-access-formatters'

export function DriverDevicePanel({
  devices,
  canManage,
  deviceReason,
  setDeviceReason,
  revokePending,
  onRevokeDevice,
}: {
  devices: DriverDevice[]
  canManage: boolean
  deviceReason: Record<string, string>
  setDeviceReason: Dispatch<SetStateAction<Record<string, string>>>
  revokePending: boolean
  onRevokeDevice: (deviceId: string, reason: string) => void
}) {
  return (
    <SectionCard title="Registered devices" description="Devices trusted for Driver app sign-in">
      {devices.length === 0 ? (
        <p className="text-sm text-slate-500">No registered devices.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {devices.map((device) => (
            <li key={device.id} className="rounded-lg border border-slate-200 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{device.label}</p>
                  <p className="text-xs text-slate-500">
                    {device.operatingSystem ?? device.platform}
                    {device.appVersion ? ` · App ${device.appVersion}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    Registered {formatDateTime(device.registeredAt)} · Last active{' '}
                    {formatDateTime(device.lastSeenAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {device.securityStatus === 'trusted' ? 'Trusted' : device.securityStatus}
                    {device.biometricUnlock ? ' · Biometric unlock enabled' : ' · Biometric unlock off'}
                    {device.pushNotificationsEnabled ? ' · Push enabled' : ' · Push off'}
                    {` · Location: ${device.locationAccess.replace(/_/g, ' ')}`}
                  </p>
                </div>
                {canManage && device.securityStatus !== 'revoked' ? (
                  <div className="flex min-w-[12rem] flex-col gap-1">
                    <input
                      value={deviceReason[device.id] ?? ''}
                      onChange={(e) =>
                        setDeviceReason((prev) => ({ ...prev, [device.id]: e.target.value }))
                      }
                      placeholder="Reason to revoke"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      disabled={!deviceReason[device.id]?.trim() || revokePending}
                      onClick={() => onRevokeDevice(device.id, deviceReason[device.id]!.trim())}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                    >
                      Revoke device
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
