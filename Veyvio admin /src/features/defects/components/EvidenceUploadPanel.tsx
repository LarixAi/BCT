import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { canUploadDefectEvidence } from '@/lib/defects/permissions'
import type { DefectDetailRecord } from '@/lib/defects/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function EvidenceUploadPanel({ defect }: { defect: DefectDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canUpload = canUploadDefectEvidence(user?.permissions ?? [])

  const [kind, setKind] = useState<'photo' | 'video' | 'document'>('photo')
  const [label, setLabel] = useState('')

  const upload = useMutation({
    mutationFn: () =>
      api.uploadDefectEvidenceHub(
        { defectId: defect.id, vehicleId: defect.vehicleId, kind, label: label || `${kind} evidence` },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defect-detail', defect.id] })
      queryClient.invalidateQueries({ queryKey: ['defects-hub'] })
      setLabel('')
    },
  })

  if (!canUpload) return null

  return (
    <div className="mt-4 border-t border-border pt-4" data-testid="evidence-upload">
      <p className="text-sm font-medium text-ink">Upload evidence</p>
      <p className="text-xs text-muted">Original files are retained and never overwritten</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="rounded-lg border border-border px-2 py-1.5 text-sm">
          <option value="photo">Photograph</option>
          <option value="video">Video</option>
          <option value="document">Document</option>
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Description"
          className="min-w-[180px] flex-1 rounded-lg border border-border px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={upload.isPending}
          onClick={() => upload.mutate()}
          className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Upload
        </button>
      </div>
    </div>
  )
}
