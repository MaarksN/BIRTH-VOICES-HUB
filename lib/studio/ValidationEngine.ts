import { StudioNode, StudioEdge, ValidationResult, ValidationIssue, FlowHealthScore } from './types';

export class ValidationEngine {
  public validate(nodes: StudioNode[], edges: StudioEdge[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    // 1. Check for disconnected nodes (except Start)
    nodes.forEach(node => {
      const hasInput = edges.some(e => e.target === node.id);
      const hasOutput = edges.some(e => e.source === node.id);
      
      if (node.type !== 'start' && !hasInput) {
        issues.push({
          id: crypto.randomUUID(),
          nodeId: node.id,
          type: 'warning',
          message: 'Nó desconectado (unreachable).'
        });
      }
      
      if (node.type !== 'end' && node.type !== 'human_handoff' && !hasOutput) {
        issues.push({
          id: crypto.randomUUID(),
          nodeId: node.id,
          type: 'error',
          message: 'Nó sem saída conectada (Dead End).'
        });
      }

      // Validate specific configurations
      if (node.type === 'prompt' && !node.data.config?.promptText) {
        issues.push({
          id: crypto.randomUUID(),
          nodeId: node.id,
          type: 'error',
          message: 'Prompt vazio.'
        });
      }
      
      if (node.type === 'llm' && !node.data.config?.provider) {
        issues.push({
          id: crypto.randomUUID(),
          nodeId: node.id,
          type: 'error',
          message: 'Provider de LLM ausente.'
        });
      }
    });

    // 2. Check for start nodes
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'error',
        message: 'Nenhum Start Node encontrado. O fluxo nunca será iniciado.'
      });
    }

    // Calculate mock health score based on metrics and rules
    const healthScore: FlowHealthScore = {
      score: issues.filter(i => i.type === 'error').length > 0 ? 40 : 92,
      complexity: Math.min(100, nodes.length * 5 + edges.length * 2),
      performance: 95,
      estimatedCost: 0.05,
      latency: 250,
      risk: issues.length > 0 ? 30 : 5,
      reusability: 85,
      coverage: 90,
      scalability: 98,
      quality: 94
    };

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      healthScore
    };
  }
}

export const validationEngine = new ValidationEngine();
