import React from 'react';
import { Play, Settings, Share, Download, MessageSquare, LayoutGrid, Search, Maximize, Minus, Plus } from 'lucide-react';
import { FlowHealthScore, ValidationIssue } from '../../../lib/studio/types';
import { ShieldAlert } from 'lucide-react';

interface TopBarProps {
  health?: FlowHealthScore;
  issues: ValidationIssue[];
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onSimulate?: () => void;
}

export function TopBar({ health, issues, onZoomIn, onZoomOut, onFitView, onSimulate }: TopBarProps) {
  return (
    <div className="h-14 bg-[#0B0D14]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-r border-white/10 pr-4">
          <div 
            onClick={onSimulate}
            title="Simular Ligação (Test Call)"
            className="w-8 h-8 bg-indigo-600/90 rounded-lg flex items-center justify-center text-white cursor-pointer hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all hover:scale-105 active:scale-95 border border-indigo-500/50"
          >
             <Play className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-100 leading-tight">Customer Service Bot</h1>
            <p className="text-[10px] text-gray-500 font-mono">v1.0.4 • Auto-saved just now</p>
          </div>
        </div>
        
        {/* Toolbar Left */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors tooltip-trigger" title="Command Palette (Cmd+K)">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors tooltip-trigger" title="Comments">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors tooltip-trigger" title="Auto Layout">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1"></div>
          <button onClick={onZoomOut} className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors tooltip-trigger" title="Zoom Out">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={onZoomIn} className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors tooltip-trigger" title="Zoom In">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={onFitView} className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors tooltip-trigger" title="Fit to Screen">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Health & Issues */}
        <div className="flex items-center gap-3 mr-4 border-r border-white/10 pr-4">
          {issues.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-400 rounded-md text-xs font-medium border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
               <ShieldAlert className="w-3.5 h-3.5" /> 
               {issues.filter(i => i.type === 'error').length} Errors
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-400 rounded-md text-xs font-medium border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
               <ShieldAlert className="w-3.5 h-3.5" /> 
               Ready
            </div>
          )}
          
          {health && (
             <div className="flex items-center gap-2" title="Flow Health Score">
               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${health.score > 90 ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                 {health.score}
               </div>
             </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-xs font-semibold flex items-center gap-2 border border-transparent hover:border-white/10 transition-all">
            <Settings className="w-3.5 h-3.5" /> Config
          </button>
          <button className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-xs font-semibold flex items-center gap-2 border border-transparent hover:border-white/10 transition-all">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="px-4 py-1.5 rounded-lg bg-indigo-600/90 text-white text-xs font-semibold hover:bg-indigo-500 flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-500/50 transition-all">
            <Share className="w-3.5 h-3.5" /> Publish
          </button>
        </div>
      </div>
    </div>
  );
}
