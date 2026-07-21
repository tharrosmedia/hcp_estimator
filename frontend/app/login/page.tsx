'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email });
      
      if (data.devToken) {
        setDevToken(data.devToken);
        // auto verify in dev
        await handleVerify(data.devToken);
      } else {
        toast.success('Magic link sent. Check your email or console.');
      }
    } catch (err) {
      toast.error('Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (token?: string) => {
    const t = token || devToken;
    if (!t) return;

    try {
      const { data } = await api.post('/auth/verify', { token: t });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Logged in');
      router.push('/dashboard');
    } catch (err) {
      toast.error('Invalid token');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">HCP Estimator</CardTitle>
          <CardDescription>Sign in with email (passwordless)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-lg py-6"
              />
            </div>
            <Button type="submit" className="w-full btn-large" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in with Email'}
            </Button>
          </form>

          {devToken && (
            <div className="mt-4 p-3 bg-muted rounded text-xs">
              Dev token: <code>{devToken}</code>
              <Button size="sm" className="ml-2" onClick={() => handleVerify()}>
                Login with token
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-6 text-center">
            Internal tool • Large buttons for field use
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
