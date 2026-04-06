import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer info sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Basic XSS protection for older browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Restrict browser features (camera, mic, etc.)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // NOTE: Content-Security-Policy is intentionally omitted here.
  // Add a strict CSP when moving to SaaS (requires nonce-based setup
  // for Next.js inline scripts). Placeholder:
  // { key: "Content-Security-Policy", value: "default-src 'self'; ..." }
];

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
