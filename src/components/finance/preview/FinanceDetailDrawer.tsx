import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function FinanceDetailDrawer({ title, children, onDismiss }: { title: string; children: ReactNode; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const node = dialog.current; const trigger = document.activeElement; node?.showModal(); return () => { node?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); }; }, []);
  return <dialog ref={dialog} aria-labelledby={id} onCancel={e => { e.preventDefault(); onDismiss(); }} onKeyDown={e => {
    if (e.key !== 'Tab') return;
    const controls = [...e.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')].filter(node => !node.matches(':disabled') && node.tabIndex >= 0 && node.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (!first) { e.preventDefault(); e.currentTarget.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }} className="fixed inset-y-0 left-auto right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-lg overflow-y-auto border-0 bg-white p-6 text-ink backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#668075]">Demo Data · preview only</p><h2 id={id} className="break-words text-xl font-semibold text-[#123b29]">{title}</h2></div><button type="button" onClick={onDismiss} aria-label={`Close ${title} details`} className="shrink-0 rounded-lg border p-2"><X size={18} /></button></div>
    <div className="mt-6 break-words">{children}</div>
  </dialog>;
}
