import React, { useState } from 'react';
import { 
  Play, Pause, Square, ChevronRight, AlertCircle, AlertTriangle, List, 
  Terminal, BarChart2, Sparkles, Variable, Plus, Trash2, Key, HelpCircle, FastForward, CheckCircle2 
} from 'lucide-react';
import { useStudioStore, nodeRegistry } from '../../../store/useStudioStore';
import { validationEngine } from '../../../lib/studio/ValidationEngine';
import { motion, AnimatePresence } from 'motion/react';

export function BottomDrawer() {
  const [activeTab, setActiveTab] = useState<'runtime' | 'errors' | 'events' | 'analytics' | 'catarina'>('runtime');
  const [newVarName, setNewVarName] = useState('');
  const [newVarVal, setNewVarVal] = useState('');
  const [showAddVar, setShowAddVar] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const {
    nodes,
    edges,
    isDebugging,
    activeSimulationNodeId,
    simulationLogs,
    simulationVariables,
    isSimulationPaused,
    simulationSpeedMs,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    stepSimulationForward,
    updateSimulationVariable,
    deleteSimulationVariable,
    applyAiRefactor,
    generateWorkflowFromPrompt
  } = useStudioStore();

  const valResult = validationEngine.validate(nodes, edges);
  const { issues, healthScore } = valResult;

  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarName.trim()) return;
    updateSimulationVariable(newVarName.trim(), newVarVal);
    setNewVarName('');
    setNewVarVal('');
    setShowAddVar(false);
  };

  const handleAiRefactor = async (mode: 'simplify' | 'reduceCost' | 'reduceLatency' | 'moreHuman') => {
    setIsAiLoading(true);
    await applyAiRefactor(mode);
    setIsAiLoading(false);
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    await generateWorkflowFromPrompt(aiPrompt);
    setAiPrompt('');
    setIsAiLoading(false);
  };

  return (
    <div className="h-72 bg-white border-t border-gray-200 flex flex-col shrink-0 z-20 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
      {/* Tabs Header */}
      <div className="h-10 border-b border-gray-200 bg-gray-50 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-1 h-full">
          <button 
            onClick={() => setActiveTab('runtime')}
            className={`px-3 h-full flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'runtime' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Runtime Simulator
            {isDebugging && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('errors')}
            className={`px-3 h-full flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'errors' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Errors & Validation
            {issues.length > 0 && (
              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {issues.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('events')}
            className={`px-3 h-full flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'events' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <List className="w-3.5 h-3.5 text-blue-500" /> Event Bus Log
          </button>

          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-3 h-full flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-500" /> Live Analytics
          </button>

          <button 
            onClick={() => setActiveTab('catarina')}
            className={`px-3 h-full flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'catarina' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Catarina AI Studio
          </button>
        </div>

        {/* Diagnostic Quick Tag */}
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold text-gray-400 font-mono">
            ENGINE: ACTIVE_VOICE_v1
          </div>
          <div className="h-3 w-px bg-gray-200" />
          <div className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
            COMPILER OK
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 min-h-0 bg-white flex overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'runtime' && (
            <motion.div 
              key="runtime" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 flex min-h-0"
            >
              {/* Simulator Controls & Variables */}
              <div className="w-80 border-r border-gray-200 p-4 flex flex-col min-h-0 bg-[#FAFAFA]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Debugger Playback</span>
                  <span className="text-[10px] font-mono text-gray-500">Speed: {simulationSpeedMs}ms</span>
                </div>

                {/* Interactive Controls Buttons */}
                <div className="flex items-center gap-2 mb-4">
                  {!isDebugging ? (
                    <button 
                      onClick={startSimulation}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Play Flow
                    </button>
                  ) : (
                    <>
                      {isSimulationPaused ? (
                        <button 
                          onClick={resumeSimulation}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Resume
                        </button>
                      ) : (
                        <button 
                          onClick={pauseSimulation}
                          className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </button>
                      )}
                      
                      <button 
                        onClick={stepSimulationForward}
                        title="Step Forward (Next Node)"
                        className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-all"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        onClick={stopSimulation}
                        className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" /> Stop
                      </button>
                    </>
                  )}
                </div>

                {/* Session Variables Head */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <Variable className="w-3.5 h-3.5 text-gray-400" /> Telemetry Variables
                  </span>
                  <button 
                    onClick={() => setShowAddVar(!showAddVar)}
                    className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>

                {/* Variable Form */}
                {showAddVar && (
                  <form onSubmit={handleAddVariable} className="p-2 bg-white border border-gray-200 rounded-lg mb-2 space-y-2">
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        placeholder="key" 
                        value={newVarName} 
                        onChange={e => setNewVarName(e.target.value)} 
                        className="w-1/2 text-xs p-1 bg-gray-50 border border-gray-200 rounded outline-none focus:bg-white focus:border-indigo-500"
                        required
                      />
                      <input 
                        type="text" 
                        placeholder="value" 
                        value={newVarVal} 
                        onChange={e => setNewVarVal(e.target.value)} 
                        className="w-1/2 text-xs p-1 bg-gray-50 border border-gray-200 rounded outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setShowAddVar(false)} className="text-[10px] text-gray-400 hover:text-gray-600">Cancel</button>
                      <button type="submit" className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded">Save</button>
                    </div>
                  </form>
                )}

                {/* Variables List */}
                <div className="flex-1 overflow-y-auto space-y-1">
                  {Object.entries(simulationVariables).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-2 py-1 bg-white border border-gray-150 rounded text-xs font-mono group hover:border-gray-300">
                      <span className="text-indigo-600 font-semibold truncate max-w-[120px]" title={k}>{k}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-700 font-medium truncate max-w-[110px]" title={String(v)}>{String(v)}</span>
                        <button 
                          onClick={() => deleteSimulationVariable(k)} 
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monospace Execution Logs */}
              <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-1 text-slate-200 select-text">
                <div className="text-slate-500 border-b border-slate-900 pb-2 mb-2 flex items-center justify-between">
                  <span>CONSOLE STREAM LOGS (v1.0.4)</span>
                  <span className="text-[10px] text-indigo-400">STATE: {isDebugging ? 'RUNNING' : 'IDLE'}</span>
                </div>
                {simulationLogs.length === 0 && (
                  <div className="text-slate-500 italic py-8 text-center">
                    {"// No logs captured. Click 'Play Flow' to execute step-by-step simulator."}
                  </div>
                )}
                {simulationLogs.map((log, idx) => {
                  let color = 'text-slate-300';
                  if (log.type === 'success') color = 'text-green-400';
                  if (log.type === 'warn') color = 'text-amber-400';
                  if (log.type === 'error') color = 'text-red-400';
                  if (log.type === 'event') color = 'text-indigo-400';

                  return (
                    <div key={idx} className="flex items-start gap-2 hover:bg-slate-900 py-0.5 px-1 rounded transition-colors">
                      <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                      {log.nodeLabel && (
                        <span className="text-purple-400 font-bold shrink-0 select-none">[{log.nodeLabel}]</span>
                      )}
                      <span className={color}>{log.message}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'errors' && (
            <motion.div 
              key="errors" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 p-4 overflow-y-auto space-y-2"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-gray-500" /> Compiler Validation Engine
                </span>
                <span className="text-xs text-gray-500">Live background compile updates continuously</span>
              </div>

              {issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                  <p className="text-sm font-semibold text-gray-800">Seu fluxo está 100% válido!</p>
                  <p className="text-xs text-gray-500">Sem erros estruturais, de provider ou cíclicos detectados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {issues.map((iss) => (
                    <div 
                      key={iss.id} 
                      className={`p-3 rounded-lg border flex items-start gap-3 transition-all ${
                        iss.type === 'error' 
                          ? 'bg-red-50/50 border-red-100 text-red-900' 
                          : 'bg-amber-50/50 border-amber-100 text-amber-900'
                      }`}
                    >
                      {iss.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {iss.type === 'error' ? 'Erro Crítico' : 'Alerta de Otimização'}
                          {iss.nodeId && (
                            <span className="font-mono text-[9px] bg-white/80 border px-1.5 py-0.5 rounded text-gray-600">
                              Node ID: {iss.nodeId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1 font-medium">{iss.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div 
              key="events" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-1.5 text-slate-300 select-text"
            >
              <div className="text-slate-500 border-b border-slate-900 pb-2 mb-2">
                EVENT-DRIVEN STREAM LOGS (Birth Voice Engine Bus)
              </div>
              <div className="flex items-start gap-2 hover:bg-slate-900 py-1 px-1.5 rounded text-indigo-300">
                <span>[08:12:01]</span>
                <span>EVENT_EMITTED</span>
                <span>telephony.session.init {JSON.stringify({ ani: "+5511999998888", dnis: "0800-999-888" })}</span>
              </div>
              <div className="flex items-start gap-2 hover:bg-slate-900 py-1 px-1.5 rounded text-green-300">
                <span>[08:12:02]</span>
                <span>EVENT_EMITTED</span>
                <span>voice.provider.loaded {JSON.stringify({ voiceId: "Rachel", latencyMs: 240 })}</span>
              </div>
              <div className="flex items-start gap-2 hover:bg-slate-900 py-1 px-1.5 rounded text-blue-300">
                <span>[08:12:03]</span>
                <span>EVENT_EMITTED</span>
                <span>prompt.generation.chunk_stream {JSON.stringify({ tokens: 140, provider: "Gemini" })}</span>
              </div>
              <div className="flex items-start gap-2 hover:bg-slate-900 py-1 px-1.5 rounded text-amber-300">
                <span>[08:12:04]</span>
                <span>EVENT_EMITTED</span>
                <span>decision.match_score.intent {JSON.stringify({ value: "Suporte", score: 0.94 })}</span>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50/50"
            >
              {/* Dynamic Health Scores */}
              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Complexity / Legibilidade</div>
                <div className="text-2xl font-bold text-gray-900 font-mono mt-1">{healthScore.complexity}%</div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full" style={{ width: `${healthScore.complexity}%` }} />
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimated Cost / 10k calls</div>
                <div className="text-2xl font-bold text-gray-900 font-mono mt-1">${(healthScore.estimatedCost * 10000).toFixed(2)}</div>
                <div className="text-[10px] text-gray-500 mt-1 font-mono">Avg: ${healthScore.estimatedCost} USD per call</div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Latency (STT + LLM + TTS)</div>
                <div className="text-2xl font-bold text-gray-900 font-mono mt-1">{healthScore.latency}ms</div>
                <div className="text-[10px] text-green-600 font-semibold mt-1">Excellent (under 1200ms)</div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Risk Assessment Score</div>
                <div className="text-2xl font-bold text-red-600 font-mono mt-1">{healthScore.risk}%</div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-red-500 h-full" style={{ width: `${healthScore.risk}%` }} />
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Node Reusability Index</div>
                <div className="text-xl font-bold text-gray-800 font-mono mt-1">{healthScore.reusability}/100</div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Path Coverage Score</div>
                <div className="text-xl font-bold text-gray-800 font-mono mt-1">{healthScore.coverage}/100</div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scalability Rating</div>
                <div className="text-xl font-bold text-gray-800 font-mono mt-1">{healthScore.scalability}/100</div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overall Quality Index</div>
                <div className="text-xl font-bold text-indigo-600 font-mono mt-1">{healthScore.quality}/100</div>
              </div>
            </motion.div>
          )}

          {activeTab === 'catarina' && (
            <motion.div 
              key="catarina" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 p-4 flex min-h-0 bg-indigo-50/20"
            >
              {/* Refactoring operations */}
              <div className="w-72 border-r border-indigo-100/50 pr-4 flex flex-col gap-2 shrink-0">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Refatoração e Otimização AI</span>
                <p className="text-[11px] text-indigo-950/70 mb-1">
                  Selecione uma otimização com Catarina para reorganizar e calibrar os parâmetros dos nós automaticamente.
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button 
                    disabled={isAiLoading}
                    onClick={() => handleAiRefactor('simplify')}
                    className="py-1.5 px-2.5 bg-white border border-indigo-100 hover:border-indigo-300 text-left rounded-md text-xs font-medium text-indigo-900 shadow-sm flex items-center justify-between transition-all"
                  >
                    <span>Simplificar Estrutura</span>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  </button>
                  <button 
                    disabled={isAiLoading}
                    onClick={() => handleAiRefactor('reduceCost')}
                    className="py-1.5 px-2.5 bg-white border border-indigo-100 hover:border-indigo-300 text-left rounded-md text-xs font-medium text-indigo-900 shadow-sm flex items-center justify-between transition-all"
                  >
                    <span>Reduzir Custos (Flash Engines)</span>
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  </button>
                  <button 
                    disabled={isAiLoading}
                    onClick={() => handleAiRefactor('reduceLatency')}
                    className="py-1.5 px-2.5 bg-white border border-indigo-100 hover:border-indigo-300 text-left rounded-md text-xs font-medium text-indigo-900 shadow-sm flex items-center justify-between transition-all"
                  >
                    <span>Diminuir Latência Geral</span>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </button>
                  <button 
                    disabled={isAiLoading}
                    onClick={() => handleAiRefactor('moreHuman')}
                    className="py-1.5 px-2.5 bg-white border border-indigo-100 hover:border-indigo-300 text-left rounded-md text-xs font-medium text-indigo-900 shadow-sm flex items-center justify-between transition-all"
                  >
                    <span>Tornar mais Humano e Empático</span>
                    <Sparkles className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Chat Prompter for AI Node Generator */}
              <div className="flex-1 pl-4 flex flex-col min-h-0">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Catarina AI Workflow Generator
                </span>
                <p className="text-[11px] text-gray-500 mb-3">
                  Escreva um prompt em linguagem natural para gerar uma arquitetura completa de Voice Agent.
                </p>

                <form onSubmit={handleAiGenerate} className="flex-1 flex flex-col min-h-0 justify-between">
                  <div className="flex-1 min-h-0 bg-white border border-indigo-100 rounded-lg p-2 flex flex-col">
                    <textarea 
                      placeholder="Ex: Crie um fluxo completo para recepção de uma clínica odontológica com confirmação de CPF via voz e busca de FAQs..."
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      disabled={isAiLoading}
                      className="w-full flex-1 text-xs resize-none outline-none text-gray-800 bg-transparent placeholder-gray-400"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1.5">
                      <span 
                        onClick={() => setAiPrompt('Crie um assistente para confirmar consultas médicas.')}
                        className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded cursor-pointer font-medium"
                      >
                        Mapear consultas
                      </span>
                      <span 
                        onClick={() => setAiPrompt('Gere um fluxo de suporte técnico para provedor de internet.')}
                        className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded cursor-pointer font-medium"
                      >
                        Roteamento Suporte
                      </span>
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isAiLoading || !aiPrompt.trim()}
                      className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all shrink-0"
                    >
                      {isAiLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-current" /> Gerar Workflow
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
