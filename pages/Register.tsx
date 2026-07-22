import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { auth } from '../lib/auth';
import { AtlasLogo } from '../components/design-system';

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, companyName })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta.');
      }

      auth.setToken(data.token, data.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError((err instanceof Error && err.message) || 'Erro de conexão.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="p-2 bg-white border border-slate-200 rounded-lg">
              <AtlasLogo className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Birth Voices Hub</h1>
          </div>

          <h2 className="text-xl font-semibold text-center mb-6 text-slate-700">Criar Nova Organização</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Profissional</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Criando...' : <>Começar Grátis <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Já tem uma conta? <Link to="/login" className="text-brand hover:underline">Faça Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}