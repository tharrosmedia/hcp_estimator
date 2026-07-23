'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { MaterialList } from '@/components/estimate/MaterialList';
import { LaborList } from '@/components/estimate/LaborList';
import { VariantDisplay } from '@/components/estimate/VariantDisplay';
import { calculatePreview } from '@/lib/calc';

export default function EstimateDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [estimate, setEstimate] = useState<any>(null);
  const [calc, setCalc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const estRes = await api.get(`/estimates/${params.id}`);
      setEstimate(estRes.data);

      // Try server calc, fallback to client preview
      try {
        const calcRes = await api.get(`/estimates/${params.id}/calc`);
        setCalc(calcRes.data);
      } catch {
        const preview = calculatePreview({
          materials: estRes.data.materials || [],
          labor: estRes.data.labor || [],
          markup: estRes.data.markup,
          taxRate: estRes.data.taxRate,
          creditCardFee: 0.03,
          financingFee: 0.0499,
        });
        setCalc(preview);
      }
    } catch (e) {
      toast.error('Failed to load estimate');
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    try {
      await api.post(`/estimates/${params.id}/push`);
      toast.success('Pushed to Housecall Pro!');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Push failed');
    }
  };

  const handleDuplicate = async () => {
    try {
      const { data } = await api.post(`/estimates/${params.id}/duplicate`);
      toast.success('Duplicated');
      router.push(`/estimates/${data.id}`);
    } catch (e) {
      toast.error('Duplicate failed');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (!estimate) return <div className="p-4">Not found</div>;

  const preview = calc || calculatePreview({
    materials: estimate.materials || [],
    labor: estimate.labor || [],
    markup: estimate.markup,
    taxRate: estimate.taxRate,
    creditCardFee: 0.03,
    financingFee: 0.0499,
  });

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between mb-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDuplicate}>Duplicate</Button>
          <Button onClick={handlePush} disabled={estimate.status === 'pushed_to_hcp'}>Push to HCP</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{estimate.customerName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>Status: <span className="font-medium capitalize">{estimate.status.replace('_', ' ')}</span></div>
            <div>Markup: {(estimate.markup * 100).toFixed(0)}%</div>
            <div>Tax: {(estimate.taxRate * 100).toFixed(0)}%</div>
            {estimate.hcpJobId && <div>HCP Job: <code className="text-xs">{estimate.hcpJobId}</code></div>}
            {estimate.hcpEstimateId && <div>HCP Estimate: <code className="text-xs">{estimate.hcpEstimateId}</code></div>}
          </div>

          <div>
            <h4 className="font-semibold mb-2">Materials</h4>
            <MaterialList
              materials={estimate.materials || []}
              onRemove={() => {}}
              showSelling
              markup={estimate.markup}
            />
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">Labor (internal)</h4>
            <LaborList
              labor={estimate.labor || []}
              onRemove={() => {}}
            />
          </div>

          {preview && (
            <div className="mt-6">
              <VariantDisplay variants={preview.variants} grandTotal={preview.grandTotal} />
              <div className="mt-2 text-sm text-muted-foreground">
                 Labor: ${preview.laborTotal?.toFixed(2)}

              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 text-xs text-center text-muted-foreground">
        Labor is included in the total but labor lines are not sent to Housecall Pro.
      </div>
    </div>
  );
}
