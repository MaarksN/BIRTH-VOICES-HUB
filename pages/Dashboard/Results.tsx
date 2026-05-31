import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Music,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDuration, parseDurationToSeconds, riskClass, sentimentClass, toCsvCell } from '../../lib/format';
import { RiskLevel, Sentiment, SessionRecord } from '../../types';

const sentiments: Array<'Todos' | Sentiment> = ['Todos', 'Positivo', 'Neutro', 'Negativo'];
const risks: Array<'Todos' | RiskLevel> = ['Todos', 'Baixo', 'Moderado', 'Alto'];

export default function ResultsPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<'Todos' | Sentiment>('Todos');
  const [riskFilter, setRiskFilter] = useState<'Todos' | RiskLevel>('Todos');
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await api.listSessions();
        if (!cancelled) {
          setSessions(response.sessions);
          setSelectedSession(response.sessions[0] || null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSessions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sessions.filter((session) => {
      const matchesSearch =
        !query ||
        session.id.toLowerCase().includes(query) ||
        session.caller.includes(searchTerm) ||
        session.agentName.toLowerCase().includes(query) ||
        session.summary.toLowerCase().includes(query) ||
        session.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesSentiment = sentimentFilter === 'Todos' || session.sentiment === sentimentFilter;
      const matchesRisk = riskFilter === 'Todos' || session.riskLevel === riskFilter;

      return matchesSearch && matchesSentiment && matchesRisk;
    });
  }, [sessions, searchTerm, sentimentFilter, riskFilter]);

  useEffect(() => {
    if (!selectedSession || !filteredSessions.some((session) => session.id === selectedSession.id)) {
      setSelectedSession(filteredSessions[0] || null);
    }
  }, [filteredSessions, selectedSession]);

  const metrics = useMemo(() => {
    const totalSeconds = filteredSessions.reduce((sum, session) => sum + parseDurationToSeconds(session.duration), 0);
    const positiveOrNeutral = filteredSessions.filter((session) => session.sentiment !== 'Negativo').length;
    const highRisk = filteredSessions.filter((session) => session.riskLevel === 'Alto').length;
    const averageScore = filteredSessions.length
      ? Math.round(filteredSessions.reduce((sum, session) => sum + session.score, 0) / filteredSessions.length)
      : 0;

    return {
      averageDuration: filteredSessions.length ? formatDuration(totalSeconds / filteredSessions.length) : '00:00',
      positiveNeutralRate: filteredSessions.length ? Math.round((positiveOrNeutral / filteredSessions.length) * 100) : 0,
      highRisk,
      averageScore,
    };
  }, [filteredSessions]);

  const handleExportCSV = () => {
    const headers = [
      'ID da Sessão',
      'Agente',
      'Contato',
      'Data e Hora',
      'Duração',
      'Sentimento',
      'Risco',
      'Score',
      'Tags',
      'Próxima Ação',
      'Resumo',
      'Transcrição Integral',
    ];

    const csvContent = [
      headers.map(toCsvCell).join(','),
      ...filteredSessions.map((session) => [
        session.id,
        session.agentName,
        session.caller,
        session.dateTime,
        session.duration,
        session.sentiment,
        session.riskLevel,
        session.score,
        session.tags.join('; '),
        session.followUp,
        session.summary,
        session.transcript,
      ].map(toCsvCell).join(',')),
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `birth_voices_resultados_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando sessões reais...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Resultados</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Transcrições e análises</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Esta página exibe apenas sessões salvas no backend desta instalação. Sem dados artificiais.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!filteredSessions.length}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Exportar CSV filtrado
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!sessions.length ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-950">Nenhuma sessão registrada</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Use o playground para conversar com um agente real via Gemini e salve a conversa como sessão, ou envie sessões pela API.
          </p>
          <Link to="/dashboard/playground" className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
            <Plus className="h-4 w-4" />
            Criar primeira sessão
          </Link>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Sessões filtradas" value={filteredSessions.length.toString()} helper={`${sessions.length} no total`} icon={FileText} />
            <MetricCard label="Duração média" value={metrics.averageDuration} helper="tempo por conversa" icon={Clock} />
            <MetricCard label="Positivo/Neutro" value={`${metrics.positiveNeutralRate}%`} helper="experiência registrada" icon={CheckCircle2} />
            <MetricCard label="Risco alto" value={metrics.highRisk.toString()} helper={`score médio ${metrics.averageScore}`} icon={AlertTriangle} danger={metrics.highRisk > 0} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por ID, agente, telefone, tag ou resumo..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <FilterSelect label="Sentimento" value={sentimentFilter} options={sentiments} onChange={(value) => setSentimentFilter(value as typeof sentimentFilter)} />
              <FilterSelect label="Risco" value={riskFilter} options={risks} onChange={(value) => setRiskFilter(value as typeof riskFilter)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-brand" />
                  <span className="text-sm font-bold text-slate-800">Chamadas</span>
                </div>
                <span className="text-xs font-semibold text-slate-500">{filteredSessions.length} resultados</span>
              </div>
              <div className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
                {filteredSessions.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Nenhuma sessão corresponde aos filtros atuais.
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSession(session)}
                      className={`block w-full border-l-4 p-4 text-left transition hover:bg-slate-50 ${
                        selectedSession?.id === session.id ? 'border-brand bg-brand-50' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-slate-500">{session.id}</p>
                          <h3 className="mt-1 truncate font-bold text-slate-950">{session.agentName}</h3>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${riskClass[session.riskLevel]}`}>
                          {session.riskLevel}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{session.summary}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono">{session.caller}</span>
                        <span>•</span>
                        <span>{session.duration}</span>
                        <span>•</span>
                        <span className={`rounded-full border px-2 py-0.5 font-bold ${sentimentClass[session.sentiment]}`}>{session.sentiment}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="min-h-[640px] rounded-lg border border-slate-200 bg-white shadow-sm">
              {selectedSession ? (
                <SessionDetail session={selectedSession} />
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center p-10 text-center text-sm text-slate-500">
                  Selecione uma chamada para visualizar análise, transcrição e próximos passos.
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function SessionDetail({ session }: { session: SessionRecord }) {
  return (
    <div className="space-y-6 p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-brand-50 px-2 py-1 font-mono text-xs font-bold text-brand">{session.id}</span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {session.dateTime}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950">{session.agentName}</h2>
          <p className="mt-1 font-mono text-sm text-slate-500">{session.caller}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${sentimentClass[session.sentiment]}`}>{session.sentiment}</span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${riskClass[session.riskLevel]}`}>Risco {session.riskLevel}</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">Score {session.score}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <FileText className="h-4 w-4" />
            Resumo operacional
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-700">{session.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {session.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-bold uppercase text-slate-500">Dados extraídos</h3>
          <div className="mt-3 space-y-3">
            {session.extracted.length ? session.extracted.map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-sm font-bold text-slate-900">{item.value}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-500">Nenhum campo estruturado salvo nesta sessão.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          Próxima ação
        </h3>
        <p className="mt-2 text-sm text-amber-900/80">{session.followUp}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-brand-50 p-2.5 text-brand">
            <Music className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-slate-950">Gravação da chamada</div>
            <div className="text-xs text-slate-500">Duração {session.duration}</div>
          </div>
        </div>
        <button
          disabled={!session.audioUrl}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Download className="h-4 w-4" />
          Baixar áudio
        </button>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
          <MessageSquare className="h-4 w-4" />
          Diálogo completo
        </h3>
        <div className="max-h-[340px] space-y-3 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-4">
          {session.transcript.split('\n').map((line, index) => {
            const isAgent = line.startsWith('Agente:');
            const cleanLine = line.replace('Agente:', '').replace('Usuário:', '').trim();
            return (
              <div key={`${session.id}-${index}`} className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                <span className="mb-1 text-[10px] font-semibold text-slate-400">{isAgent ? 'Agente de voz' : 'Usuária / Paciente'}</span>
                <div className={`max-w-[88%] rounded-xl p-3 text-sm leading-6 ${
                  isAgent
                    ? 'rounded-tl-none border border-slate-100 bg-white text-slate-700'
                    : 'rounded-tr-none bg-brand text-white'
                }`}>
                  {cleanLine}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, helper, icon: Icon, danger }: any) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-lg p-2 ${danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-sm font-bold text-slate-800 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
