'use client';

import { useEffect, useState } from 'react';
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

  // Local form states for current step
  const [customer, setCustomer] = useState({
    customerName: currentEstimate?.customerName || '',
    customerEmail: currentEstimate?.customerEmail || '',
    customerPhone: currentEstimate?.customerPhone || '',
    jobAddress: currentEstimate?.jobAddress || '',
  });

  const [matForm, setMatForm] = useState({ name: '', cost: 0, qty: 1 });
  const [labForm, setLabForm] = useState({ task: 'Install', hours: 2, rate: 75 });

  const markup = currentEstimate?.markup ?? DEFAULT_MARKUP;
  const taxRate = currentEstimate?.taxRate ?? DEFAULT_TAX;

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
    toast.success(`Added ${item.name}`);
  };

  const handleAddCustomMaterial = (name: string, cost: number, qty: number) => {
    const selling = cost * (1 + markup) * qty;
    addMaterial({ name, cost, qty, sellingPrice: selling, markup } as any);
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
    setLabForm({ task: 'Install', hours: 2, rate: 75 });
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
      };
      const { data } = await api.post('/estimates', payload);
      toast.success('Estimate saved');
      reset();
      router.push(`/estimates/${data.id}`);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save estimate');
    } finally {
      setLoading(false);
    }
  };

  // Live calc for review
  const previewCalc = calculatePreview({
    materials: currentEstimate?.materials || [],
    labor: currentEstimate?.labor || [],
    markup,
    taxRate,
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
          <CardHeader><CardTitle>1. Customer &amp; Site</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
          <CardHeader><CardTitle>2. Materials</CardTitle></CardHeader>
          <CardContent>
            <PricebookPicker
              pricebook={pricebook}
              onSelect={handleAddFromPricebook}
              onCustomAdd={handleAddCustomMaterial}
            />

            <div className="my-4">
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
          <CardHeader><CardTitle>3. Labor (Internal Only)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Input placeholder="Task" value={labForm.task} onChange={e => setLabForm({ ...labForm, task: e.target.value })} className="flex-1" />
              <Input type="number" placeholder="Hrs" value={labForm.hours} onChange={e => setLabForm({ ...labForm, hours: parseFloat(e.target.value) || 0 })} className="w-20" />
              <Input type="number" placeholder="Rate" value={labForm.rate} onChange={e => setLabForm({ ...labForm, rate: parseFloat(e.target.value) || 75 })} className="w-20" />
              <Button onClick={handleAddLabor}>Add</Button>
            </div>

            <LaborList
              labor={currentEstimate?.labor || []}
              onRemove={removeLabor}
              onUpdate={updateLabor}
            />

            <p className="mt-3 text-xs text-muted-foreground">Labor costs are never shown to the customer or sent to Housecall Pro.</p>

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
          <CardHeader><CardTitle>4. Review &amp; Variants</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm space-y-1 mb-4">
              <div>Customer: <strong>{customer.customerName}</strong></div>
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
            <p className="text-sm">This saves the estimate to your account. You can push clean line items to Housecall Pro from the detail view.</p>
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
