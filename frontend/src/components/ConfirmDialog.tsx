import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  subtitle,
  description,
  confirmLabel,
  busyLabel = "Processando...",
  busy = false,
  tone = "danger",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title} subtitle={subtitle}>
      <p className="text-sm leading-relaxed text-stone-600">{description}</p>
      <div className="mt-6 flex justify-end gap-2.5 border-t border-stone-100 pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="hs-btn-secondary"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={tone === "danger" ? "hs-btn-danger" : "hs-btn-primary"}
        >
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
