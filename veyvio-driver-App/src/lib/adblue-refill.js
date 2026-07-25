export function shouldSuggestAdBlueDefect(input) {
  if (input.spillOrContamination) return true;
  const warningBefore = String(input.warningBefore ?? "none").replace(/-/g, "_");
  const warningCleared = String(input.warningCleared ?? "not_checked").replace(/-/g, "_");
  if (warningBefore === "no_restart" || warningBefore === "system_fault") return true;
  if (warningCleared === "no") return true;
  return false;
}

export function validateAdBlueRefillForm(input) {
  const mileage = Number(input.mileage);
  const amountLitres = Number(input.amountLitres);
  if (!Number.isFinite(amountLitres) || amountLitres <= 0) {
    return { ok: false, message: "Enter how many litres of AdBlue were added." };
  }
  if (!Number.isFinite(mileage) || mileage < 0) {
    return { ok: false, message: "Enter a valid odometer reading." };
  }
  const physicallyAddedBy = String(input.physicallyAddedBy ?? "self");
  if (physicallyAddedBy !== "self" && !String(input.physicallyAddedByName ?? "").trim()) {
    return { ok: false, message: "Enter who physically added the AdBlue." };
  }
  return { ok: true };
}

export function vehicleUsesAdBlue(vehicle) {
  const fuelType = String(
    vehicle?.fuelType ?? vehicle?.fuel_type ?? "",
  )
    .toLowerCase()
    .trim();
  if (!fuelType) return true;
  return ["diesel", "hybrid", "plugin_hybrid"].includes(fuelType);
}
