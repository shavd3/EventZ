'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Incorrect password.');
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next');
      // Full reload so the proxy re-evaluates with the new cookie.
      window.location.href = next && next.startsWith('/') ? next : '/';
    } catch {
      setError('Unable to sign in. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="text-center mb-8">
        <Image
          src="/logo.png"
          alt="Amaya & Shavin"
          width={96}
          height={96}
          className="mx-auto mb-3"
          style={{ mixBlendMode: 'multiply' }}
          priority
        />
        <h1 className="text-2xl font-bold text-gold">Wedding Planner</h1>
        <p className="text-warm-gray-light text-sm mt-1">Amaya &amp; Shavin</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-warm-gray mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Lock size={15} />
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
