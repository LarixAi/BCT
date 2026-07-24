/** Server IDs that mean the mutation was not persisted on Command. */
export function isUntrustedServerId(serverId: string | undefined | null): boolean {
  if (!serverId) return true;
  return (
    serverId.startsWith("ack_") ||
    serverId.startsWith("cmd_local_") ||
    serverId.startsWith("op_")
  );
}
