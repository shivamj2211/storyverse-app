"use client";

type AlertModalProps = {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  onOk?: () => void;
  okText?: string;
};

export default function AlertModal({
  open,
  title = "Notice",
  message,
  onClose,
  onOk,
  okText = "OK",
}: AlertModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <p className="mt-3 text-sm text-slate-700">{message}</p>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>

          <button
            onClick={() => {
              onOk?.();
              onClose();
            }}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
