import type { StatusPainel, TipoAlerta } from "../types";

export function PanelStatusBadge({ status }: { status: StatusPainel | null | undefined }) {
  if (status === "ativo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        Ativo
      </span>
    );
  }
  if (status === "manutencao") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300/80">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
        Manutenção
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">
      <span className="h-1.5 w-1.5 rounded-full bg-stone-500" aria-hidden="true" />
      Inativo
    </span>
  );
}

export function AlertTypeBadge({ tipo }: { tipo: TipoAlerta }) {
  if (tipo === "ZERO_DIURNO") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-950 ring-1 ring-amber-300/80">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-700" aria-hidden="true" />
        Zero diurno
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-900 ring-1 ring-rose-300/80">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-700" aria-hidden="true" />
      Acima da capacidade
    </span>
  );
}
