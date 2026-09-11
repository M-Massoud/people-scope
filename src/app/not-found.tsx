import { PAGES } from "@/config";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Map, MapPinOff } from "lucide-react";
import { PageFallback } from "@/components";
import { buttonVariants } from "@/components/ui";
import { cn } from "@/lib";

export const metadata: Metadata = {
  title: "Page not found · PeopleScope",
};

export default function NotFound() {
  return (
    <PageFallback
      label="Error 404"
      title="Page not found"
      description="This page may have moved, or the address may be incorrect. Head back to your reports to continue exploring."
      icon={<MapPinOff aria-hidden="true" />}
    >
      <Link
        href={PAGES["profile-timeline"].href}
        className={cn(buttonVariants({ size: "lg" }))}
      >
        <ArrowLeft data-icon="inline-start" />
        Back to dashboard
      </Link>
      <Link
        href={PAGES.heatmap.href}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
      >
        <Map data-icon="inline-start" />
        Explore the map
      </Link>
    </PageFallback>
  );
}
