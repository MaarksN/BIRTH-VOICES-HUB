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
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-r border-gray-200 pr-4">
          <div 
            onClick={onSimulate}
            title="Simular Ligação (Test Call)"
            className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white cursor-pointer hover:bg-indigo-700 shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
             <Play className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Customer Service Bot</h1>
            <p className="text-[10px] text-gray-500 font-mono">v1.0.4 • Auto-saved just now</p>
          </div>
        </div>
        
        {/* Toolbar Left */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors tooltip-trigger" title="Command Palette (Cmd+K)">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors tooltip-trigger" title="Comments">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors tooltip-trigger" title="Auto Layout">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          <button onClick={onZoomOut} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors tooltip-trigger" title="Zoom Out">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={onZoomIn} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors tooltip-trigger" title="Zoom In">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={onFitView} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors tooltip-trigger" title="Fit to Screen">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Health & Issues */}
        <div className="flex items-center gap-3 mr-4 border-r border-gray-200 pr-4">
          {issues.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-medium border border-red-100">
               <ShieldAlert className="w-3.5 h-3.5" /> 
               {issues.filter(i => i.type === 'error').length} Errors
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium border border-green-100">
               <ShieldAlert className="w-3.5 h-3.5" /> 
               Ready
            </div>
          )}
          
          {health && (
             <div className="flex items-center gap-2" title="Flow Health Score">
               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${health.score > 90 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                 {health.score}
               </div>
             </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-semibold flex items-center gap-2 border border-transparent hover:border-gray-200 transition-all">
            <Settings className="w-3.5 h-3.5" /> Config
          </button>
          <button className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-semibold flex items-center gap-2 border border-transparent hover:border-gray-200 transition-all">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-2 shadow-sm transition-all">
            <Share className="w-3.5 h-3.5" /> Publish
          </button>
        </div>
      </div>
    </div>
  );
}
