import type { ReactNode } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui";
import { Shell } from "./shell";

export function PageFallback({
  label,
  title,
  description,
  icon,
  children,
}: {
  label: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Shell>
      <section
        className="mx-auto flex min-h-[calc(100svh-210px)] max-w-3xl items-center px-5 py-10 sm:px-9"
        aria-labelledby="fallback-title"
      >
        <div className="w-full rounded-2xl border bg-card px-2 py-8 shadow-sm sm:px-8 sm:py-12">
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <div className="mb-4 flex size-24 items-center justify-center rounded-3xl border border-primary/15 bg-primary/5 text-primary ring-8 ring-primary/[0.025] [&>svg]:size-11 [&>svg]:stroke-[1.5]">
                  {icon}
                </div>
              </EmptyMedia>
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                {label}
              </p>
              <h1 id="fallback-title" className="text-3xl sm:text-4xl">
                {title}
              </h1>
              <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="mt-3 flex w-full flex-col justify-center gap-3 sm:flex-row">
                {children}
              </div>
            </EmptyContent>
          </Empty>
        </div>
      </section>
    </Shell>
  );
}
