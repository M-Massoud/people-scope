import type { Metadata } from "next";
import "./globals.css";
import { appFont } from "./fonts";
import { QueryProvider } from "@/components";

export const metadata: Metadata = {
  title: "PeopleScope · People analytics",
  description: "Explore people by registration date, age, gender, and country.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${appFont.variable} font-sans`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
