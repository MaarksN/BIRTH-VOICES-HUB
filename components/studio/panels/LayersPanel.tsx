import React, { useState } from 'react';
import { Layers, Bookmark, Cpu, Component, ChevronDown, ChevronRight, Hash, Database, Mic, Headphones } from 'lucide-react';
import { StudioNode } from '../../../lib/studio/types';

interface LayersPanelProps {
  nodes: StudioNode[];
}

export function LayersPanel({ nodes }: LayersPanelProps) {
  const [activeTab, setActiveTab] = useState<'layers' | 'assets'>('layers');
  const [expandedLayers, setExpandedLayers] = useState(true);

  const icons: Record<string, React.ReactNode> = {
    start: <Hash className="w-3.5 h-3.5 text-blue-500" />,
    voice: <Mic className="w-3.5 h-3.5 text-indigo-500" />,
    llm: <Cpu className="w-3.5 h-3.5 text-purple-500" />,
    knowledge: <Database className="w-3.5 h-3.5 text-cyan-500" />,
    human_handoff: <Headphones className="w-3.5 h-3.5 text-rose-500" />
  };

  return (
    <div className="w-64 bg-[#F8FAFC] border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Tabs */}
      <div className="flex items-center p-2 border-b border-gray-200 gap-1 shrink-0">
        <button 
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'layers' ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Layers
        </button>
        <button 
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'assets' ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Component className="w-3.5 h-3.5" /> Assets
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'layers' ? (
          <div className="space-y-1">
            <div 
              className="flex items-center gap-1 px-1 py-1.5 cursor-pointer hover:bg-gray-100 rounded text-gray-700"
              onClick={() => setExpandedLayers(!expandedLayers)}
            >
              {expandedLayers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="text-xs font-bold text-gray-900">Main Flow</span>
            </div>
            
            {expandedLayers && (
              <div className="pl-4 space-y-0.5">
                {nodes.map(node => (
                  <div key={node.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-indigo-50 cursor-pointer group">
                    {icons[node.type || ''] || <Component className="w-3.5 h-3.5 text-gray-400" />}
                    <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-700 truncate">{node.data.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
             <div className="px-2">
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Triggers</h3>
               <div className="space-y-1">
                  <div className="flex items-center gap-2 p-2 rounded-md border border-gray-200 bg-white shadow-sm cursor-grab hover:border-indigo-300">
                     <Hash className="w-4 h-4 text-blue-500" />
                     <span className="text-xs font-medium text-gray-700">Inbound Call</span>
                  </div>
               </div>
             </div>

             <div className="px-2">
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">AI & Logic</h3>
               <div className="space-y-1">
                  <div className="flex items-center gap-2 p-2 rounded-md border border-gray-200 bg-white shadow-sm cursor-grab hover:border-indigo-300">
                     <Cpu className="w-4 h-4 text-purple-500" />
                     <span className="text-xs font-medium text-gray-700">LLM Prompt</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md border border-gray-200 bg-white shadow-sm cursor-grab hover:border-indigo-300">
                     <Mic className="w-4 h-4 text-indigo-500" />
                     <span className="text-xs font-medium text-gray-700">Voice Setup</span>
                  </div>
               </div>
             </div>
          </div>
        )}
      </div>
      
      {/* Footer Area - Bookmarks/Favorites */}
      <div className="border-t border-gray-200 p-2 shrink-0 bg-[#F1F5F9]">
         <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-200 cursor-pointer text-gray-600">
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium">Bookmarks (3)</span>
         </div>
      </div>
    </div>
  );
}
