import { RiskLevel, Sentiment } from '../types';

export const sentimentClass: Record<Sentiment, string> = {
  Positivo: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Neutro: 'bg-slate-100 text-slate-700 border-slate-200',
  Negativo: 'bg-rose-50 text-rose-700 border-rose-100',
};

export const riskClass: Record<RiskLevel, string> = {
  Baixo: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Moderado: 'bg-amber-50 text-amber-700 border-amber-100',
  Alto: 'bg-rose-50 text-rose-700 border-rose-100',
};

export const parseDurationToSeconds = (duration: string) => {
  const [minutes, seconds] = duration.split(':').map(Number);
  return (minutes || 0) * 60 + (seconds || 0);
};

export const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

export const toCsvCell = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
