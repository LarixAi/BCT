import { useYard } from "@/store/yard";

/** Drop cached operational data when company or depot context changes. */
export function clearYardState(): void {
  useYard.getState().resetToEmpty();
}
