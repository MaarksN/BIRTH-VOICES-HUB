import { StudioNode, StudioEdge, ValidationResult, ValidationIssue, FlowHealthScore } from './types';

export class ValidationEngine {
  public validate(nodes: StudioNode[], edges: StudioEdge[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    // 1. Check for start nodes count
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      issues.push({
        id: 'err-no-start',
        type: 'error',
        message: 'Nenhum Start Node encontrado. O fluxo nunca será iniciado.'
      });
    } else if (startNodes.length > 1) {
      issues.push({
        id: 'err-multi-start',
        type: 'error',
        message: 'Múltiplos Start Nodes encontrados. Um fluxo de voz deve ter exatamente uma entrada principal.'
      });
    }

    // Prepare Adjacency Lists for graph traversals
    const adj: Record<string, string[]> = {};
    const revAdj: Record<string, string[]> = {};
    nodes.forEach(node => {
      adj[node.id] = [];
      revAdj[node.id] = [];
    });

    edges.forEach(edge => {
      if (adj[edge.source]) adj[edge.source].push(edge.target);
      if (revAdj[edge.target]) revAdj[edge.target].push(edge.source);
    });

    // 2. Loop Detection (DFS for Back Edges)
    const visited: Record<string, 'unvisited' | 'visiting' | 'visited'> = {};
    nodes.forEach(n => {
      visited[n.id] = 'unvisited';
    });

    let hasCycle = false;
    const dfsCheckCycle = (u: string) => {
      visited[u] = 'visiting';
      const neighbors = adj[u] || [];
      for (const v of neighbors) {
        if (visited[v] === 'visiting') {
          hasCycle = true;
          issues.push({
            id: `err-loop-${u}-${v}`,
            nodeId: u,
            type: 'error',
            message: `Loop detectado! Existe uma dependência cíclica direta ou indireta entre os nós.`
          });
        } else if (visited[v] === 'unvisited') {
          dfsCheckCycle(v);
        }
      }
      visited[u] = 'visited';
    };

    if (startNodes.length > 0) {
      dfsCheckCycle(startNodes[0].id);
    }
    // Check remaining components for cycles
    nodes.forEach(n => {
      if (visited[n.id] === 'unvisited') {
        dfsCheckCycle(n.id);
      }
    });

    // 3. Reachability / Orphan checking (BFS from start nodes)
    const reachable = new Set<string>();
    const queue: string[] = [];
    startNodes.forEach(s => {
      queue.push(s.id);
      reachable.add(s.id);
    });

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = adj[curr] || [];
      for (const next of neighbors) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }

    // 4. Node-level checks
    nodes.forEach(node => {
      const hasInput = revAdj[node.id]?.length > 0;
      const hasOutput = adj[node.id]?.length > 0;
      
      // Reachability (Orphan) Check
      if (node.type !== 'start' && !reachable.has(node.id)) {
        issues.push({
          id: `warn-orphan-${node.id}`,
          nodeId: node.id,
          type: 'warning',
          message: `Nó órfão detectado. Este nó não é alcançável a partir do fluxo de entrada.`
        });
      }

      // Dead End Checks
      if (node.type !== 'end' && node.type !== 'human_handoff' && !hasOutput) {
        issues.push({
          id: `err-dead-end-${node.id}`,
          nodeId: node.id,
          type: 'error',
          message: 'Nó sem saída conectada (Dead End). O assistente ficará em silêncio aqui.'
        });
      }

      // Input Checks
      if (node.type !== 'start' && !hasInput) {
        issues.push({
          id: `warn-no-input-${node.id}`,
          nodeId: node.id,
          type: 'warning',
          message: 'Nó não possui entrada conectada.'
        });
      }

      // Specific Node Validations
      if (node.type === 'prompt') {
        if (!node.data.config?.promptText || node.data.config.promptText.trim() === '') {
          issues.push({
            id: `err-prompt-empty-${node.id}`,
            nodeId: node.id,
            type: 'error',
            message: 'Configuração do prompt está vazia. O assistente não saberá o que responder.'
          });
        }
      }

      if (node.type === 'llm') {
        if (!node.data.config?.provider) {
          issues.push({
            id: `err-llm-provider-${node.id}`,
            nodeId: node.id,
            type: 'error',
            message: 'Nenhum provedor de modelo LLM foi selecionado.'
          });
        }
      }

      if (node.type === 'voice') {
        if (!node.data.config?.voiceId) {
          issues.push({
            id: `err-voice-config-${node.id}`,
            nodeId: node.id,
            type: 'error',
            message: 'Id da voz ausente na configuração do Voice Setup.'
          });
        }
      }

      if (node.type === 'question') {
        if (!node.data.config?.questionText) {
          issues.push({
            id: `err-question-text-${node.id}`,
            nodeId: node.id,
            type: 'error',
            message: 'A pergunta ou instrução de coleta de informação está vazia.'
          });
        }
        if (!node.data.config?.variableToSave) {
          issues.push({
            id: `warn-question-var-${node.id}`,
            nodeId: node.id,
            type: 'warning',
            message: 'Nenhuma variável definida para armazenar a resposta do usuário.'
          });
        }
      }

      if (node.type === 'tool') {
        if (!node.data.config?.endpoint) {
          issues.push({
            id: `err-tool-endpoint-${node.id}`,
            nodeId: node.id,
            type: 'error',
            message: 'Endpoint de API REST ou URL do Webhook não configurado.'
          });
        }
      }

      if (node.type === 'knowledge') {
        if (!node.data.config?.database) {
          issues.push({
            id: `err-knowledge-db-${node.id}`,
            nodeId: node.id,
            type: 'error',
            message: 'Nenhuma base de conhecimento ou FAQ foi vinculada a este nó.'
          });
        }
      }
    });

    // 5. Duplicate Connections Check
    const seenEdges = new Set<string>();
    edges.forEach(e => {
      const key = `${e.source}->${e.target}`;
      if (seenEdges.has(key)) {
        issues.push({
          id: `warn-dup-edge-${e.id}`,
          edgeId: e.id,
          type: 'warning',
          message: `Conexão duplicada detectada entre os mesmos nós.`
        });
      }
      seenEdges.add(key);
    });

    // Calculate dynamic Flow Health Score
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    // Deduct score based on issues
    let baseScore = 100;
    baseScore -= errorCount * 15;
    baseScore -= warningCount * 5;
    if (hasCycle) baseScore -= 10;
    const score = Math.max(10, Math.min(100, baseScore));

    // Dynamic metrics
    const complexity = Math.min(100, nodes.length * 8 + edges.length * 4);
    const performance = Math.max(60, 98 - (nodes.length * 1.2) - (errorCount * 4));
    const estimatedCost = parseFloat((nodes.filter(n => n.type === 'llm' || n.type === 'prompt').length * 0.015).toFixed(4));
    const latency = nodes.length * 45 + (nodes.filter(n => n.type === 'llm' || n.type === 'prompt').length * 280);
    const risk = Math.min(100, errorCount * 25 + warningCount * 8 + (hasCycle ? 40 : 0));
    
    // Quality calculations
    const reusability = Math.max(30, 90 - (nodes.length * 1.5));
    const coverage = Math.max(40, 100 - (warningCount * 6));
    const scalability = Math.max(50, 95 - (nodes.length * 0.8));
    const quality = Math.max(30, Math.round((score + performance + reusability) / 3));

    const healthScore: FlowHealthScore = {
      score,
      complexity,
      performance,
      estimatedCost,
      latency,
      risk,
      reusability,
      coverage,
      scalability,
      quality
    };

    return {
      isValid: errorCount === 0,
      issues,
      healthScore
    };
  }
}

export const validationEngine = new ValidationEngine();
