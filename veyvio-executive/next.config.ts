import type { NextConfig } from "next";

const localDemo = String(process.env.VEYVIO_EXECUTIVE_LOCAL_DEMO ?? "")
  .trim()
  .toLowerCase();
const isLocalDemo =
  localDemo === "1" || localDemo === "true" || localDemo === "yes";

const nextConfig: NextConfig = {
  // Local demo only: Brave privacy modes can send Origin: "null" on
  // navigational auth POSTs. Production / Sites builds must keep this empty.
  ...(isLocalDemo ? { allowedDevOrigins: ["null"] } : {}),
};

export default nextConfig;
