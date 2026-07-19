import type { DriverContactEditorState } from '../hooks/useDriverContactEditor'
import { mutationErrorMessage } from '../utils/driver-access-formatters'

export function DriverContactEditor({
  contact,
  canResendInvite,
  invitePending,
  onSaveAndResend,
}: {
  contact: DriverContactEditorState
  canResendInvite: boolean
  invitePending: boolean
  onSaveAndResend: () => void
}) {
  if (!contact.editing) {
    return (
      <button
        type="button"
        onClick={contact.startEditing}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
      >
        Edit login email or mobile
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-900">Edit login contact</p>
      <p className="text-xs text-slate-600">
        This is the email/mobile used for invitations and account recovery. Changing it is audited. If an
        invitation is already pending, resend it after saving so the new address gets the link.
      </p>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Email</span>
        <input
          type="email"
          value={contact.email}
          onChange={(e) => contact.setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Mobile</span>
        <input
          type="tel"
          value={contact.phone}
          onChange={(e) => contact.setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Reason</span>
        <textarea
          value={contact.reason}
          onChange={(e) => contact.setReason(e.target.value)}
          rows={2}
          required
          placeholder="Required for the access audit trail"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      {contact.saveError ? (
        <p className="text-sm text-red-800">
          {mutationErrorMessage(contact.saveError, 'Contact could not be updated')}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={contact.savePending || !contact.canSave}
          onClick={() => {
            void contact.save()
          }}
          className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {contact.savePending ? 'Saving…' : 'Save contact'}
        </button>
        <button
          type="button"
          onClick={contact.cancelEditing}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          Cancel
        </button>
        {canResendInvite ? (
          <button
            type="button"
            disabled={invitePending || contact.savePending}
            onClick={onSaveAndResend}
            className="rounded-lg border border-command-200 bg-command-50 px-3 py-1.5 text-sm font-medium text-command-800"
          >
            Save and resend invitation
          </button>
        ) : null}
      </div>
    </div>
  )
}
