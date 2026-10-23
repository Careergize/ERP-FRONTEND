import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { ENTRY_INPUT } from '@/components/ui/SearchSelect';
import { JobDraftCommands, jobDraftApi, jobPK, type JobDraftRecord, type JobDraftCommand } from '@/lib/jobDraftApi';
import { orderDraftApi, orderPK, type DraftRecord } from '@/lib/orderDraftApi';
import { JOB_BUTTON } from './JobCardUI';

export function ControlledJobDraftWorkspace() {
  const { user } = useAuth();
  // Remount on actor change to isolate record content and pending commands.
  return <Workspace key={user?.id ?? ''} actor={user?.id ?? ''} />;
}
function Workspace({ actor }: { actor: string }) {
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const controller = useMemo(() => {
    try { return new JobDraftCommands(actor, sessionStorage); } catch { return null; }
  }, [actor]);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [canCreate, setCanCreate] = useState(false);
  const [jobId, setJobId] = useState(params.get('jobDraft') ?? '');
  const [sourceId, setSourceId] = useState(''), [reason, setReason] = useState('');
  const [order, setOrder] = useState<DraftRecord | null>(null), [job, setJob] = useState<JobDraftRecord | null>(null);
  const [history, setHistory] = useState<unknown>(null);
  const [corrections, setCorrections] = useState<JobDraftCommand['corrections']>({});
  const real = !!actor && !actor.startsWith('demo-');
  const locked = busy || !controller || !!controller.pending || controller.conflict;
  const run = async (work: () => Promise<void>) => {
    if (busy || !real) return;
    setBusy(true); setError(''); setNotice('');
    try { await work(); } catch (e) { if (active.current) setError(e instanceof Error ? e.message : 'Request failed.'); }
    finally { if (active.current) setBusy(false); }
  };
  const open = async (value: string) => {
    if (controller?.pending) return;
    if (controller) controller.conflict = true;
    const loaded = await jobDraftApi.read(jobPK(value));
    const source = loaded.salesOrderId ? await orderDraftApi.read(orderPK(loaded.salesOrderId)) : null;
    if (!active.current) return;
    setJob(loaded); setOrder(source); setCorrections({}); setHistory(null); setJobId(String(loaded.workflowKey));
    if (controller) controller.conflict = false;
    setParams({ jobDraft: String(loaded.workflowKey) });
  };
  useEffect(() => {
    if (!real) return;
    void run(async () => {
      const result = await jobDraftApi.capabilities();
      if (active.current) setCanCreate(result.capabilities.create === true);
      const id = params.get('jobDraft');
      if (id && id !== 'new' && !controller?.pending) await open(id);
    });
  }, []);
  const save = () => run(async () => {
    if (!controller || !controller.pending && (!order || !reason.trim())) throw new Error('Load a source and enter a reason.');
    const command = controller.pending?.command ?? {
      expectedVersion: job?.workflowVersion ?? 0, reason, evidenceIds: [] as [], orderId: orderPK(order!.id),
      expectedOrderVersion: order!.controlVersion!, sourceConfirmedRevision: order!.confirmedRevision!, corrections,
    };
    const result = await controller.save(job?.workflowKey ?? null, command);
    if (result && active.current) {
      setJob(result); setJobId(String(result.workflowKey)); setCorrections({}); setReason('');
      setParams({ jobDraft: String(result.workflowKey) }); setNotice(`Backend saved version ${result.workflowVersion}.`);
    }
  });
  return <Card className="space-y-4">
    <h2 className="font-semibold">Controlled Job Card Draft test workspace</h2>
    <p className="text-amber-800">Synthetic local API only. Confirmation authority is unavailable. Approval, rejection and issue remain blocked by D01/D02/D04/D05.</p>
    {!real && <p>Sign in with a real Django test account.</p>}
    {!controller && <p role="alert">Pending-command storage could not be read. Saving is blocked.</p>}
    {controller?.pending && <details open><summary>Unconfirmed command retained for exact retry</summary><pre className="overflow-auto text-xs">{JSON.stringify(controller.pending, null, 2)}</pre></details>}
    {error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status">{notice}</p>}
    {busy && <p role="status">Waiting for backend…</p>}
    <label className="block">Numeric WorkflowJob ID<input className={ENTRY_INPUT} value={jobId} onChange={e => setJobId(e.target.value)} /></label>
    <button className={JOB_BUTTON} disabled={!real || busy || !!controller?.pending} onClick={() => void run(() => open(jobId))}>Reopen from backend (discard edits)</button>
    {!job && <><label className="block">Source WorkflowOrder ID<input className={ENTRY_INPUT} value={sourceId} onChange={e => setSourceId(e.target.value)} /></label>
      <button className={JOB_BUTTON} disabled={!real || locked} onClick={() => void run(async () => {
        const loaded = await orderDraftApi.read(orderPK(sourceId)); if (active.current) setOrder(loaded);
      })}>Inspect source</button></>}
    {order && <div><p>{order.orderNumber} · {order.commercialStatus ?? 'Unknown'} · version {order.controlVersion ?? 'Unknown'} · confirmed revision {order.confirmedRevision ?? 'None'}</p>
      {order.commercialStatus !== 'Confirmed' && <p>A Sales Order Draft cannot authorize production.</p>}</div>}
    {job && <><p>{job.jobCardNumber} · review: {job.reviewStatus} · version {job.workflowVersion ?? 'Unknown'} · source revision {job.sourceConfirmedRevision ?? 'Unknown'}</p>
      <p>{job.operationalBlockCodes.join(', ')}</p><details><summary>Bound source snapshot</summary><pre className="overflow-auto text-xs">{JSON.stringify(job.sourceOrderSnapshot, null, 2)}</pre></details>
      {job.manufacturingItems?.map(item => <section key={item.id} className="space-y-2 border p-3">
        <p>{item.product} · {item.qty} {item.unit}</p>
        {item.requiredMaterials.map(material => <p key={material.id}>{material.name} ({material.materialId}) · required {material.requiredQuantity} {material.unit} · issued {material.issuedQuantity} · remaining {material.requiredQuantity - material.issuedQuantity}. QC release and stock scope: unknown; issue blocked.</p>)}
        {job.capabilities.edit && <label className="block">Specification correction<textarea className={ENTRY_INPUT} disabled={locked}
          value={corrections[item.salesOrderItemId]?.specifications ?? item.specifications}
          onChange={e => setCorrections(current => ({ ...current, [item.salesOrderItemId]: { specifications: e.target.value } }))} /></label>}
      </section>)}
      <button className={JOB_BUTTON} disabled={!real || locked} onClick={() => void run(async () => {
        const result = await jobDraftApi.history(job.workflowKey); if (active.current) setHistory(result);
      })}>Read revision history</button>
      {history !== null && <pre className="overflow-auto text-xs">{JSON.stringify(history, null, 2)}</pre>}</>}
    <label className="block">Save reason<input className={ENTRY_INPUT} disabled={locked} value={reason} onChange={e => setReason(e.target.value)} /></label>
    {controller?.pending ? <button className={JOB_BUTTON} disabled={busy || !real} onClick={() => void save()}>Retry exact pending save</button> :
      (job?.capabilities.edit || !job && canCreate) && <button className={JOB_BUTTON} disabled={locked || !real || !order || !reason.trim() || !order.confirmedRevision}
        onClick={() => void save()}>{job ? 'Save Draft correction' : 'Create Job Card Draft'}</button>}
    {!canCreate && !job && <p>Creation is blocked until the authoritative confirmation service is implemented.</p>}
  </Card>;
}
