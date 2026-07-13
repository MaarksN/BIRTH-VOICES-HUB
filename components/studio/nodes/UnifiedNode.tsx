import { Handle, Position, NodeProps } from '@xyflow/react';
import { StudioNodeData, StudioNode } from '../../../lib/studio/types';
import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

interface UnifiedNodeProps extends NodeProps<StudioNode> {
  iconName: keyof typeof Icons;
  colorClass: string;
  headerTitle: string;
  inputs?: number;
  outputs?: number;
}

export function UnifiedNode({ data, iconName, colorClass, headerTitle, inputs = 1, outputs = 1, selected }: UnifiedNodeProps) {
  const Icon = Icons[iconName] as LucideIcon;
  const isInvalid = data.validation?.isValid === false;
  const lifecycle = data.lifecycleState || 'Ready';

  // Determine active visual glow or status borders based on lifecycle
  let lifecycleBorderGlow = 'border-gray-200 hover:border-gray-300';
  if (selected) {
    lifecycleBorderGlow = 'ring-2 ring-indigo-500 border-indigo-500 shadow-md';
  } else if (isInvalid) {
    lifecycleBorderGlow = 'border-red-500 ring-1 ring-red-500';
  } else if (lifecycle === 'Executing') {
    lifecycleBorderGlow = 'ring-2 ring-purple-600 border-purple-600 shadow-lg animate-pulse';
  } else if (lifecycle === 'Completed') {
    lifecycleBorderGlow = 'border-green-500 ring-1 ring-green-100 shadow-sm';
  } else if (lifecycle === 'Failed') {
    lifecycleBorderGlow = 'border-red-500 ring-2 ring-red-100';
  }

  // Lifecycle badges colors
  const badgeStyles: Record<string, string> = {
    Created: 'bg-gray-100 text-gray-700',
    Initialized: 'bg-blue-100 text-blue-700',
    Configured: 'bg-teal-100 text-teal-700',
    Validated: 'bg-emerald-100 text-emerald-700',
    Ready: 'bg-gray-100 text-gray-500 border-gray-200',
    Executing: 'bg-purple-100 text-purple-700 animate-bounce',
    Completed: 'bg-green-100 text-green-700',
    Failed: 'bg-red-100 text-red-700',
    Retry: 'bg-amber-100 text-amber-700 animate-pulse',
    Archived: 'bg-slate-100 text-slate-500'
  };

  return (
    <div className={`
      relative min-w-[280px] bg-white rounded-xl border shadow-sm transition-all duration-200
      ${lifecycleBorderGlow}
    `}>
      {/* Handles - Inputs */}
      {Array.from({ length: inputs }).map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          className="w-3 h-3 border-2 border-white bg-gray-400 hover:bg-indigo-500"
          style={{ top: inputs > 1 ? `${(100 / (inputs + 1)) * (i + 1)}%` : '50%' }}
        />
      ))}

      {/* Header */}
      <div className={`flex items-center gap-3 p-3 border-b border-gray-100 rounded-t-xl ${colorClass} bg-opacity-10`}>
        <div className={`p-1.5 rounded-lg bg-white shadow-sm ${colorClass.replace('bg-', 'text-')}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">{headerTitle}</h3>
            {/* Real-time Lifecycle State Tag */}
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeStyles[lifecycle] || 'bg-gray-100 text-gray-600'}`}>
              {lifecycle}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900">{data.label}</p>
        </div>
        {data.validation?.errors && data.validation.errors.length > 0 && (
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" title={data.validation.errors[0]} />
        )}
      </div>

      {/* Body Placeholder */}
      <div className="p-4 space-y-2 text-sm text-gray-600">
        {Object.entries(data.config || {}).slice(0, 3).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="capitalize">{key}</span>
            <span className="font-mono text-xs font-medium text-gray-900 truncate max-w-[120px]">
              {String(value)}
            </span>
          </div>
        ))}
        {(!data.config || Object.keys(data.config).length === 0) && (
          <div className="text-xs italic text-gray-400">Configure parameters...</div>
        )}
      </div>

      {/* Footer Metrics (Optional) */}
      {data.metrics && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl text-[10px] font-mono text-gray-500">
          <span>{data.metrics.invocations.toLocaleString()} runs</span>
          <span>{data.metrics.latencyMs}ms</span>
        </div>
      )}

      {/* Handles - Outputs */}
      {Array.from({ length: outputs }).map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          className="w-3 h-3 border-2 border-white bg-indigo-400 hover:bg-indigo-600"
          style={{ top: outputs > 1 ? `${(100 / (outputs + 1)) * (i + 1)}%` : '50%' }}
        />
      ))}
    </div>
  );
}
