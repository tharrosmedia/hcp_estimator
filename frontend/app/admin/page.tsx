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
  const [hasHcpKey, setHasHcpKey] = useState(false);
  const [pricebookCount, setPricebookCount] = useState<number | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  // Pre-defined global settings used by the estimate builder, calcs, etc.
  const [markup, setMarkup] = useState('0.40');
  const [taxRate, setTaxRate] = useState('0.06');
  const [laborRate, setLaborRate] = useState('85');
  const [creditCardFee, setCreditCardFee] = useState('0.03');
  const [financingFee, setFinancingFee] = useState('0.0499');

  const fetchData = async () => {
    try {
      const [s, k] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/hcp-key'),
      ]);
      const data = s.data || [];
      setSettings(data);

      const getVal = (key: string, def: string) => data.find((x: any) => x.key === key)?.value ?? def;

      setMarkup(getVal('markup', '0.40'));
      setTaxRate(getVal('tax_rate', '0.06'));
      setLaborRate(getVal('labor_rate', '85'));
      setCreditCardFee(getVal('credit_card_fee', '0.03'));
      setFinancingFee(getVal('financing_fee', '0.0499'));

      if (k.data) {
        setHasHcpKey(!!k.data.hasKey);
      }

      // load current pricebook count (clean UX)
      try {
        const pb = await api.get('/pricebook');
        setPricebookCount((pb.data || []).length);
      } catch {}

      // load companies and users for management (admin only)
      try {
        const [comps, usrs] = await Promise.all([
          api.get('/admin/companies'),
          api.get('/admin/users'),
        ]);
        setCompanies(comps.data || []);
        setUsersList(usrs.data || []);
      } catch {}
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  const saveSettingValue = async (key: string, value: string) => {
    if (!value && value !== '0') return;
    try {
      await api.post('/admin/settings', { key, value });
      toast.success(`${key} saved`);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save setting');
    }
  };

  const saveSetting = async () => {
    if (!newKey || !newValue) return;
    try {
      await api.post('/admin/settings', { key: newKey, value: newValue });
      toast.success('Setting saved');
      setNewKey(''); setNewValue('');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save setting');
    }
  };

  const saveHcpKey = async () => {
    if (!hcpKey) return;
    try {
      await api.post('/admin/hcp-key', { hcpApiKey: hcpKey });
      toast.success('HCP key saved for your company');
      setHasHcpKey(true);
      setHcpKey(''); // clear input after save (it's sensitive)
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save key');
    }
  };

  const refreshPricebook = async () => {
    try {
      const { data } = await api.post('/pricebook/refresh');
      toast.success(`Pricebook refreshed: ${data.synced ?? 0} items`);
      // refresh count after successful sync
      try {
        const pb = await api.get('/pricebook');
        setPricebookCount((pb.data || []).length);
      } catch {}
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const createCompany = async () => {
    if (!newCompanyName) return;
    try {
      await api.post('/admin/companies', { name: newCompanyName });
      toast.success('Company created and you have been assigned as admin');
      setNewCompanyName('');
      // refresh token from DB (new role/company)
      const rt = localStorage.getItem('refreshToken');
      if (rt) {
        try {
          const resp = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
          });
          if (resp.ok) {
            const d = await resp.json();
            if (d.accessToken) localStorage.setItem('accessToken', d.accessToken);
          }
        } catch {}
      }
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create company');
    }
  };

  const addUserToCompany = async () => {
    if (!newUserEmail) return;
    try {
      await api.post('/admin/users', { email: newUserEmail });
      toast.success('User added to company');
      setNewUserEmail('');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to add user');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Admin &amp; Config</h1>

      <Card>
        <CardHeader><CardTitle>Global Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            These power the estimate builder (labor auto-calc, payment variants, etc). Store as decimals (0.40 = 40%).
          </div>

          {/* Laid out important settings */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-medium mb-1">Default Markup</div>
                <div className="flex gap-2">
                  <Input value={markup} onChange={e => setMarkup(e.target.value)} placeholder="0.40" className="w-28" />
                  <Button size="sm" onClick={() => saveSettingValue('markup', markup)}>Save</Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1">Tax Rate</div>
                <div className="flex gap-2">
                  <Input value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="0.06" className="w-28" />
                  <Button size="sm" onClick={() => saveSettingValue('tax_rate', taxRate)}>Save</Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1">Labor Rate ($/hr)</div>
                <div className="flex gap-2">
                  <Input value={laborRate} onChange={e => setLaborRate(e.target.value)} placeholder="85" className="w-28" />
                  <Button size="sm" onClick={() => saveSettingValue('labor_rate', laborRate)}>Save</Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1">Credit Card Fee</div>
                <div className="flex gap-2">
                  <Input value={creditCardFee} onChange={e => setCreditCardFee(e.target.value)} placeholder="0.03" className="w-28" />
                  <Button size="sm" onClick={() => saveSettingValue('credit_card_fee', creditCardFee)}>Save</Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1">Financing Fee</div>
                <div className="flex gap-2">
                  <Input value={financingFee} onChange={e => setFinancingFee(e.target.value)} placeholder="0.0499" className="w-28" />
                  <Button size="sm" onClick={() => saveSettingValue('financing_fee', financingFee)}>Save</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Raw list of all + ability to add custom/other */}
          <div>
            <div className="text-xs font-medium mb-1 mt-2">All current settings (including custom)</div>
            <div className="space-y-1 text-sm">
              {settings.length === 0 && <div className="text-muted-foreground">None yet (defaults will be seeded on startup).</div>}
              {settings.map((s, i) => <div key={i}>{s.key}: <code>{s.value}</code></div>)}
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground mb-2">Add custom / other setting:</div>
            <div className="flex gap-2">
              <Input placeholder="key e.g. some_other" value={newKey} onChange={e => setNewKey(e.target.value)} className="flex-1" />
              <Input placeholder="value" value={newValue} onChange={e => setNewValue(e.target.value)} className="w-28" />
              <Button onClick={saveSetting}>Add/Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your Housecall Pro API Key</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input 
            type="password" 
            placeholder="Paste your HCP API key" 
            value={hcpKey} 
            onChange={e => setHcpKey(e.target.value)} 
          />
          <Button onClick={saveHcpKey}>Save Key</Button>
          {hasHcpKey && (
            <div className="text-xs text-green-600">A key is currently saved for your company.</div>
          )}
          <div className="text-xs">Per-company key used for pushing estimates and pricebook sync.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pricebook</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={refreshPricebook} className="w-full">Refresh Pricebook from HCP</Button>
          {pricebookCount !== null && (
            <p className="text-xs mt-2 text-muted-foreground">Currently {pricebookCount} items in database.</p>
          )}
          <p className="text-xs mt-1 text-muted-foreground">Scheduled daily via cron.</p>
        </CardContent>
      </Card>

      {/* Company & User Management */}
      <Card>
        <CardHeader><CardTitle>Companies</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Company name (e.g. tharrosmedia)" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} />
            <Button onClick={createCompany}>Create</Button>
          </div>
          <div className="text-sm">
            {companies.length === 0 && <div className="text-muted-foreground">No companies yet.</div>}
            {companies.map((c: any) => (
              <div key={c.id} className="border-b py-1">{c.name} (id: {c.id})</div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Users in Your Company</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-1">
            {usersList.length === 0 && <div className="text-muted-foreground">No users yet.</div>}
            {usersList.map((u: any) => (
              <div key={u.id} className="border-b py-1">
                {u.email} ({u.role || 'sales'})
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="email@example.com"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addUserToCompany}>Add User</Button>
          </div>
          <div className="text-xs text-muted-foreground">Add users by email (must be unique). They can log in and will belong to this company. New logins from unknown emails auto-create their own company based on domain.</div>
        </CardContent>
      </Card>

      <Button variant="ghost" onClick={() => window.history.back()}>Back</Button>
    </div>
  );
}
