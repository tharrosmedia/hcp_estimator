'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [hcpKey, setHcpKey] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [s, k] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/hcp-key'),
      ]);
      setSettings(s.data);
      // key fetch is just presence
    } catch (e) {}
  };

  const saveSetting = async () => {
    if (!newKey || !newValue) return;
    await api.post('/admin/settings', { key: newKey, value: newValue });
    toast.success('Setting saved');
    setNewKey(''); setNewValue('');
    fetchData();
  };

  const saveHcpKey = async () => {
    await api.post('/admin/hcp-key', { hcpApiKey: hcpKey });
    toast.success('HCP key saved for your account');
  };

  const refreshPricebook = async () => {
    try {
      await api.post('/pricebook/refresh');
      toast.success('Pricebook refresh triggered');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Admin &amp; Config</h1>

      <Card>
        <CardHeader><CardTitle>Global Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {settings.map((s, i) => <div key={i} className="text-sm">{s.key}: <code>{s.value}</code></div>)}
          </div>
          <div className="flex gap-2 mt-4">
            <Input placeholder="key e.g. markup" value={newKey} onChange={e => setNewKey(e.target.value)} />
            <Input placeholder="value" value={newValue} onChange={e => setNewValue(e.target.value)} />
            <Button onClick={saveSetting}>Save</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your Housecall Pro API Key</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" placeholder="Paste your HCP API key" value={hcpKey} onChange={e => setHcpKey(e.target.value)} />
          <Button onClick={saveHcpKey}>Save Key</Button>
          <div className="text-xs">Used for pushing estimates and pricebook sync.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pricebook</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={refreshPricebook} className="w-full">Refresh Pricebook from HCP</Button>
          <p className="text-xs mt-2 text-muted-foreground">Scheduled daily via cron.</p>
        </CardContent>
      </Card>

      <Button variant="ghost" onClick={() => window.history.back()}>Back</Button>
    </div>
  );
}
