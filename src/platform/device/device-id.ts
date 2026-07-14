const DEVICE_KEY = "veyvio-yard-device-id";

function generateId(): string {
  return `dev_${crypto.randomUUID().slice(0, 12)}`;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "dev_ssr";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}
