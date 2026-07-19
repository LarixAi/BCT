export {
  ensureOverlayPermissionBeforeNav,
  canShowFloatingBubble,
} from "@/lib/navigation/floatingBubble";

/** @deprecated use ensureOverlayPermissionBeforeNav */
export async function promptForOverlayPermissionIfNeeded() {
  const { ensureOverlayPermissionBeforeNav } = await import("@/lib/navigation/floatingBubble");
  const result = await ensureOverlayPermissionBeforeNav();
  return result.granted;
}
