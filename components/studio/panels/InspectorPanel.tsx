import React, { useState } from 'react';
import { Settings2, Code, Activity, Database, Key, HelpCircle, Variable, Plus, ChevronDown } from 'lucide-react';
import { StudioNode } from '../../../lib/studio/types';
import { motion, AnimatePresence } from 'motion/react';

interface InspectorPanelProps {
  selectedNode: StudioNode | null;
}

export function InspectorPanel({ selectedNode }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'design' | 'config' | 'logs'>('design');

  if (!selectedNode) {
    return (
      <div className="w-80 bg-[#FAFAFA] border-l border-gray-200 flex flex-col h-full shrink-0">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400">
          <Settings2 className="w-8 h-8 mb-3 opacity-20" />
          <p className="text-sm font-medium">Select a node to inspect</p>
          <p className="text-xs mt-1">Properties, variables, and logs will appear here.</p>
        </div>
      </div>
    );
  }

  const { data } = selectedNode;

  return (
    <div className="w-80 bg-[#FAFAFA] border-l border-gray-200 flex flex-col h-full shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider border border-slate-200">
            {data.category || 'Node'}
          </span>
          <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{selectedNode.id}</span>
        </div>
        <h2 className="text-base font-bold text-gray-900">{data.label}</h2>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-2 border-b border-gray-200 bg-white shrink-0">
        <button 
          onClick={() => setActiveTab('design')}
          className={`pb-2 px-3 border-b-2 text-xs font-semibold transition-colors ${activeTab === 'design' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Properties
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={`pb-2 px-3 border-b-2 text-xs font-semibold transition-colors ${activeTab === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Variables
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`pb-2 px-3 border-b-2 text-xs font-semibold transition-colors ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Logs & Health
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        <AnimatePresence mode="wait">
          {activeTab === 'design' && (
            <motion.div key="design" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Basic Properties */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                   <Settings2 className="w-3.5 h-3.5 text-gray-400" /> Identity
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Label Name</label>
                    <input 
                      type="text" 
                      className="w-full text-sm px-3 py-2 bg-white border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                      defaultValue={data.label}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Description (Optional)</label>
                    <textarea 
                      className="w-full text-sm px-3 py-2 bg-white border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-20 shadow-sm transition-all"
                      placeholder="Add a note or description..."
                      defaultValue={data.description}
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Node Specific Config */}
              {data.config && Object.keys(data.config).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                     <Code className="w-3.5 h-3.5 text-gray-400" /> Setup Configuration
                  </h3>
                  
                  <div className="space-y-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    {Object.entries(data.config).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1 flex justify-between">
                           {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <input 
                          type="text" 
                          className="w-full text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                          defaultValue={String(value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div key="config" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Variables / State */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Variable className="w-3.5 h-3.5 text-gray-400" /> Local Variables
                   </h3>
                   <button className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1">
                     <Plus className="w-3 h-3" /> ADD
                   </button>
                </div>
                
                {selectedNode.type === 'llm' || selectedNode.type === 'condition' ? (
                   <div className="space-y-2">
                     <div className="p-2 bg-white border border-gray-200 rounded-lg flex items-center justify-between shadow-sm group hover:border-indigo-300">
                       <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center text-purple-600 font-mono text-[10px] font-bold">S</div>
                         <div>
                           <div className="text-xs font-bold text-gray-800">userIntent</div>
                           <div className="text-[10px] text-gray-500 font-mono">String • Flow Scope</div>
                         </div>
                       </div>
                       <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                     </div>
                     <div className="p-2 bg-white border border-gray-200 rounded-lg flex items-center justify-between shadow-sm group hover:border-indigo-300">
                       <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center text-green-600 font-mono text-[10px] font-bold">N</div>
                         <div>
                           <div className="text-xs font-bold text-gray-800">confidenceScore</div>
                           <div className="text-[10px] text-gray-500 font-mono">Number • Local Scope</div>
                         </div>
                       </div>
                       <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                     </div>
                   </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 border-dashed rounded-lg text-center">
                     <p className="text-xs text-gray-500 mb-2">No variables bound to this node yet.</p>
                     <button className="text-xs font-medium bg-white border border-gray-300 shadow-sm px-3 py-1.5 rounded-md hover:bg-gray-50 text-gray-700">
                       Create Variable
                     </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div key="logs" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                   <Activity className="w-3.5 h-3.5 text-gray-400" /> Execution Metrics
                </h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                     <div className="text-[10px] font-semibold text-gray-500 uppercase">Invocations</div>
                     <div className="text-lg font-bold text-gray-900 font-mono mt-1">1,248</div>
                  </div>
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                     <div className="text-[10px] font-semibold text-gray-500 uppercase">Avg Latency</div>
                     <div className="text-lg font-bold text-gray-900 font-mono mt-1">124<span className="text-xs text-gray-500 ml-1">ms</span></div>
                  </div>
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm col-span-2">
                     <div className="text-[10px] font-semibold text-gray-500 uppercase">Error Rate</div>
                     <div className="flex items-end gap-2 mt-1">
                       <div className="text-lg font-bold text-green-600 font-mono">0.05%</div>
                       <div className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded mb-1 border border-green-200">Healthy</div>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
