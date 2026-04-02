import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid bundling `pg` into the server bundle (fixes resolution/runtime issues).
  serverExternalPackages: ["pg"],
};

export default nextConfig;
