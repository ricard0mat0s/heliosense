import type { StatusPainel, TipoAlerta } from "../types";

export function PanelStatusBadge({ status }: { status: StatusPainel | null | undefined }) {
  if (status === "ativo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/80">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Ativo
      </span>
    );
  }
  if (status === "manutencao") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/90">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Manutenção
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">
      <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
      Inativo
    </span>
  );
}

export function AlertTypeBadge({ tipo }: { tipo: TipoAlerta }) {
  if (tipo === "ZERO_DIURNO") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-100/90 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300/70">
        ZERO_DIURNO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-rose-100/90 px-2 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-300/70">
      ACIMA_CAPACIDADE
    </span>
  );
}
