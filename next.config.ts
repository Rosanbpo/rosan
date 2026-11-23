import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Fontes e logo dos slides do Instagram são lidos do disco em tempo de execução.
  outputFileTracingIncludes: {
    "/marketing/[id]/slide/[n]": ["./src/assets/marketing/**"],
    "/marketing/identidade/previa": ["./src/assets/marketing/**"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
