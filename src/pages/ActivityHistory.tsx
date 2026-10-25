import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface EntryEvent { id: number; actor: string; actorId: string; at: string; key: string; version: number; content: unknown; hash: string }
interface Page { results: EntryEvent[]; nextBefore: number | null }

export function ActivityHistory() {
  const { user } = useAuth();
  const allowed = ['admin', 'project_manager', 'production_manager', 'accounts'].includes(user?.role ?? '');
  const [page, setPage] = useState<Page>({ results: [], nextBefore: null });
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [key, setKey] = useState(''), [filter, setFilter] = useState('');
  const [before, setBefore] = useState<number>(), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    let active = true; setLoading(true); setError('');
    void api.get<Page>('/management/activity/', { params: { key: filter || undefined, before }, timeout: 20000 })
      .then(({ data }) => { if (active) setPage(data); })
      .catch(() => { if (active) setError('Unable to load saved entry history. Check the backend connection and your management access.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, filter, before, attempt]);
  if (!allowed) return <p role="alert">Management access is required to review entry history.</p>;
  return <div className="space-y-5"><h1 className="text-2xl font-semibold text-navy">Saved Entry History</h1>
    <p className="text-sm text-gray-600">Review database-confirmed supporting entries, who saved them, when, and each retained version. Orders, purchases, quotations and Job Cards retain their existing module histories.</p>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setBefore(undefined); setFilter(key.trim()); setAttempt(n => n + 1); }}>
      <label className="text-sm">Record group<input className="mt-1 block rounded-lg border px-3 py-2" placeholder="All groups, or e.g. exchange-rates" value={key} onChange={event => setKey(event.target.value)} /></label><button disabled={loading}>Refresh history</button>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading ? <p role="status">Loading database history…</p> : !error && <><div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-left text-sm"><thead><tr>{['Saved at', 'Staff member', 'Record group', 'Version', 'Saved content'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{page.results.map(row => <tr key={row.id} className="border-t"><td className="whitespace-nowrap px-4 py-3">{new Date(row.at).toLocaleString()}</td><td className="px-4 py-3">{row.actor}</td><td className="px-4 py-3">{row.key}</td><td className="px-4 py-3">{row.version}</td><td className="px-4 py-3"><details><summary>Inspect saved version</summary><pre className="mt-2 max-h-96 max-w-xl overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-3 text-xs">{JSON.stringify(row.content, null, 2)}</pre></details></td></tr>)}</tbody></table>{!page.results.length && <p className="p-6 text-gray-500">No saved entry versions match this group.</p>}</div><div className="flex flex-wrap gap-3"><button disabled={!before} onClick={() => setBefore(undefined)}>Latest entries</button><button disabled={!page.nextBefore} onClick={() => setBefore(page.nextBefore ?? undefined)}>Older entries</button></div></>}
  </div>;
}
