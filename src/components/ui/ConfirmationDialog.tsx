import { useEffect, useId, useRef } from 'react';

export function ConfirmationDialog({ title, children, onClose, wide = false, closeLabel = 'OK' }: { wide?: boolean; closeLabel?: string; title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] ${wide?'max-w-5xl':'max-w-md'} overflow-y-auto rounded-card bg-white p-6 text-ink shadow-xl backdrop:bg-black/40`}>
    <div className="flex items-start justify-between gap-4"><h2 id={titleId} className="text-xl font-semibold text-navy">{title}</h2>{wide&&<button type="button" autoFocus onClick={onClose} className="shrink-0 rounded-card border px-3 py-2 text-sm">{closeLabel}</button>}</div>
    <div className="my-4 space-y-3 text-sm">{children}</div>
    {!wide&&<button type="button" autoFocus onClick={onClose} className="rounded-card px-4 py-2">{closeLabel}</button>}
  </dialog>;
}
