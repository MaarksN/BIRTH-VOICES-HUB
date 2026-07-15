import React, { useState } from 'react';
import {
  Settings2, Code, Activity, Variable, Plus,
  BookOpen, Link, Trash2, ShieldAlert
} from 'lucide-react';
import { StudioNode } from '../../../lib/studio/types';
import { useStudioStore, nodeRegistry } from '../../../store/useStudioStore';
import { motion, AnimatePresence } from 'motion/react';

interface InspectorPanelProps {
  selectedNode: StudioNode | null;
}

export function InspectorPanel({ selectedNode }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'config' | 'variables' | 'connections' | 'analytics' | 'documentation'>('general');
  const [newVarName, setNewVarName] = useState('');
  const [newVarVal, setNewVarVal] = useState('');
  const [showAddVar, setShowAddVar] = useState(false);

  const {
    edges,
    nodeLifecycles,
    updateNodeMetadata,
    updateNodeConfig,
    toggleFavorite,
    favorites,
    updateSimulationVariable,
    simulationVariables,
    deleteNode
  } = useStudioStore();

  if (!selectedNode) {
    return (
      <div className="w-80 bg-[#FAFAFA] border-l border-gray-200 flex flex-col h-full shrink-0">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400">
          <Settings2 className="w-8 h-8 mb-3 opacity-20" />
          <p className="text-sm font-medium">Selecione um Nó para inspecionar</p>
          <p className="text-xs mt-1">Configure parâmetros, variáveis e visualize telemetria em tempo real.</p>
        </div>
      </div>
    );
  }

  const { id, type, data } = selectedNode;
  const regItem = nodeRegistry[type];
  const lifecycle = nodeLifecycles[id] || 'Ready';
  const isFav = favorites.includes(type);

  // Filter incoming and outgoing connections for this specific node
  const incomingEdges = edges.filter(e => e.target === id);
  const outgoingEdges = edges.filter(e => e.source === id);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeMetadata(id, { label: e.target.value });
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeMetadata(id, { description: e.target.value });
  };

  const handleConfigChange = (key: string, value: string) => {
    updateNodeConfig(id, key, value);
  };

  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarName.trim()) return;
    updateSimulationVariable(newVarName.trim(), newVarVal);
    setNewVarName('');
    setNewVarVal('');
    setShowAddVar(false);
  };

  return (
    <div className="w-80 bg-[#FAFAFA] border-l border-gray-200 flex flex-col h-full shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700 uppercase tracking-wider border border-indigo-100">
            {regItem?.category || data.category || 'Node'}
          </span>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => toggleFavorite(type)}
              className={`p-1 rounded hover:bg-gray-100 ${isFav ? 'text-amber-500' : 'text-gray-300 hover:text-gray-400'}`}
              title={isFav ? "Remover dos Favoritos" : "Favoritar Nó"}
            >
              ★
            </button>
            <span className="text-[9px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{id}</span>
          </div>
        </div>
        <h2 className="text-base font-bold text-gray-900 truncate">{data.label}</h2>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] text-gray-500 font-mono">STATE: {lifecycle}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white shrink-0 overflow-x-auto scrollbar-none">
        {(['general', 'config', 'variables', 'connections', 'analytics', 'documentation'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 pt-2.5 px-3 border-b-2 text-[11px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab === 'config' ? 'Setup' : tab}
          </button>
        ))}
      </div>

      {/* Tab Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'general' && (
            <motion.div 
              key="general" 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="space-y-5"
            >
              {/* Identity Properties */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Settings2 className="w-3.5 h-3.5 text-indigo-500" /> General Properties
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Node Title</label>
                    <input 
                      type="text" 
                      value={data.label}
                      onChange={handleLabelChange}
                      className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm transition-all text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Developer Notes / Description</label>
                    <textarea 
                      value={data.description || ''}
                      onChange={handleDescChange}
                      className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-24 shadow-sm transition-all text-gray-800"
                      placeholder="Ex: Este prompt acolhe o cliente e valida o telefone inicial..."
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Node Versioning & Registry Specifications */}
              {regItem && (
                <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="font-bold text-gray-700">SPECIFICATION REGISTRY</div>
                  <div className="flex justify-between">
                    <span>Engine Type:</span>
                    <span className="font-mono font-medium">{type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Version:</span>
                    <span className="font-mono font-medium text-indigo-600">v{regItem.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inputs / Outputs:</span>
                    <span className="font-mono font-medium">{regItem.inputs} In / {regItem.outputs} Out</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dependency Match:</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1 rounded font-semibold border border-indigo-100">{regItem.dependencies[0] || 'none'}</span>
                  </div>
                </div>
              )}

              <hr className="border-gray-200" />

              {/* Delete Action button */}
              <button 
                onClick={() => deleteNode(id)}
                className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" /> Deletar Nó do Canvas
              </button>
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div 
              key="config" 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="space-y-5"
            >
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Code className="w-3.5 h-3.5 text-indigo-500" /> Setup Configuration
              </h3>

              {!data.config || Object.keys(data.config).length === 0 ? (
                <div className="p-4 bg-white border border-gray-200 rounded-lg text-center text-xs text-gray-500 italic">
                  Este nó não necessita de configurações adicionais.
                </div>
              ) : (
                <div className="space-y-4 p-3.5 bg-white border border-gray-200 rounded-xl shadow-sm">
                  {Object.entries(data.config).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      {typeof value === 'string' && value.length > 50 ? (
                        <textarea 
                          value={String(value)}
                          onChange={e => handleConfigChange(key, e.target.value)}
                          className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:border-indigo-500 outline-none transition-all h-28 font-sans text-gray-800"
                        />
                      ) : (
                        <input 
                          type="text" 
                          value={String(value)}
                          onChange={e => handleConfigChange(key, e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:border-indigo-500 outline-none transition-all font-sans text-gray-800"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'variables' && (
            <motion.div 
              key="variables" 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Variable className="w-3.5 h-3.5 text-indigo-500" /> Bound State Variables
                </h3>
                <button 
                  onClick={() => setShowAddVar(!showAddVar)}
                  className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> ADD
                </button>
              </div>

              {showAddVar && (
                <form onSubmit={handleAddVariable} className="p-3 bg-white border border-indigo-100 rounded-lg space-y-2">
                  <div>
                    <label className="block text-[9px] font-bold text-indigo-600 uppercase">Variable Name</label>
                    <input 
                      type="text" 
                      placeholder="user_cpf"
                      value={newVarName}
                      onChange={e => setNewVarName(e.target.value)}
                      className="w-full text-xs p-1.5 bg-gray-50 border border-gray-200 rounded mt-0.5 focus:bg-white outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-indigo-600 uppercase">Value</label>
                    <input 
                      type="text" 
                      placeholder="12345678909"
                      value={newVarVal}
                      onChange={e => setNewVarVal(e.target.value)}
                      className="w-full text-xs p-1.5 bg-gray-50 border border-gray-200 rounded mt-0.5 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => setShowAddVar(false)} className="text-[10px] text-gray-500">Cancel</button>
                    <button type="submit" className="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded">Create</button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {Object.entries(simulationVariables).map(([k, v]) => (
                  <div key={k} className="p-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-between shadow-sm hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-indigo-50 rounded flex items-center justify-center text-indigo-600 font-mono text-[10px] font-bold">V</div>
                      <div>
                        <div className="text-xs font-bold text-gray-800">{k}</div>
                        <div className="text-[10px] text-gray-500 font-mono">Value: {String(v)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'connections' && (
            <motion.div 
              key="connections" 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="space-y-5"
            >
              {/* Incoming Connections */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Link className="w-3.5 h-3.5 text-blue-500" /> Incoming Ports (Inputs)
                </h3>

                {incomingEdges.length === 0 ? (
                  <div className="text-xs italic text-gray-400 p-2 bg-gray-50 rounded border border-dashed">
                    Nenhum nó conectado na entrada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incomingEdges.map(edge => (
                      <div key={edge.id} className="p-2.5 bg-white border border-gray-150 rounded-lg text-xs flex justify-between items-center">
                        <span className="font-semibold text-gray-700">From Node: {edge.source}</span>
                        {edge.data?.description && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded">{edge.data.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-gray-200" />

              {/* Outgoing Connections */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Link className="w-3.5 h-3.5 text-purple-500" /> Outgoing Ports (Outputs)
                </h3>

                {outgoingEdges.length === 0 ? (
                  <div className="text-xs italic text-gray-400 p-2 bg-gray-50 rounded border border-dashed">
                    Nenhum nó conectado na saída.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {outgoingEdges.map(edge => (
                      <div key={edge.id} className="p-2.5 bg-white border border-gray-150 rounded-lg text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-700">To Node: {edge.target}</span>
                          {edge.sourceHandle && (
                            <span className="text-[9px] font-mono bg-gray-100 text-gray-600 px-1 rounded">{edge.sourceHandle}</span>
                          )}
                        </div>
                        {edge.data?.condition && (
                          <div className="text-[10px] font-mono text-indigo-600 font-medium">
                            IF: {edge.data.condition}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics" 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="space-y-5"
            >
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-indigo-500" /> Telemetry & Health
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Invocations</div>
                  <div className="text-lg font-bold text-gray-900 font-mono mt-0.5">
                    {(data.metrics?.invocations || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Avg Latency</div>
                  <div className="text-lg font-bold text-gray-900 font-mono mt-0.5">
                    {data.metrics?.latencyMs || 0}ms
                  </div>
                </div>
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm col-span-2">
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Error Rate</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg font-bold text-green-600 font-mono">
                      {((data.metrics?.errorRate || 0) * 100).toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                      Healthy
                    </span>
                  </div>
                </div>
              </div>

              {/* Validation Status card */}
              <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">COMPILER STATUS</div>
                {data.validation?.isValid !== false ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50/50 p-2 border border-green-100 rounded-lg">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> No errors found
                  </div>
                ) : (
                  <div className="p-2 border border-red-100 bg-red-50/40 rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                      <ShieldAlert className="w-3.5 h-3.5" /> Compiler Error
                    </div>
                    {data.validation.errors.map((err, idx) => (
                      <p key={idx} className="text-[10px] text-red-600 font-medium">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'documentation' && (
            <motion.div 
              key="documentation" 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              className="space-y-4"
            >
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Auto-Documentation
              </h3>

              {regItem?.documentation ? (
                <div className="space-y-4 text-xs text-gray-700">
                  <div>
                    <div className="font-bold text-indigo-800 uppercase text-[10px]">Objective & Goal</div>
                    <p className="mt-1 leading-relaxed bg-white p-2.5 rounded-lg border border-gray-200 text-gray-600">{regItem.documentation.goal}</p>
                  </div>

                  <div>
                    <div className="font-bold text-indigo-800 uppercase text-[10px]">Outputs Desc</div>
                    <ul className="mt-1 list-disc list-inside space-y-1 pl-1.5 text-gray-600">
                      {regItem.documentation.outputsDesc.map((desc, i) => (
                        <li key={i}>{desc}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="font-bold text-indigo-800 uppercase text-[10px]">Best Practices</div>
                    <ul className="mt-1 list-disc list-inside space-y-1 pl-1.5 text-gray-600">
                      {regItem.documentation.bestPractices.map((bp, i) => (
                        <li key={i}>{bp}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="font-bold text-indigo-800 uppercase text-[10px]">Examples</div>
                    <ul className="mt-1 list-disc list-inside space-y-1 pl-1.5 text-gray-600">
                      {regItem.documentation.examples.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic">Nenhuma documentação registrada para este nó.</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
