"use client";

import Link, { useLinkStatus } from "next/link";
import { useId, type ComponentProps } from "react";

type NavigationLinkProps = Pick<
  ComponentProps<typeof Link>,
  "href" | "children" | "aria-current"
> & { label: string };

export function NavigationLink({
  children,
  label,
  ...props
}: NavigationLinkProps) {
  const labelId = useId();
  return (
    <Link {...props} className="relative" aria-labelledby={labelId}>
      <span id={labelId} className="inline-flex items-center gap-[7px]">
        {children}
      </span>
      <NavigationPending label={label} />
    </Link>
  );
}

function NavigationPending({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span
        aria-hidden="true"
        data-pending={pending}
        className="pointer-events-none absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-primary opacity-0 transition-opacity duration-150 data-[pending=true]:opacity-100 data-[pending=true]:delay-100 motion-reduce:transition-none"
      />
      <span role="status" className="sr-only">
        {pending ? `Opening ${label}…` : ""}
      </span>
    </>
  );
}
