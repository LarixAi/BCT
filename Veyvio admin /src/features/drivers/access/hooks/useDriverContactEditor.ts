import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { DriverProfile } from '@/lib/drivers/types'

export function useDriverContactEditor({
  driver,
  actorName,
  onSaved,
}: {
  driver: DriverProfile
  actorName: string
  onSaved?: (profile: DriverProfile) => void
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState(driver.email ?? '')
  const [phone, setPhone] = useState(driver.phone ?? '')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!editing) {
      setEmail(driver.email ?? '')
      setPhone(driver.phone ?? '')
    }
  }, [driver.email, driver.phone, editing])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-profile', driver.id] })
    queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['driver-directory-summary'] })
  }

  const updateContact = useMutation({
    mutationFn: () =>
      api.updateDriver(
        driver.id,
        {
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          contactChangeReason: reason.trim(),
        },
        actorName,
      ),
    onSuccess: (profile) => {
      queryClient.setQueryData(['driver-profile', driver.id], profile)
      setEditing(false)
      setReason('')
      invalidate()
      onSaved?.(profile)
    },
  })

  const startEditing = () => {
    setEmail(driver.email ?? '')
    setPhone(driver.phone ?? '')
    setReason('')
    setEditing(true)
  }

  const contactChanged =
    email.trim().toLowerCase() !== (driver.email ?? '').toLowerCase() ||
    phone.trim() !== (driver.phone ?? '')

  const canSave = Boolean(reason.trim() && (email.trim() || phone.trim()))

  return {
    editing,
    email,
    phone,
    reason,
    setEmail,
    setPhone,
    setReason,
    startEditing,
    cancelEditing: () => setEditing(false),
    save: () => updateContact.mutateAsync(),
    savePending: updateContact.isPending,
    saveError: updateContact.error,
    contactChanged,
    canSave,
  }
}

export type DriverContactEditorState = ReturnType<typeof useDriverContactEditor>
