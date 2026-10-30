import { useSearchParams } from 'react-router-dom';
import { InhouseWaste } from './InhouseWaste';
import { LabourJobs } from './LabourJobs';
import { WastePurchases } from './WastePurchases';
import { RecycledMaterials } from './RecycledMaterials';

export function RecyclingPage() {
  const [params, setParams] = useSearchParams();
  const selected = ['1', '2', '3', '4'].includes(params.get('module') ?? '') ? params.get('module')! : '1';
  const select = (module: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set('module', module); return next; });
  return <div>
    <h1 className="text-2xl font-semibold text-navy">Recycling</h1>
    <p className="mt-2 text-sm text-gray-500">Four modules, each with its own workflow. Select a module to continue.</p>
    <nav aria-label="Recycling modules" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {['1', '2', '3', '4'].map(module => <button key={module} type="button" aria-current={selected === module ? 'page' : undefined} onClick={() => select(module)} className={`min-h-24 rounded-xl border p-4 text-left ${selected === module ? 'border-teal bg-teal/10 text-navy' : 'border-gray-200 bg-white text-gray-600'}`}>
        <span className="block text-sm font-semibold">Module {module}</span>
        <span className="mt-1 block text-sm">{module === '1' ? 'Waste Purchases' : module === '2' ? 'Recycled Materials' : module === '3' ? 'Labour Job' : 'In-house Waste Delivery'}</span>
      </button>)}
    </nav>
    <div hidden={selected !== '1'}><WastePurchases /></div>
    <div hidden={selected !== '2'}><RecycledMaterials /></div>
    <div hidden={selected !== '3'}><LabourJobs /></div>
    <div hidden={selected !== '4'}><InhouseWaste /></div>
  </div>;
}
