import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type AuthenticatorQrProps = {
  otpauthUri: string
  secret: string
  className?: string
}

export function AuthenticatorQr({ otpauthUri, secret, className }: AuthenticatorQrProps) {
  const [dataUrl, setDataUrl] = useState<string>('')
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(otpauthUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 220,
      color: { dark: '#0B1526', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [otpauthUri])

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('idle')
    }
  }

  const groupedSecret = secret.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()

  return (
    <div className={className ?? 'space-y-3'}>
      <p className="text-sm text-ink-soft">
        Scan with Google Authenticator, Microsoft Authenticator, 1Password, or Apple Passwords.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Authenticator QR code for Veyvio Command"
            className="h-[220px] w-[220px] rounded-lg border border-border-strong bg-white p-2"
          />
        ) : (
          <div className="flex h-[220px] w-[220px] items-center justify-center rounded-lg border border-border-strong bg-surface-muted text-sm text-ink-soft">
            Preparing QR…
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-ink-soft">
            Or enter this key manually in your authenticator app:
          </p>
          <code className="block break-all rounded-lg bg-surface-muted px-3 py-2 font-mono text-sm tracking-wide text-ink">
            {groupedSecret}
          </code>
          <button
            type="button"
            onClick={copySecret}
            className="text-sm font-medium text-command-700 hover:underline"
          >
            {copyState === 'copied' ? 'Key copied' : 'Copy key'}
          </button>
        </div>
      </div>
    </div>
  )
}
