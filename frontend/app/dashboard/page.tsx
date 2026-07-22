'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Estimate {
  id: number;
  customerName: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
      return;
    }
    if (userStr) setUser(JSON.parse(userStr));

    fetchEstimates();
  }, [router]);

  const fetchEstimates = async () => {
    try {
      const { data } = await api.get('/estimates');
      setEstimates(data);
    } catch (e) {
      toast.error('Failed to load estimates');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">HCP Estimator</h1>
          <p className="text-muted-foreground">Welcome, {user?.name || user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/estimates/new">
            <Button size="lg" className="btn-large">+ New Estimate</Button>
          </Link>
          <Button variant="outline" onClick={logout}>Logout</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : estimates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No estimates yet.</p>
              <Link href="/estimates/new" className="mt-4 inline-block">
                <Button>Create your first estimate</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
               {estimates.map((est) => {
                 const href = est.status === 'draft' ? `/estimates/new?id=${est.id}` : `/estimates/${est.id}`;
                 return (
                   <Link key={est.id} href={href} className="block py-4 hover:bg-muted/50 px-2 -mx-2 rounded">
                     <div className="flex justify-between items-center">
                       <div>
                         <div className="font-medium">{est.customerName}</div>
                         <div className="text-sm text-muted-foreground">{new Date(est.createdAt).toLocaleDateString()}</div>
                       </div>
                       <div className="text-sm px-3 py-1 rounded-full bg-secondary capitalize">{est.status.replace('_', ' ')}</div>
                     </div>
                   </Link>
                 );
               })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">Admin / Settings →</Link>
      </div>
    </div>
  );
}
