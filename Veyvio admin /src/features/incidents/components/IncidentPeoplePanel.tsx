import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { canInvestigateIncident, canViewMedicalIncident, canViewSafeguardingIncident } from '@/lib/incidents/permissions'
import type { IncidentDetailRecord, IncidentPersonInvolved } from '@/lib/incidents/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function IncidentPeoplePanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const canMedical = canViewMedicalIncident(user?.permissions ?? [])
  const canSafeguarding = canViewSafeguardingIncident(user?.permissions ?? [])
  const canEdit = canInvestigateIncident(user?.permissions ?? [])

  if (incident.people.length === 0) {
    return (
      <SectionCard title="People involved">
        <p className="text-sm text-muted">No people recorded.</p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4" data-testid="incident-people">
      {incident.people.map((person) => (
        <PersonCard
          key={person.id}
          incidentId={incident.id}
          person={person}
          canEdit={canEdit}
          canMedical={canMedical}
          canSafeguarding={canSafeguarding}
          isSafeguardingIncident={incident.isSafeguarding}
        />
      ))}
    </div>
  )
}

function PersonCard({
  incidentId,
  person,
  canEdit,
  canMedical,
  canSafeguarding,
  isSafeguardingIncident,
}: {
  incidentId: string
  person: IncidentPersonInvolved
  canEdit: boolean
  canMedical: boolean
  canSafeguarding: boolean
  isSafeguardingIncident: boolean
}) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const restricted = person.isRestricted && !canSafeguarding
  const [editing, setEditing] = useState(false)
  const [injuryStatus, setInjuryStatus] = useState(person.injuryStatus)
  const [injuryDescription, setInjuryDescription] = useState(person.injuryDescription ?? '')
  const [firstAidProvided, setFirstAidProvided] = useState(person.firstAidProvided ?? false)
  const [ambulanceAttended, setAmbulanceAttended] = useState(person.ambulanceAttended ?? false)
  const [hospitalAttendance, setHospitalAttendance] = useState(person.hospitalAttendance ?? false)
  const [contactNotified, setContactNotified] = useState(person.contactNotified ?? false)
  const [welfareFollowUpRequired, setWelfareFollowUpRequired] = useState(person.welfareFollowUpRequired)
  const [medicalNotes, setMedicalNotes] = useState(person.medicalNotes ?? '')

  const mutation = useMutation({
    mutationFn: () =>
      api.updateIncidentPersonWelfareHub(
        {
          incidentId,
          personId: person.id,
          injuryStatus,
          injuryDescription,
          firstAidProvided,
          ambulanceAttended,
          hospitalAttendance,
          contactNotified,
          welfareFollowUpRequired,
          medicalNotes: canMedical ? medicalNotes : undefined,
        },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incidentId] })
      setEditing(false)
    },
  })

  return (
    <SectionCard title={restricted ? 'Restricted person record' : person.name}>
      {restricted ? (
        <p className="text-sm text-red-800">Safeguarding access required to view this person&apos;s details.</p>
      ) : (
        <>
          <dl className="space-y-2 text-sm">
            <Row label="Role" value={person.role.replace(/_/g, ' ')} />
            <Row label="Injury status" value={person.injuryStatus} />
            {person.injuryDescription && <Row label="Injury" value={person.injuryDescription} />}
            {person.firstAidProvided && <Row label="First aid" value="Provided" />}
            {person.ambulanceAttended && <Row label="Ambulance" value="Attended" />}
            {person.hospitalAttendance && <Row label="Hospital" value="Attended" />}
            {person.contactNotified && <Row label="Contact notified" value="Yes" />}
            {person.welfareFollowUpRequired && <Row label="Welfare follow-up" value="Required" />}
            {person.hasMedicalDetails && canMedical && person.medicalNotes && (
              <Row label="Medical notes" value={person.medicalNotes} />
            )}
            {person.hasMedicalDetails && !canMedical && (
              <Row label="Medical notes" value="Restricted — medical access required" />
            )}
            {isSafeguardingIncident && person.vulnerabilityNotes && canSafeguarding && (
              <Row label="Vulnerability" value={person.vulnerabilityNotes} />
            )}
          </dl>
          {canEdit && (
            <button type="button" onClick={() => setEditing((v) => !v)} className="mt-3 text-sm font-medium text-command-600 hover:underline">
              {editing ? 'Cancel edit' : 'Update welfare record'}
            </button>
          )}
          {editing && (
            <div className="mt-4 space-y-3 border-t border-border pt-4" data-testid="welfare-edit-form">
              <select value={injuryStatus} onChange={(e) => setInjuryStatus(e.target.value as typeof injuryStatus)} className="w-full rounded-lg border border-border px-3 py-1.5 text-sm">
                <option value="none">No injury</option>
                <option value="minor">Minor injury</option>
                <option value="serious">Serious injury</option>
                <option value="unknown">Unknown</option>
              </select>
              <input value={injuryDescription} onChange={(e) => setInjuryDescription(e.target.value)} placeholder="Injury description" className="w-full rounded-lg border border-border px-3 py-1.5 text-sm" />
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={firstAidProvided} onChange={(e) => setFirstAidProvided(e.target.checked)} />First aid provided</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={ambulanceAttended} onChange={(e) => setAmbulanceAttended(e.target.checked)} />Ambulance attended</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={hospitalAttendance} onChange={(e) => setHospitalAttendance(e.target.checked)} />Hospital attendance</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={contactNotified} onChange={(e) => setContactNotified(e.target.checked)} />Emergency contact notified</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={welfareFollowUpRequired} onChange={(e) => setWelfareFollowUpRequired(e.target.checked)} />Welfare follow-up required</label>
              </div>
              {canMedical && (
                <textarea value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} placeholder="Medical notes (restricted)" rows={2} className="w-full rounded-lg border border-border px-3 py-1.5 text-sm" />
              )}
              <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white" data-testid="save-welfare-record">
                Save welfare record
              </button>
            </div>
          )}
        </>
      )}
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-40 shrink-0 text-muted capitalize">{label}</dt>
      <dd className="font-medium capitalize text-ink">{value}</dd>
    </div>
  )
}
