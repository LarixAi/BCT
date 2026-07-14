import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'

export function CompanySettingsPage() {
  const queryClient = useQueryClient()
  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => api.getCompany(),
  })

  const [name, setName] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [licence, setLicence] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!company) return
    setName(company.name)
    setTradingName(company.tradingName ?? '')
    setContactName(company.settings?.mainContactName ?? '')
    setContactEmail(company.settings?.mainContactEmail ?? '')
    setTelephone(company.settings?.telephone ?? '')
    setLicence(company.settings?.operatorLicenceNumber ?? '')
  }, [company])

  const save = useMutation({
    mutationFn: () =>
      api.updateCompany({
        name,
        tradingName: tradingName || undefined,
        settings: {
          mainContactName: contactName || null,
          mainContactEmail: contactEmail || null,
          telephone: telephone || null,
          operatorLicenceNumber: licence || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Company Settings</h1>
        <p className="text-sm text-slate-600">General company information and operator details</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
          className="max-w-2xl space-y-6"
        >
          <SectionCard title="Company">
            <div className="space-y-3">
              <Field label="Legal name" value={name} onChange={setName} />
              <Field label="Trading name" value={tradingName} onChange={setTradingName} />
            </div>
          </SectionCard>

          <SectionCard title="Contact & licensing">
            <div className="space-y-3">
              <Field label="Main contact" value={contactName} onChange={setContactName} />
              <Field label="Contact email" value={contactEmail} onChange={setContactEmail} type="email" />
              <Field label="Telephone" value={telephone} onChange={setTelephone} />
              <Field label="Operator licence" value={licence} onChange={setLicence} />
            </div>
          </SectionCard>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={save.isPending}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-emerald-700">Settings saved.</span>}
          </div>
        </form>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
      />
    </label>
  )
}
