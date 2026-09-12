"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui";

type CopyViewLinkProps = {
  viewKey: string;
  getUrl?: () => string;
};

export function CopyViewLink(props: CopyViewLinkProps) {
  // A view change also invalidates any clipboard promise still in flight.
  return <CopyViewLinkButton key={props.viewKey} {...props} />;
}

function CopyViewLinkButton({ viewKey, getUrl }: CopyViewLinkProps) {
  const [feedback, setFeedback] = useState<{
    viewKey: string;
    copied: boolean;
  } | null>(null);
  const current = feedback?.viewKey === viewKey ? feedback : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          const copiedView = viewKey;
          try {
            const url = getUrl ? getUrl() : window.location.href;
            await navigator.clipboard.writeText(url);
            setFeedback({ viewKey: copiedView, copied: true });
          } catch {
            setFeedback({ viewKey: copiedView, copied: false });
          }
        }}
      >
        {current?.copied ? (
          <Check data-icon="inline-start" />
        ) : (
          <LinkIcon data-icon="inline-start" />
        )}
        Copy view link
      </Button>
      <span role="status" className="text-xs text-muted-foreground">
        {current
          ? current.copied
            ? "Link copied"
            : "Copy the browser address to share this view."
          : ""}
      </span>
    </div>
  );
}
