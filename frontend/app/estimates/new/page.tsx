'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { HcpJob } from '@/lib/services/hcp';

const DEFAULT_MARKUP = 0.4;
const DEFAULT_TAX = 0.06;

export default function NewEstimateWizard() {
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
    saveDraft,
    pricebook,
    setPricebook,
  } = useEstimateStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDuctless, setShowDuctless] = useState(false);

  // HCP Jobs for Section 1
  const [jobs, setJobs] = useState<HcpJob[]>([]);
  const [jobSearch, setJobSearch] = useState('');
  const [jobsLoading, setJobsLoading] = useState(false);
  const defaultedJobRef = useRef(false);

  // Global settings (labor rate, fees)
  const [globals, setGlobals] = useState<Record<string, string>>({});
  const [installRules, setInstallRules] = useState<any[]>([]);

  // Local form states for current step
  const [customer, setCustomer] = useState({
    customerName: currentEstimate?.customerName || '',
    customerEmail: currentEstimate?.customerEmail || '',
    customerPhone: currentEstimate?.customerPhone || '',
    jobAddress: currentEstimate?.jobAddress || '',
    hcpJobId: currentEstimate?.hcpJobId || '',
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
        .catch(() => {
          // fallback to empty, user can add custom
        });
    }
  }, [pricebook.length, setPricebook]);

  // Load today's HCP jobs for customer step (default to first)
  useEffect(() => {
    const loadJobs = async () => {
      setJobsLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await api.get('/hcp/jobs', { params: { date: today } });
        let fetched: HcpJob[] = res.data || [];
        if (fetched.length === 0) {
          // fallback fetch without date filter
          const all = await api.get('/hcp/jobs');
          fetched = all.data || [];
        }
        setJobs(fetched);
        // default to today's first if no customer name yet
        if (!defaultedJobRef.current && !customer.customerName && fetched.length > 0) {
          defaultedJobRef.current = true;
          const first = fetched[0];
          const c = {
            customerName: first.customer?.name || '',
            customerEmail: first.customer?.email || '',
            customerPhone: first.customer?.phone || '',
            jobAddress: first.address || '',
            hcpJobId: first.id,
          };
          setCustomer(c);
        }
      } catch (e) {
        // silent, jobs optional
      } finally {
        setJobsLoading(false);
      }
    };
    loadJobs();
  }, []); // once on mount

  // Load global settings (for labor rate, fees)
  useEffect(() => {
    api.get('/admin/settings').then(res => {
      const map: Record<string, string> = {};
      (res.data || []).forEach((s: any) => { map[s.key] = s.value; });
      setGlobals(map);
    }).catch(() => {});
    api.get('/install-rules').then(res => setInstallRules(res.data || [])).catch(() => {});
  }, []);

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

  const handleSearchJobs = async () => {
    setJobsLoading(true);
    try {
      const params: any = {};
      if (jobSearch) params.search = jobSearch;
      const res = await api.get('/hcp/jobs', { params });
      setJobs(res.data || []);
    } catch {}
    finally { setJobsLoading(false); }
  };

  const selectJob = (job: HcpJob) => {
    const updated = {
      customerName: job.customer?.name || '',
      customerEmail: job.customer?.email || '',
      customerPhone: job.customer?.phone || '',
      jobAddress: job.address || '',
      hcpJobId: job.id,
    };
    setCustomer(updated);
    setJobSearch('');
    toast.success(`Selected ${job.customer?.name || job.id}`);
  };

  const handleNext = () => {
    if (step === 1) {
      syncCustomerToStore();
    }
    if (step < 5) setStep(step + 1);
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

  const handleSaveDraft = () => {
    syncCustomerToStore();
    saveDraft();
    toast.success('Draft saved (local + store)');
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
      };
      const { data } = await api.post('/estimates', payload);
      toast.success('Estimate saved');

      // Section 5: auto push to linked HCP estimate on save
      try {
        await api.post(`/estimates/${data.id}/push`);
        toast.success('Pushed to Housecall Pro');
      } catch (pushErr: any) {
        // non-fatal if no key or HCP error; user can push manually later
        console.warn('Auto push failed (may need HCP key):', pushErr?.response?.data?.error || pushErr);
      }

      reset();
      router.push(`/estimates/${data.id}`);
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

      <StepProgress current={step} total={5} onStepClick={(s) => setStep(s)} />

      {/* STEP 1: Customer */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1. Customer &amp; Site (pull from HCP calendar)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Search name (defaults to today's first)"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchJobs()}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleSearchJobs} disabled={jobsLoading}>Search</Button>
              </div>
              {jobsLoading && <p className="text-xs text-muted-foreground">Loading jobs...</p>}
              {!jobsLoading && jobs.length === 0 && jobSearch && (
                <p className="text-xs text-muted-foreground mb-2">No matching jobs found. Enter details manually below.</p>
              )}
              {jobs.length > 0 && (
                <div className="border rounded max-h-40 overflow-auto text-sm mb-3">
                  {jobs.slice(0, 10).map((job, i) => (
                    <div
                      key={i}
                      onClick={() => selectJob(job)}
                      className="p-2 hover:bg-muted cursor-pointer flex justify-between border-b last:border-b-0"
                    >
                      <span>{job.customer?.name || 'Unnamed'} — {job.scheduled_date || ''}</span>
                      <span className="text-muted-foreground text-xs">{job.address}</span>
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
                <div className="w-24 text-center">Unit cost</div>
                <div className="w-16 text-center">Qty</div>
                <div className="w-12" />
              </div>
              <div className="flex gap-2 mb-2">
                <Input placeholder="Custom name" value={matForm.name} onChange={e => setMatForm({ ...matForm, name: e.target.value })} className="flex-1" />
                <Input type="number" placeholder="Unit cost" value={matForm.cost} onChange={e => setMatForm({ ...matForm, cost: parseFloat(e.target.value) || 0 })} className="w-24" />
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
            <p className="text-sm">This saves the estimate locally and pushes line items to the linked Housecall Pro job/estimate (requires your HCP key in admin).</p>
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
