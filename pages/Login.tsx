import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, ArrowRight } from 'lucide-react';
import { auth } from '../lib/auth';
import { getErrorMessage } from '../lib/errors';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await auth.login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError(getErrorMessage(error));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Mic className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Birth Voices Hub</h1>
          </div>

          <h2 className="text-xl font-semibold text-center mb-6 text-slate-700">Login</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : <>Entrar <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Não tem uma conta? <Link to="/register" className="text-blue-600 hover:underline">Registre-se</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
