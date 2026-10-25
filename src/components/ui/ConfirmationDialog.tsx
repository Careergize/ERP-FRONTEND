import { useEffect, useId, useRef } from 'react';

export function ConfirmationDialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card bg-white p-6 text-ink shadow-xl backdrop:bg-black/40">
    <h2 id={titleId} className="text-xl font-semibold text-navy">{title}</h2>
    <div className="my-4 space-y-3 text-sm">{children}</div>
    <button type="button" autoFocus onClick={onClose} className="rounded-card px-4 py-2">OK</button>
  </dialog>;
}
