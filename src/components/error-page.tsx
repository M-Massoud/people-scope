"use client";
import { PAGES } from "@/config";

import { ArrowLeft, CircleAlert, RotateCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui";
import { cn } from "@/lib";
import { PageFallback } from "./page-fallback";

export function ErrorPage() {
  return (
    <>
      <title>Something went wrong · PeopleScope</title>
      <PageFallback
        label="Something went wrong"
        title="We couldn’t load this page"
        description="An unexpected error interrupted this view. Reload the page to try again, or return to the dashboard."
        icon={<CircleAlert aria-hidden="true" />}
      >
        {/* A full reload also clears client state that may have caused the error. */}
        <Button size="lg" onClick={() => window.location.reload()}>
          <RotateCw data-icon="inline-start" />
          Reload page
        </Button>
        <a
          href={PAGES["profile-timeline"].href}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to dashboard
        </a>
      </PageFallback>
    </>
  );
}
