import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createDemoAuthAdapter } from './demo-adapter'
import { createCommandAuthAdapter, readCommandAuthConfig } from './command-adapter'
import type { AuthAdapter, AuthIdentity, AuthMembership } from './types'

type AuthState = {
  status: 'checking' | 'signed_out' | 'mfa_required' | 'signed_in' | 'unavailable'
  identity: AuthIdentity | null
  activeMembership: AuthMembership | null
  mfaChallenge: { challengeId: string; pendingCompanyId: string | null } | null
  error: string | null
}

type AuthApi = AuthState & {
  signIn: (input: { email: string; password: string }) => Promise<void>
  completeMfa: (code: string) => Promise<void>
  signOut: () => Promise<void>
  selectOrganisation: (organisationId: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (input: { resetToken: string; password: string }) => Promise<void>
  acceptInvitation: (input: {
    invitationToken: string
    displayName: string
    password: string
  }) => Promise<boolean>
}

const AuthContext = createContext<AuthApi | null>(null)

function configuredAdapter(): AuthAdapter | null {
  const mode = (import.meta.env.VITE_AUTH_MODE ?? '').trim().toLowerCase()
  if (mode === 'demo' || import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    return createDemoAuthAdapter()
  }
  const command = readCommandAuthConfig()
  if (command && mode !== 'unavailable') return createCommandAuthAdapter(command)
  return mode ? null : createDemoAuthAdapter()
}

const defaultAuthAdapter = configuredAdapter()

export function AuthProvider({
  children,
  adapter = defaultAuthAdapter,
}: {
  children: ReactNode
  adapter?: AuthAdapter | null
}) {
  const [state, setState] = useState<AuthState>({
    status: adapter ? 'checking' : 'unavailable',
    identity: null,
    activeMembership: null,
    mfaChallenge: null,
    error: null,
  })

  useEffect(() => {
    if (!adapter) return
    let active = true
    void adapter
      .getIdentity()
      .then((identity) => {
        if (!active) return
        setState({
          status: identity ? 'signed_in' : 'signed_out',
          identity,
          activeMembership: null,
          mfaChallenge: null,
          error: null,
        })
      })
      .catch(() => {
        if (active) {
          setState({
            status: 'signed_out',
            identity: null,
            activeMembership: null,
            mfaChallenge: null,
            error: 'Could not check your session',
          })
        }
      })
    return () => {
      active = false
    }
  }, [adapter])

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      if (!adapter) throw new Error('Authentication provider is not configured')
      const result = await adapter.signIn(input)
      if (result.kind === 'mfa_required') {
        setState({
          status: 'mfa_required',
          identity: null,
          activeMembership: null,
          mfaChallenge: result,
          error: null,
        })
        return
      }
      setState({
        status: 'signed_in',
        identity: result.identity,
        activeMembership: null,
        mfaChallenge: null,
        error: null,
      })
    },
    [adapter],
  )

  const completeMfa = useCallback(async (code: string) => {
    if (!adapter) throw new Error('Authentication provider is not configured')
    if (!state.mfaChallenge) throw new Error('MFA challenge expired — sign in again')
    const identity = await adapter.completeMfa({
      ...state.mfaChallenge,
      code,
    })
    setState({
      status: 'signed_in',
      identity,
      activeMembership: null,
      mfaChallenge: null,
      error: null,
    })
  }, [adapter, state.mfaChallenge])

  const signOut = useCallback(async () => {
    await adapter?.signOut()
    setState({
      status: adapter ? 'signed_out' : 'unavailable',
      identity: null,
      activeMembership: null,
      mfaChallenge: null,
      error: null,
    })
  }, [adapter])

  const selectOrganisation = useCallback(async (organisationId: string) => {
    if (!adapter) throw new Error('Authentication provider is not configured')
    const currentMembership = state.identity?.memberships.find(
      (item) => item.organisationId === organisationId,
    )
    if (!currentMembership) throw new Error('You do not have access to this organisation')
    const identity = await adapter.selectOrganisation(organisationId)
    const membership = identity.memberships.find(
      (item) => item.organisationId === organisationId,
    )
    if (!membership) throw new Error('Finance access is not available for this company')
    setState((current) => ({
      ...current,
      identity,
      activeMembership: membership,
      error: null,
    }))
  }, [adapter, state.identity])

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!adapter) throw new Error('Authentication provider is not configured')
      await adapter.requestPasswordReset(email)
    },
    [adapter],
  )

  const updatePassword = useCallback(
    async (input: { resetToken: string; password: string }) => {
      if (!adapter) throw new Error('Authentication provider is not configured')
      await adapter.updatePassword(input)
    },
    [adapter],
  )

  const acceptInvitation = useCallback(
    async (input: {
      invitationToken: string
      displayName: string
      password: string
    }) => {
      if (!adapter) throw new Error('Authentication provider is not configured')
      const identity = await adapter.acceptInvitation(input)
      if (!identity) {
        setState({
          status: 'signed_out',
          identity: null,
          activeMembership: null,
          mfaChallenge: null,
          error: null,
        })
        return false
      }
      setState({
        status: 'signed_in',
        identity,
        activeMembership: null,
        mfaChallenge: null,
        error: null,
      })
      return true
    },
    [adapter],
  )

  const value = useMemo<AuthApi>(
    () => ({
      ...state,
      signIn,
      completeMfa,
      signOut,
      selectOrganisation,
      requestPasswordReset,
      updatePassword,
      acceptInvitation,
    }),
    [
      state,
      signIn,
      completeMfa,
      signOut,
      selectOrganisation,
      requestPasswordReset,
      updatePassword,
      acceptInvitation,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthApi {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requires AuthProvider')
  return context
}
