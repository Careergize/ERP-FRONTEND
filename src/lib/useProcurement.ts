import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { RAW_MATERIALS, RAW_MOVEMENTS, rawMaterialBalance, type RawMaterial } from './rawMaterialData';
import { fetchProcurement, persistRawPlan, inventoryError } from './rawInventoryApi';
import { validatePlan, type ProcurementItem } from './procurement';

export function useProcurement(){
  const {user}=useAuth();
  const [materials,setMaterials]=useState<RawMaterial[]>([]),[plans,setPlans]=useState<ProcurementItem[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[canPlan,setCanPlan]=useState(false);
  const owner=useRef(user?.id);owner.current=user?.id;
  const sequence=useRef(0);
  const reload=useCallback(async()=>{
    const id=user?.id,attempt=++sequence.current;if(!id)return;
    if(id.startsWith('demo-')){setMaterials(RAW_MATERIALS.map(m=>({...m,currentStock:rawMaterialBalance(m,RAW_MOVEMENTS).currentStock})));setCanPlan(['admin','store_keeper','production_manager','project_manager','accounts'].includes(user?.role??''));setLoading(false);return;}
    setLoading(true);setError('');
    try{const data=await fetchProcurement();if(owner.current===id&&sequence.current===attempt){setMaterials(data.materials);setPlans(data.plans);setCanPlan(data.canPlan);}}
    catch(e){if(owner.current===id&&sequence.current===attempt)setError(inventoryError(e));}
    finally{if(owner.current===id&&sequence.current===attempt)setLoading(false);}
  },[user?.id,user?.role]);
  useEffect(()=>{setPlans([]);setMaterials([]);setError('');setCanPlan(false);void reload();},[reload]);
  async function save(plan:ProcurementItem){
    const id=user?.id;if(!id||loading||error||!canPlan)throw new Error('Load procurement and check your plan permission before saving.');
    validatePlan(plan);
    const saved=id.startsWith('demo-')?structuredClone(plan):await persistRawPlan(plan).catch(e=>{throw new Error(inventoryError(e));});
    if(owner.current===id){sequence.current++;setPlans(old=>[...old.filter(p=>p.materialId!==saved.materialId),saved]);}
  }
  return {materials,plans,loading,error,canPlan,reload,save};
}
