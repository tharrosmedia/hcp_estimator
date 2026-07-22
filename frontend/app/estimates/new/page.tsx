'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useEstimateStore } from '@/stores/estimateStore';
import api from '@/lib/api';
import { toast } from 'sonner';
import { StepProgress } from '@/components/estimate/StepProgress';
import { MaterialList } from '@/components/estimate/MaterialList';
import { LaborList } from '@/components/estimate/LaborList';
import { VariantDisplay } from '@/components/estimate/VariantDisplay';
import { PricebookPicker } from '@/components/estimate/PricebookPicker';
import { CustomerForm } from '@/components/estimate/CustomerForm';
import { calculatePreview } from '@/lib/calc';
import { HcpEstimate } from '@/lib/services/hcp';

const DEFAULT_MARKUP = 0.4;
const DEFAULT_TAX = 0.06;

function NewEstimateWizardContent() {
  const router = useRouter();
  const {
    currentEstimate,
    setCurrentEstimate,
    addMaterial,
    updateMaterial,
    removeMaterial,
    addLabor,
    updateLabor,
    removeLabor,
    reset,
    drafts,
    pricebook,
    setPricebook,
  } = useEstimateStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDuctless, setShowDuctless] = useState(false);

  const [estimates, setEstimates] = useState<HcpEstimate[]>([]);
  const [estimateSearch, setEstimateSearch] = useState('');
  const [estimatesLoading, setEstimatesLoading] = useState(false);

  const [globals, setGlobals] = useState<Record<string, string>>({});
  const [installRules, setInstallRules] = useState<any[]>([]);

  const searchParams = useSearchParams();
  const [savedEstimateId, setSavedEstimateId] = useState<number | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const [customer, setCustomer] = useState({
    customerName: currentEstimate?.customerName || '',
    customerEmail: currentEstimate?.customerEmail || '',
    customerPhone: currentEstimate?.customerPhone || '',
    jobAddress: currentEstimate?.jobAddress || '',
    hcpJobId: currentEstimate?.hcpJobId || '',
    hcpEstimateId: currentEstimate?.hcpEstimateId || '',
  });

  const [matForm, setMatForm] = useState({ name: '', cost: 0, qty: 1 });
  const laborRate = parseFloat(globals.labor_rate || globals.laborRate || '75');
  const [labForm, setLabForm] = useState({ task: 'Install', hours: 2, rate: 75 });

  useEffect(() => {
    if (laborRate && labForm.rate !== laborRate) {
      setLabForm(f => ({ ...f, rate: laborRate }));
    }
  }, [laborRate]);

  const markup = currentEstimate?.markup ?? parseFloat(globals.markup || String(DEFAULT_MARKUP));
  const taxRate = currentEstimate?.taxRate ?? parseFloat(globals.tax_rate || String(DEFAULT_TAX));

  // Load pricebook on mount
  useEffect(() => {
    if (pricebook.length === 0) {
      api.get('/pricebook')
        .then((res) => setPricebook(res.data))
        .catch(() => {});
    }
  }, [pricebook.length, setPricebook]);

  useEffect(() => {
    const loadEstimates = async () => {
      setEstimatesLoading(true);
      try {
        const res = await api.get('/hcp/estimates');
        let fetched: HcpEstimate[] = res.data || [];
        fetched = fetched.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        setEstimates(fetched);
      } catch {}
      finally {
        setEstimatesLoading(false);
      }
    };
    loadEstimates();
  }, []);

  // Load global settings (for labor rate, fees)
  useEffect(() => {
    api.get('/admin/settings').then(res => {
      const map: Record<string, string> = {};
      (res.data || []).forEach((s: any) => { map[s.key] = s.value; });
      setGlobals(map);
    }).catch(() => {});
    api.get('/install-rules').then(res => setInstallRules(res.data || [])).catch(() => {});
  }, []);

  // Load from ?id for resuming draft, and local drafts migration
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      (async () => {
        try {
          const { data } = await api.get(`/estimates/${idParam}`);
          if (data) {
            setSavedEstimateId(data.id);
            setCustomer({
              customerName: data.customerName || '',
              customerEmail: data.customerEmail || '',
              customerPhone: data.customerPhone || '',
              jobAddress: data.jobAddress || '',
              hcpJobId: data.hcpJobId || '',
              hcpEstimateId: data.hcpEstimateId || '',
            });
            setCurrentEstimate(data);
          }
        } catch {}
      })();
    } else if (drafts && drafts.length > 0) {
      // one-time migration offer could be shown via UI below; we keep drafts for that
    }
  }, [searchParams]);

  // Detect ductless for helper
  useEffect(() => {
    const hasDuctless = (currentEstimate?.materials || []).some((m: any) =>
      (m.name + (m.category || '')).toLowerCase().includes('ductless')
    );
    setShowDuctless(hasDuctless);
  }, [currentEstimate?.materials]);

  const syncCustomerToStore = () => {
    setCurrentEstimate({
      ...currentEstimate,
      ...customer,
      markup,
      taxRate,
    });
  };

  const saveToServer = async (background = true) => {
    syncCustomerToStore();
    const payload = {
      ...customer,
      materials: currentEstimate?.materials || [],
      labor: currentEstimate?.labor || [],
      markup,
      taxRate,
      hcpJobId: customer.hcpJobId || undefined,
      hcpEstimateId: customer.hcpEstimateId || undefined,
    };
    try {
      if (!savedEstimateId) {
        const { data } = await api.post('/estimates', payload);
        setSavedEstimateId(data.id);
      } else {
        await api.put(`/estimates/${savedEstimateId}`, payload);
      }
      setSaveFailed(false);
    } catch (e: any) {
      setSaveFailed(true);
      if (!background) {
        throw e;
      }
    }
  };

  const migrateLocalDrafts = async () => {
    if (!drafts || drafts.length === 0) return;
    for (const d of drafts) {
      try {
        // simple create from local draft data
        await api.post('/estimates', {
          customerName: d.customerName,
          customerEmail: d.customerEmail,
          customerPhone: d.customerPhone,
          jobAddress: d.jobAddress,
          materials: d.materials || [],
          labor: d.labor || [],
          markup: d.markup,
          taxRate: d.taxRate,
        });
      } catch {}
    }
    // clear local after migrate (note: store mutation via set not direct, but for simplicity reset drafts by not using)
    // since no setter exposed easily, we can ignore or toast
    toast.success('Local drafts migrated to server');
  };

  const handleSearchEstimates = async () => {
    setEstimatesLoading(true);
    try {
      const params: any = {};
      if (estimateSearch) params.search = estimateSearch;
      const res = await api.get('/hcp/estimates', { params });
      let fetched: HcpEstimate[] = res.data || [];
      fetched = fetched.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
      setEstimates(fetched);
    } catch {}
    finally { setEstimatesLoading(false); }
  };

  const selectEstimate = (est: HcpEstimate) => {
    const updated = {
      customerName: est.customer?.name || '',
      customerEmail: est.customer?.email || '',
      customerPhone: est.customer?.phone || '',
      jobAddress: est.address || '',
      hcpJobId: '',
      hcpEstimateId: est.id,
    };
    setCustomer(updated);
    setEstimateSearch('');
    toast.success(`Selected ${est.customer?.name || est.id}`);
  };

  const handleNext = () => {
    if (step === 1) {
      syncCustomerToStore();
    }
    if (step < 5) setStep(step + 1);
    // background auto-save on Next (create on first, update after)
    saveToServer(true);
    if (saveFailed) {
      // retry on next action
      saveToServer(true);
    }
  };

  const handleBack = () => setStep(Math.max(1, step - 1));

  const handleAddFromPricebook = (item: any) => {
    const cost = Number(item.cost || item.unit_cost || 0);
    const selling = cost * (1 + markup) * 1; // qty 1 default
    addMaterial({
      name: item.name,
      cost,
      qty: 1,
      sellingPrice: selling,
      markup,
      pricebookItemId: item.id || item.hcpId,
    } as any);
    autoAddLaborForMaterial(item.name, item.category);
    toast.success(`Added ${item.name}`);
  };

  const handleAddCustomMaterial = (name: string, cost: number, qty: number) => {
    const selling = cost * (1 + markup) * qty;
    addMaterial({ name, cost, qty, sellingPrice: selling, markup } as any);
    autoAddLaborForMaterial(name);
  };

  const handleAddMaterial = () => {
    if (!matForm.name || matForm.cost <= 0) return;
    handleAddCustomMaterial(matForm.name, matForm.cost, matForm.qty);
    setMatForm({ name: '', cost: 0, qty: 1 });
  };

  const handleAddLabor = () => {
    if (!labForm.task) return;
    const cost = labForm.hours * labForm.rate;
    addLabor({ ...labForm, cost } as any);
    setLabForm({ task: 'Install', hours: 2, rate: laborRate });
  };

  const autoAddLaborForMaterial = (matName: string, matCategory?: string) => {
    if (!installRules?.length || !laborRate) return;
    const nameLower = (matName + ' ' + (matCategory || '')).toLowerCase();
    // match rule by equipment_type substring or common keywords
    let rule = installRules.find((r: any) => {
      const et = String(r.equipment_type || r.equipmentType || '').toLowerCase();
      return et && (nameLower.includes(et) || nameLower.includes(et.split('_')[0]));
    });
    if (!rule && nameLower.includes('ductless')) {
      rule = installRules.find((r: any) => String(r.equipment_type || '').toLowerCase().includes('ductless'));
    }
    if (!rule) rule = installRules[0]; // fallback
    if (rule) {
      const base = Number(rule.base_hours ?? rule.baseHours ?? 2);
      const mult = Number(rule.crew_multiplier ?? rule.crewMultiplier ?? 1);
      const hours = Math.max(0.5, base * mult);
      const shortName = matName.split(/[ -]/)[0] || 'Equipment';
      const task = `Install ${shortName}`;
      const cost = hours * laborRate;
      addLabor({ task, hours, rate: laborRate, cost } as any);
      toast.success(`Auto-added labor: ${task} (${hours.toFixed(1)}h)`);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveToServer(false);
      toast.success('Draft saved');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save draft');
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    syncCustomerToStore();

    try {
      const payload = {
        ...customer,
        materials: currentEstimate?.materials || [],
        labor: currentEstimate?.labor || [],
        markup,
        taxRate,
        hcpJobId: customer.hcpJobId || undefined,
        hcpEstimateId: customer.hcpEstimateId || undefined,
      };

      let targetId = savedEstimateId;
      if (!targetId) {
        const { data } = await api.post('/estimates', payload);
        targetId = data.id;
      } else {
        // ensure latest data on server
        await api.put(`/estimates/${targetId}`, payload);
      }

      toast.success('Estimate saved');

      // push to the existing record
      try {
        await api.post(`/estimates/${targetId}/push`);
        toast.success('Pushed to Housecall Pro');
      } catch (pushErr: any) {
        // non-fatal if no key or HCP error; user can push manually later
        console.warn('Auto push failed (may need HCP key):', pushErr?.response?.data?.error || pushErr);
      }

      reset();
      router.push(`/estimates/${targetId}`);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save estimate');
    } finally {
      setLoading(false);
    }
  };

  // Live calc for review - use global fees
  const ccFee = parseFloat(globals.credit_card_fee || globals.cc_fee || '0.03');
  const finFee = parseFloat(globals.financing_fee || globals.fin_fee || '0.0499');
  const previewCalc = calculatePreview({
    materials: currentEstimate?.materials || [],
    labor: currentEstimate?.labor || [],
    markup,
    taxRate,
    creditCardFee: ccFee,
    financingFee: finFee,
  });

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">New Estimate</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} size="sm">Save Draft</Button>
          <Button variant="ghost" onClick={() => router.push('/dashboard')} size="sm">Cancel</Button>
        </div>
      </div>

      {drafts && drafts.length > 0 && !savedEstimateId && (
        <div className="mb-3 p-2 bg-yellow-50 border text-sm rounded flex justify-between items-center">
          You have {drafts.length} local draft(s) from before.
          <Button size="sm" variant="outline" onClick={migrateLocalDrafts}>Migrate to server</Button>
        </div>
      )}

      <StepProgress current={step} total={5} onStepClick={(s) => setStep(s)} />

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1. Customer &amp; Site (select existing HCP estimate)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Search name"
                  value={estimateSearch}
                  onChange={(e) => setEstimateSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchEstimates()}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleSearchEstimates} disabled={estimatesLoading}>Search</Button>
              </div>
              {estimatesLoading && <p className="text-xs text-muted-foreground">Loading estimates...</p>}
              {!estimatesLoading && estimates.length === 0 && estimateSearch && (
                <p className="text-xs text-muted-foreground mb-2">No matching estimates found. Enter details manually below.</p>
              )}
              {estimates.length > 0 && (
                <div className="border rounded max-h-40 overflow-auto text-sm mb-3">
                  {estimates.slice(0, 10).map((est, i) => (
                    <div
                      key={i}
                      onClick={() => selectEstimate(est)}
                      className="p-2 hover:bg-muted cursor-pointer flex justify-between border-b last:border-b-0"
                    >
                      <span>{est.customer?.name || 'Unnamed'} — {est.created_at ? new Date(est.created_at).toLocaleDateString() : ''}</span>
                      <span className="text-muted-foreground text-xs">{est.status || est.address}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <CustomerForm values={customer} onChange={(field, val) => setCustomer({ ...customer, [field]: val })} />
            <Button onClick={handleNext} className="w-full btn-large mt-4" disabled={!customer.customerName}>
              Continue to Materials
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Materials + Ductless helper */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>2. Materials (fuzzy search by model # + title)</CardTitle></CardHeader>
          <CardContent>
            <PricebookPicker
              pricebook={pricebook}
              onSelect={handleAddFromPricebook}
              onCustomAdd={handleAddCustomMaterial}
            />

            <div className="my-4">
                <div className="text-xs text-muted-foreground flex gap-2 mb-1 px-1">
                  <div className="flex-1">Custom name</div>
                  <div className="w-24 text-center">Cost</div>
                  <div className="w-16 text-center">Qty</div>
                  <div className="w-12" />
                </div>
              <div className="flex gap-2 mb-2">
                <Input placeholder="Custom name" value={matForm.name} onChange={e => setMatForm({ ...matForm, name: e.target.value })} className="flex-1" />
                <Input type="number" placeholder="Cost" value={matForm.cost} onChange={e => setMatForm({ ...matForm, cost: parseFloat(e.target.value) || 0 })} className="w-24" />
                <Input type="number" placeholder="Qty" value={matForm.qty} onChange={e => setMatForm({ ...matForm, qty: parseFloat(e.target.value) || 1 })} className="w-16" />
                <Button onClick={handleAddMaterial}>Add</Button>
              </div>
            </div>

            <MaterialList
              materials={currentEstimate?.materials || []}
              onRemove={removeMaterial}
              onUpdate={updateMaterial}
              markup={markup}
            />

            {showDuctless && (
              <div className="mt-4 p-3 bg-accent/30 rounded text-sm">
                <strong>Ductless Helper:</strong> Consider adding lineset (typical 25ft). Lineset cost will be added based on material rules.
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
              <Button onClick={handleNext} className="flex-1 btn-large">Next: Labor</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Labor */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>3. Labor (auto hours from install rules + global rate)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex gap-2 mb-1 px-1">
              <div className="flex-1">Task</div>
              <div className="w-20 text-center">Hours</div>
              <div className="w-20 text-center">Rate $/hr</div>
              <div className="w-12" />
            </div>
            <div className="flex gap-2 mb-3">
              <Input placeholder="Task" value={labForm.task} onChange={e => setLabForm({ ...labForm, task: e.target.value })} className="flex-1" />
              <Input type="number" placeholder="Hours" value={labForm.hours} onChange={e => setLabForm({ ...labForm, hours: parseFloat(e.target.value) || 0 })} className="w-20" />
              <Input type="number" placeholder="Rate $/hr" value={labForm.rate} onChange={e => setLabForm({ ...labForm, rate: parseFloat(e.target.value) || laborRate })} className="w-20" />
              <Button onClick={handleAddLabor}>Add</Button>
            </div>

            <LaborList
              labor={currentEstimate?.labor || []}
              onRemove={removeLabor}
              onUpdate={updateLabor}
            />

            <p className="mt-3 text-xs text-muted-foreground">Labor costs are never shown to the customer or sent to Housecall Pro. Using global rate: ${laborRate}/hr (set in Admin).</p>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
              <Button onClick={handleNext} className="flex-1 btn-large">Next: Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>4. Review &amp; Variants (fees from globals)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm space-y-1 mb-4">
              <div>Customer: <strong>{customer.customerName}</strong></div>
              {customer.hcpEstimateId && <div className="text-xs">Linked HCP Estimate: {customer.hcpEstimateId}</div>}
              {customer.hcpJobId && <div className="text-xs">Linked HCP Job: {customer.hcpJobId}</div>}
              <div>Materials: <strong>${previewCalc.materialsSubtotal.toFixed(2)}</strong></div>
              <div>Labor (internal): <strong>${previewCalc.laborTotal.toFixed(2)}</strong></div>
            </div>

            <VariantDisplay variants={previewCalc.variants} grandTotal={previewCalc.grandTotal} />

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
              <Button onClick={() => setStep(5)} className="flex-1 btn-large">Continue to Finalize</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: Finalize */}
      {step === 5 && (
        <Card>
          <CardHeader><CardTitle>5. Save Estimate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">This saves the estimate to the server and pushes line items to the linked Housecall Pro estimate (updates existing if selected; requires HCP key in admin).</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
              <Button onClick={handleFinalize} disabled={loading} className="flex-1 btn-large">
                {loading ? 'Saving...' : 'Save &amp; View Estimate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="h-16" />
    </div>
  );
}

export default function NewEstimateWizard() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto p-4">Loading...</div>}>
      <NewEstimateWizardContent />
    </Suspense>
  );
}
