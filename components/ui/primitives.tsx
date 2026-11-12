"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X, Info } from "lucide-react";
import type { Evidence } from "@/lib/contracts/region";

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "science" | "caution" | "cyan";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function EvidenceBadge({ value }: { value: Evidence }) {
  return (
    <Badge
      tone={
        value === "Scenario"
          ? "science"
          : value === "Unavailable"
            ? "muted"
            : "cyan"
      }
    >
      {value}
    </Badge>
  );
}
export function Notice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="notice">
      <Info size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <div className="supporting">{children}</div>
      </div>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    const label = trigger?.getAttribute("aria-label");
    return () => {
      dialog?.close();
      if (trigger?.isConnected) trigger.focus();
      else if (label)
        document
          .querySelector<HTMLElement>(`[aria-label="${CSS.escape(label)}"]`)
          ?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
          ),
        ).filter((el) => el.getClientRects().length > 0);
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="dialog-content">{children}</div>
    </dialog>
  );
}
export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
