import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { CepLookupStatus } from "../hooks/useCepAutoFill";
import { onlyDigits } from "../utils/format";

interface CepInputProps {
  id: string;
  value: string;
  status: CepLookupStatus;
  message: string | null;
  touched: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  required?: boolean;
}

export function CepInput({
  id,
  value,
  status,
  message,
  touched,
  onChange,
  onBlur,
  required = true,
}: CepInputProps) {
  const digits = onlyDigits(value);
  const showIncompleteError = touched && digits.length > 0 && digits.length < 8;
  const isLoading = status === "loading";
  const isSuccess = !showIncompleteError && (status === "found" || status === "partial");
  const isWarning = !showIncompleteError && (status === "not_found" || status === "error");

  const helperText = showIncompleteError
    ? "CEP deve conter 8 dígitos."
    : isLoading
      ? "Buscando endereço..."
      : message;

  const hintId = `${id}-hint`;

  const inputStateClasses = showIncompleteError
    ? "border-rose-500 hover:border-rose-600 focus:border-rose-600 focus:ring-rose-500/20"
    : isLoading
      ? "border-amber-600/70"
      : isSuccess
        ? "border-emerald-600/70 hover:border-emerald-700 focus:border-emerald-700 focus:ring-emerald-600/20"
        : isWarning
          ? "border-amber-500 hover:border-amber-600 focus:border-amber-700 focus:ring-amber-600/20"
          : "";

  const helperToneClasses = showIncompleteError
    ? "text-rose-700"
    : isWarning
      ? "text-amber-800"
      : "text-stone-600";

  return (
    <div>
      <label htmlFor={id} className="hs-label">
        CEP {required ? "*" : ""}
      </label>
      <div className="relative">
        <input
          id={id}
          required={required}
          minLength={9}
          inputMode="numeric"
          autoComplete="postal-code"
          aria-invalid={showIncompleteError}
          aria-busy={isLoading}
          aria-describedby={helperText ? hintId : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="39400-000"
          className={`hs-input font-mono-num pr-10 ${inputStateClasses}`}
        />
        {isLoading && (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-amber-700"
            aria-hidden="true"
          />
        )}
        {showIncompleteError && (
          <AlertCircle
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-600"
            aria-hidden="true"
          />
        )}
        {isSuccess && (
          <CheckCircle2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700"
            aria-hidden="true"
          />
        )}
        {isWarning && (
          <AlertCircle
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700"
            aria-hidden="true"
          />
        )}
      </div>
      {helperText && (
        <p
          id={hintId}
          role={showIncompleteError ? "alert" : "status"}
          aria-live="polite"
          className={`mt-1.5 text-xs font-medium leading-snug ${helperToneClasses}`}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
