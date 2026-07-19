/** Normalise UK sort code to XX-XX-XX for display. */
export function formatSortCode(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export function maskAccountNumber(value) {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

export function isValidUkSortCode(sortCode) {
  return /^\d{2}-\d{2}-\d{2}$/.test(formatSortCode(sortCode));
}

export function isValidUkAccountNumber(accountNumber) {
  const digits = (accountNumber || "").replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 8;
}

export function readBankDetails(driver) {
  return {
    bank_account_name: driver?.bank_account_name || driver?.full_name || "",
    bank_sort_code: formatSortCode(driver?.bank_sort_code || ""),
    bank_account_number: (driver?.bank_account_number || "").replace(/\D/g, ""),
  };
}
