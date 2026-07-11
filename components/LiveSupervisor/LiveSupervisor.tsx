import React, { useEffect, useState } from 'react';
import { AlertCircle, ShieldAlert, HeartPulse, Activity, Zap, Shield, Phone, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
}

interface LiveSupervisorProps {
  sessionId?: string;
}

export function LiveSupervisor({ sessionId = "demo-session-123" }: LiveSupervisorProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [emotions, setEmotions] = useState<{ empathy: number, confidence: number, frustration: number }>({ empathy: 85, confidence: 90, frustration: 10 });
  const [intent, setIntent] = useState<{ primary: string, confidence: number }>({ primary: 'Agendar consulta', confidence: 92 });
  const [objections, setObjections] = useState<string[]>([]);
  const [callDuration, setCallDuration] = useState<number>(0);

  // Simulated live data feed
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
      
      // Randomly update emotions
      if (Math.random() > 0.7) {
        setEmotions(prev => ({
          empathy: Math.min(100, Math.max(0, prev.empathy + (Math.random() * 10 - 5))),
          confidence: Math.min(100, Math.max(0, prev.confidence + (Math.random() * 10 - 5))),
          frustration: Math.min(100, Math.max(0, prev.frustration + (Math.random() * 10 - 5)))
        }));
      }

      // Randomly add alerts or objections
      if (Math.random() > 0.95) {
        const newAlert: Alert = {
          id: crypto.randomUUID(),
          level: Math.random() > 0.7 ? 'critical' : 'warning',
          message: Math.random() > 0.5 ? 'Cliente irritado. Tom elevado detectado.' : 'Latência alta na resposta do LLM (> 1.5s).',
          timestamp: Date.now()
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 5));
      }

      if (Math.random() > 0.97) {
        setObjections(prev => [Math.random() > 0.5 ? 'Preço muito alto' : 'Concorrente oferece mais barato', ...prev].slice(0, 3));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 text-white overflow-hidden shadow-2xl flex flex-col h-full max-h-[800px]">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">LIVE SUPERVISOR</h2>
            <p className="text-xs text-slate-400 font-mono">Session: {sessionId.split('-')[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono font-medium text-slate-300">LIVE</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-xs font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatTime(callDuration)}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-y-auto">
        {/* Left Column: Metrics & Intent */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          <div className="grid grid-cols-3 gap-4">
            <MetricCard title="Empatia" value={emotions.empathy} icon={<HeartPulse className="w-4 h-4" />} color="text-pink-400" bg="bg-pink-400/10" />
            <MetricCard title="Confiança" value={emotions.confidence} icon={<Shield className="w-4 h-4" />} color="text-emerald-400" bg="bg-emerald-400/10" />
            <MetricCard title="Frustração" value={emotions.frustration} icon={<Activity className="w-4 h-4" />} color="text-orange-400" bg="bg-orange-400/10" inverted />
          </div>

          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                Intenção Atual
              </h3>
              <span className="text-xs font-mono text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded">
                Confiança: {intent.confidence}%
              </span>
            </div>
            <div className="text-xl font-medium text-white">{intent.primary}</div>
            <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-indigo-500" 
                 initial={{ width: 0 }} 
                 animate={{ width: `${intent.confidence}%` }} 
                 transition={{ duration: 0.5 }} 
               />
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              Objeções Detectadas
            </h3>
            <div className="space-y-3">
              <AnimatePresence>
                {objections.length === 0 ? (
                   <p className="text-sm text-slate-500 italic">Nenhuma objeção registrada nesta sessão.</p>
                ) : (
                  objections.map((obj, i) => (
                    <motion.div 
                      key={`${obj}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 flex items-start gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                      {obj}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* Right Column: Real-time Alerts */}
        <div className="col-span-12 lg:col-span-4 flex flex-col">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800/80">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Risk & Alerts Log
              </h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <AnimatePresence>
                {alerts.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center mt-10">Tudo normal. Nenhum alerta crítico.</p>
                ) : (
                  alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg border text-xs ${
                        alert.level === 'critical' 
                          ? 'bg-red-500/10 border-red-500/30 text-red-300'
                          : 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold uppercase tracking-wider text-[10px]">{alert.level}</span>
                        <span className="font-mono text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p>{alert.message}</p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
            {alerts.some(a => a.level === 'critical') && (
              <div className="p-4 bg-slate-900 border-t border-slate-700">
                 <button className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-red-900/50 transition-colors">
                   INTERVIR NA CHAMADA
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, bg, inverted = false }: { title: string, value: number, icon: React.ReactNode, color: string, bg: string, inverted?: boolean }) {
  const isWarning = inverted ? value > 50 : value < 50;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${bg} ${color}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-400">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold font-mono text-white">{Math.round(value)}</span>
        <span className={`text-xs font-medium ${isWarning ? 'text-red-400' : 'text-slate-500'}`}>
          / 100
        </span>
      </div>
      <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <motion.div 
          className={`h-full ${isWarning ? 'bg-red-500' : color.replace('text-', 'bg-')}`} 
          initial={{ width: 0 }} 
          animate={{ width: `${value}%` }} 
          transition={{ duration: 0.5 }} 
        />
      </div>
    </div>
  );
}
