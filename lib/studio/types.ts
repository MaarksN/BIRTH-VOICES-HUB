import { Node, Edge } from '@xyflow/react';

export type NodeType =
  | 'start'
  | 'end'
  | 'prompt'
  | 'question'
  | 'condition'
  | 'switch'
  | 'memory'
  | 'knowledge'
  | 'tool'
  | 'human_handoff'
  | 'voice'
  | 'llm';

export interface StudioNodeData {
  label: string;
  category: string;
  icon?: string;
  color?: string;
  config?: any;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  metrics?: {
    invocations: number;
    errorRate: number;
    latencyMs: number;
  };
}

export type StudioNode = Node<StudioNodeData, NodeType>;

export interface StudioEdgeData {
  condition?: string;
  priority?: number;
  weight?: number;
  description?: string;
  category?: string;
  event?: string;
  isFallback?: boolean;
}

export type StudioEdge = Edge<StudioEdgeData>;

export interface FlowHealthScore {
  score: number;
  complexity: number; // 0-100
  performance: number; // 0-100
  estimatedCost: number; // USD per 10k runs
  latency: number; // ms
  risk: number; // 0-100
  reusability: number; // 0-100
  coverage: number; // 0-100
  scalability: number; // 0-100
  quality: number; // 0-100
}

export interface ValidationIssue {
  id: string;
  nodeId?: string;
  edgeId?: string;
  type: 'error' | 'warning' | 'suggestion' | 'best_practice';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  healthScore: FlowHealthScore;
}
