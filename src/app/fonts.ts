import { IBM_Plex_Sans } from "next/font/google";

export const appFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-app",
});
