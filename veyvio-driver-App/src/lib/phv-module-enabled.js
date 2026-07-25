/** TfL PHV / legacy Base44 module — off by default in production builds. */
export function isPhvModuleEnabled() {
  return import.meta.env.VITE_ENABLE_PHV_MODULE === "true";
}
