import type { NextConfig } from "next";
import { PAGES } from "./src/config";
const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    return [
      {
        source: "/",
        destination: PAGES["profile-timeline"].href,
        permanent: true,
      },
      {
        source: "/ages",
        destination: PAGES["age-groups"].href,
        permanent: true,
      },
      {
        source: "/demographics",
        destination: PAGES["age-gender"].href,
        permanent: true,
      },
      {
        source: "/countries",
        destination: PAGES.geography.href,
        permanent: true,
      },
      {
        source: "/comparison",
        destination: PAGES["compare-countries"].href,
        permanent: true,
      },
    ];
  },
};
export default config;
