import React, { useState } from 'react';
import { 
  Layers, Bookmark, Cpu, Component, ChevronDown, ChevronRight, Hash, 
  Database, Mic, Headphones, Play, Square, MessageSquare, GitBranch, 
  Wrench, BrainCircuit, HelpCircle, Split, BookOpen, Star, Search, Sparkles, 
  FileCode, ShoppingBag, FolderOpen, Heart, Trash2 
} from 'lucide-react';
import { StudioNode } from '../../../lib/studio/types';
import { useStudioStore, nodeRegistry, NodeRegistryItem } from '../../../store/useStudioStore';

interface LayersPanelProps {
  nodes: StudioNode[];
}

export function LayersPanel({ nodes }: LayersPanelProps) {
  const [activeTab, setActiveTab] = useState<'layers' | 'assets' | 'templates' | 'favorites'>('assets');
  const [expandedLayers, setExpandedLayers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const {
    addNodeFromRegistry,
    favorites,
    toggleFavorite,
    templates,
    setSelectedNodeId,
    setNodes,
    setEdges,
    nodeLifecycles
  } = useStudioStore();

  const getIconForType = (type: string) => {
    switch (type) {
      case 'start': return <Play className="w-3.5 h-3.5 text-green-500 shrink-0" />;
      case 'voice': return <Mic className="w-3.5 h-3.5 text-pink-500 shrink-0" />;
      case 'llm': return <BrainCircuit className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'prompt': return <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
      case 'question': return <HelpCircle className="w-3.5 h-3.5 text-teal-500 shrink-0" />;
      case 'condition': return <GitBranch className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
      case 'switch': return <Split className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
      case 'knowledge': return <BookOpen className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
      case 'tool': return <Wrench className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'memory': return <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'human_handoff': return <Headphones className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'end': return <Square className="w-3.5 h-3.5 text-slate-700 shrink-0" />;
      default: return <Component className="w-3.5 h-3.5 text-gray-500 shrink-0" />;
    }
  };

  // Filter registered nodes based on search and category filters
  const filteredRegistry = Object.values(nodeRegistry).filter((node) => {
    const matchesSearch = 
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || node.category.toLowerCase() === categoryFilter.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(Object.values(nodeRegistry).map(n => n.category)));

  const handleLoadTemplate = (tpl: typeof templates[number]) => {
    setNodes(JSON.parse(JSON.stringify(tpl.nodes)));
    setEdges(JSON.parse(JSON.stringify(tpl.edges)));
  };

  return (
    <div className="w-64 bg-[#F8FAFC] border-r border-gray-200 flex flex-col h-full shrink-0 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.01)] select-none">
      {/* Search Header for quick lookup */}
      <div className="p-2 border-b border-gray-200 bg-white shrink-0 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input 
            type="text" 
            placeholder="Pesquisar nós ou tags..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-400 text-gray-800"
          />
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-200 bg-white shrink-0 text-center">
        <button 
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'assets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Node Specs
        </button>
        <button 
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'favorites' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Favs
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'templates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Templates
        </button>
        <button 
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'layers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Layers
        </button>
      </div>

      {/* Content Scroller */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        
        {activeTab === 'assets' && (
          <div className="space-y-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-none shrink-0 border-b border-gray-100 mb-2">
              <button 
                onClick={() => setCategoryFilter('all')}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all shrink-0 uppercase tracking-wide border ${
                  categoryFilter === 'all' 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all shrink-0 uppercase tracking-wide border ${
                    categoryFilter === cat 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* List of Spec Nodes */}
            <div className="space-y-1.5">
              {filteredRegistry.map((item) => {
                const isItemFav = favorites.includes(item.type);
                return (
                  <div 
                    key={item.type}
                    onClick={() => addNodeFromRegistry(item.type)}
                    className="p-2.5 bg-white border border-gray-200 hover:border-indigo-300 rounded-xl shadow-sm cursor-pointer flex items-start gap-2.5 transition-all group hover:shadow-md"
                  >
                    <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-indigo-50 text-gray-500 group-hover:text-indigo-600 transition-colors">
                      {getIconForType(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 group-hover:text-indigo-900 truncate pr-1">
                          {item.label}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.type);
                          }}
                          className={`text-xs hover:scale-110 transition-transform ${isItemFav ? 'text-amber-500' : 'text-gray-300'}`}
                        >
                          ★
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-semibold uppercase tracking-wider">
                        v{item.version} • {item.category}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
              {filteredRegistry.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400 italic">
                  Nenhum nó registrado corresponde à busca.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Seus Nós Favoritados</h3>
            <div className="space-y-1.5">
              {favorites.map((favType) => {
                const item = nodeRegistry[favType];
                if (!item) return null;
                return (
                  <div 
                    key={favType}
                    onClick={() => addNodeFromRegistry(favType)}
                    className="p-2 bg-white border border-amber-100 hover:border-amber-300 rounded-lg flex items-center justify-between cursor-pointer group shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2">
                      {getIconForType(favType)}
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-indigo-600 truncate max-w-[140px]">
                        {item.label}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(favType);
                      }}
                      className="text-xs text-amber-500"
                    >
                      ★
                    </button>
                  </div>
                );
              })}
              {favorites.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400 italic">
                  Estrela um nó no menu de especificações para adicioná-lo aqui.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Workflows de Sucesso</h3>
            <div className="space-y-1.5">
              {templates.map((tpl) => (
                <div 
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl)}
                  className="p-2.5 bg-white border border-gray-200 hover:border-indigo-300 rounded-lg cursor-pointer transition-all shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 group-hover:text-indigo-900 truncate">
                      {tpl.name}
                    </span>
                    <FolderOpen className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500" />
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono mt-1 font-semibold uppercase">
                    {tpl.nodes.length} Nodes • {tpl.edges.length} Edges
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'layers' && (
          <div className="space-y-1">
            <div 
              className="flex items-center gap-1 px-1 py-1.5 cursor-pointer hover:bg-gray-100 rounded text-gray-700"
              onClick={() => setExpandedLayers(!expandedLayers)}
            >
              {expandedLayers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="text-xs font-bold text-gray-900">Main Flow Active Canvas</span>
            </div>
            
            {expandedLayers && (
              <div className="pl-4 space-y-0.5">
                {nodes.map(node => {
                  const state = nodeLifecycles[node.id] || 'Ready';
                  return (
                    <div 
                      key={node.id} 
                      onClick={() => setSelectedNodeId(node.id)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-indigo-50 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getIconForType(node.type || '')}
                        <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-700 truncate">
                          {node.data.label}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono font-semibold text-gray-400 group-hover:text-indigo-500 uppercase shrink-0">
                        {state}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
