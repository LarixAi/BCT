/**
 * Ridova-era RPC (`link_driver_account`) is not used on Veyvio Command.
 * Driver ↔ auth linking happens in command-api `accept-invitation`.
 */
export async function linkDriverAccountIfNeeded() {
  return null;
}
