import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./globals.css";
import { QueryProvider } from "@/components";

export const metadata: Metadata = {
  title: "PeopleScope · People analytics",
  description: "Explore people by registration date, age, gender, and country.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="font-sans">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
