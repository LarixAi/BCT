/** Correlation + deployment identity for Command API auth failures (TI-401). */

export function correlationIdFrom(request: Request): string {
  const header = request.headers.get('x-veyvio-request-id')?.trim()
  if (header) return header
  return crypto.randomUUID()
}

export function deploymentIdentity(): {
  deploymentSha: string | null
  denoDeploymentId: string | null
} {
  return {
    deploymentSha: Deno.env.get('VEYVIO_DEPLOYMENT_SHA') ?? null,
    denoDeploymentId: Deno.env.get('DENO_DEPLOYMENT_ID') ?? null,
  }
}

export function logCommandApiFailure(error: unknown, extras?: { route?: string }) {
  const identity = deploymentIdentity()
  const err = error && typeof error === 'object' ? (error as Record<string, unknown>) : {}
  console.error(
    JSON.stringify({
      event: 'command_api_failure',
      correlation_id: typeof err.correlationId === 'string' ? err.correlationId : null,
      auth_stage: typeof err.authStage === 'string' ? err.authStage : null,
      code: typeof err.code === 'string' ? err.code : null,
      status: typeof err.status === 'number' ? err.status : null,
      route: extras?.route ?? null,
      deployment_sha: identity.deploymentSha,
      deno_deployment_id: identity.denoDeploymentId,
      message: error instanceof Error ? error.message : String(error),
    }),
  )
}
