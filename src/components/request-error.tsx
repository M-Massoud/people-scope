"use client";

import { useState, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { Alert, AlertTitle, AlertDescription, Button } from "@/components/ui";
import { cn } from "@/lib";

type RequestErrorProps = {
  message?: string | null;
  onRetry: () => void;
  retrying: boolean;
  retryLabel?: string;
  title?: string;
  actions?: ReactNode;
  fallback?: ReactNode;
  className?: string;
};

// Keep mounted and key by request identity so a retry can retain its error message.
export function RequestError({
  message,
  onRetry,
  retrying,
  retryLabel = "Try again",
  title,
  actions,
  fallback,
  className,
}: RequestErrorProps) {
  const [lastMessage, setLastMessage] = useState(message);
  if (message && message !== lastMessage) setLastMessage(message);
  if (!message && !retrying && lastMessage) setLastMessage(null);
  const visibleMessage = message || (retrying ? lastMessage : null);
  if (!visibleMessage) return fallback ?? null;

  return (
    <Alert className={cn("flex flex-col gap-3 p-4 sm:p-6", className)}>
      {title && (
        <AlertTitle>
          <h2>{title}</h2>
        </AlertTitle>
      )}
      <AlertDescription>{visibleMessage}</AlertDescription>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <Button
          variant="outline"
          size="sm"
          disabled={retrying}
          onClick={onRetry}
        >
          <RotateCw data-icon="inline-start" />
          {retrying ? "Retrying…" : retryLabel}
        </Button>
        <span role="status" className="sr-only">
          {retrying ? "Retrying…" : ""}
        </span>
      </div>
    </Alert>
  );
}
