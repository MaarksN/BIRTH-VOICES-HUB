import React, { useEffect, useState } from 'react';
import { Loader2, Save, Shield, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';
import { auth } from '../../lib/auth';
import { useSessionStore } from '../../store/useSessionStore';
import { User } from '../../types';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState('branding');
  const setBrandColor = useSessionStore((state) => state.setBrandColor);
  const [user, setUser] = useState<User | null>(auth.getUser());
  const [branding, setBranding] = useState({ color: user?.brandColor || '#2563eb', name: user?.company || '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    api.me()
      .then(({ user: currentUser }) => {
        if (!cancelled) {
          setUser(currentUser);
          setBranding({
            name: currentUser.company || '',
            color: currentUser.brandColor || '#2563eb',
          });
          if (currentUser.brandColor) setBrandColor(currentUser.brandColor);
        }
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setBrandColor]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await api.updateMe({
        company: branding.name,
        brandColor: branding.color,
      });
      setUser(response.user);
      auth.setToken(auth.getToken() || '', response.user);
      setBrandColor(branding.color);
      setMessage('Organização atualizada no backend.');
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando organização...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-brand">Organização</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Configurações reais</h1>
        <p className="mt-2 text-slate-600">Dados salvos na conta autenticada.</p>
      </div>

      {message && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('branding')} className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'branding' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Marca</button>
          <button onClick={() => setActiveTab('team')} className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'team' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Equipe</button>
          <button onClick={() => setActiveTab('audit')} className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'audit' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Auditoria</button>
        </div>

        <div className="p-6">
          {activeTab === 'branding' && (
            <div className="max-w-xl space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Nome da Organização</label>
                <input
                  type="text"
                  value={branding.name}
                  onChange={(event) => setBranding({ ...branding, name: event.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Cor da Marca</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={branding.color}
                    onChange={(event) => setBranding({ ...branding, color: event.target.value })}
                    className="h-10 w-20 cursor-pointer rounded border border-slate-300 p-1"
                  />
                  <span className="rounded bg-slate-100 px-2 py-1 font-mono text-sm text-slate-500">{branding.color}</span>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar alterações
              </button>
            </div>
          )}

          {activeTab === 'team' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Membros do time</h3>
                <button disabled className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-400">
                  <UserPlus className="h-4 w-4" />
                  Convites em breve
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand">
                    {user?.name?.slice(0, 1).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{user?.name}</div>
                    <div className="text-xs text-slate-500">{user?.email}</div>
                  </div>
                </div>
                <span className="rounded bg-brand-50 px-2 py-1 text-xs font-bold text-brand">{user?.role || 'Owner'}</span>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                <Shield className="h-4 w-4" />
                Eventos reais de auditoria ainda não estão habilitados.
              </div>
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Nenhum evento de auditoria registrado.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
