import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { ReactNode } from "react";

export type BannerTone = "success" | "error" | "warning" | "info";

interface FeedbackBannerProps {
  tone: BannerTone;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const toneStyles: Record<BannerTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  info: "border-stone-200 bg-stone-50 text-stone-800",
};

const toneIconStyles: Record<BannerTone, string> = {
  success: "text-emerald-700",
  error: "text-rose-700",
  warning: "text-amber-700",
  info: "text-stone-600",
};

export function FeedbackBanner({
  tone,
  children,
  onDismiss,
  className = "",
}: FeedbackBannerProps) {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "error"
        ? AlertCircle
        : tone === "warning"
          ? AlertTriangle
          : Info;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${toneStyles[tone]} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneIconStyles[tone]}`} aria-hidden="true" />
        <div className="min-w-0 leading-relaxed">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dispensar aviso"
          className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
