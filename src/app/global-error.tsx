"use client";

import "./globals.css";
import { appFont } from "./fonts";
import { ErrorPage } from "@/components";

// This boundary replaces the root layout, including its styles and document.
export default function GlobalError() {
  return (
    <html lang="en" className={`${appFont.variable} font-sans`}>
      <body>
        <ErrorPage />
      </body>
    </html>
  );
}
