import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
  ReactFlowProvider,
  useOnSelectionChange,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StudioNode, StudioEdge } from '../../lib/studio/types';
import { validationEngine } from '../../lib/studio/ValidationEngine';
import { 
  StartNode, EndNode, PromptNode, ConditionNode, ToolNode, LlmNode, VoiceNode, 
  QuestionNode, SwitchNode, MemoryNode, KnowledgeNode, HumanHandoffNode 
} from './nodes';
import { StudioEdge as CustomStudioEdge } from './edges/StudioEdge';
import { TopBar } from './panels/TopBar';
import { LayersPanel } from './panels/LayersPanel';
import { InspectorPanel } from './panels/InspectorPanel';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  condition: ConditionNode,
  tool: ToolNode,
  llm: LlmNode,
  voice: VoiceNode,
  question: QuestionNode,
  switch: SwitchNode,
  memory: MemoryNode,
  knowledge: KnowledgeNode,
  human_handoff: HumanHandoffNode,
};

const edgeTypes = {
  studioEdge: CustomStudioEdge,
};

const initialNodes: StudioNode[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 100, y: 300 },
    data: { label: 'Inbound Call', category: 'Trigger', config: { channel: 'Telefone' } }
  },
  {
    id: 'voice-1',
    type: 'voice',
    position: { x: 450, y: 200 },
    data: { label: 'Voice Setup', category: 'Config', config: { provider: 'ElevenLabs', language: 'pt-BR' } }
  },
  {
    id: 'llm-1',
    type: 'llm',
    position: { x: 450, y: 400 },
    data: { label: 'Gemini 3.1 Pro', category: 'LLM', config: { provider: 'Gemini', temperature: 0.2 } }
  },
  {
    id: 'prompt-1',
    type: 'prompt',
    position: { x: 800, y: 300 },
    data: { label: 'Atendimento Inicial', category: 'Prompt', config: { promptText: 'Você é um assistente virtual...' } }
  },
  {
    id: 'condition-1',
    type: 'condition',
    position: { x: 1150, y: 300 },
    data: { label: 'Verifica Intenção', category: 'Logic', config: { variable: 'intent', operator: 'equals' } }
  },
  {
    id: 'handoff-1',
    type: 'human_handoff',
    position: { x: 1500, y: 150 },
    data: { label: 'Transferir Suporte', category: 'Action', config: { department: 'Suporte Técnico' } }
  },
  {
    id: 'knowledge-1',
    type: 'knowledge',
    position: { x: 1500, y: 450 },
    data: { label: 'Buscar Documentos', category: 'Knowledge', config: { database: 'Notion FAQs' } }
  },
  {
    id: 'end-1',
    type: 'end',
    position: { x: 1850, y: 450 },
    data: { label: 'Finalizar', category: 'Trigger', config: {} }
  }
];

const initialEdges: StudioEdge[] = [
  { id: 'e1-v1', source: 'start-1', target: 'voice-1', type: 'studioEdge' },
  { id: 'e1-l1', source: 'start-1', target: 'llm-1', type: 'studioEdge' },
  { id: 'ev1-p1', source: 'voice-1', target: 'prompt-1', type: 'studioEdge' },
  { id: 'el1-p1', source: 'llm-1', target: 'prompt-1', type: 'studioEdge' },
  { id: 'e-p1-c1', source: 'prompt-1', target: 'condition-1', type: 'studioEdge' },
  { id: 'e-c1-h1', source: 'condition-1', target: 'handoff-1', sourceHandle: 'out-0', type: 'studioEdge', data: { condition: 'Intent == Suporte' } },
  { id: 'e-c1-k1', source: 'condition-1', target: 'knowledge-1', sourceHandle: 'out-1', type: 'studioEdge', data: { condition: 'Intent == Dúvida', isFallback: true } },
  { id: 'e-k1-e1', source: 'knowledge-1', target: 'end-1', type: 'studioEdge' },
];

function CanvasInner() {
  const [nodes, setNodes] = useState<StudioNode[]>(initialNodes);
  const [edges, setEdges] = useState<StudioEdge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<StudioNode | null>(null);
  
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setSelectedNode(nodes.length > 0 ? (nodes[0] as StudioNode) : null);
    },
  });

  const result = validationEngine.validate(nodes, edges);
  const health = result.healthScore;
  const issues = result.issues;

  const renderedNodes = nodes.map(n => {
    const nodeIssues = issues.filter(i => i.nodeId === n.id);
    return {
      ...n,
      data: {
        ...n.data,
        validation: {
          isValid: nodeIssues.filter(i => i.type === 'error').length === 0,
          errors: nodeIssues.filter(i => i.type === 'error').map(i => i.message),
          warnings: nodeIssues.filter(i => i.type === 'warning').map(i => i.message),
        }
      }
    };
  });

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as StudioNode[]),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds) as StudioEdge[]),
    [],
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'studioEdge' }, eds) as StudioEdge[]),
    [],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      <TopBar 
        health={health} 
        issues={issues} 
        onZoomIn={() => zoomIn({ duration: 300 })}
        onZoomOut={() => zoomOut({ duration: 300 })}
        onFitView={() => fitView({ duration: 500, padding: 0.2 })}
      />
      
      <div className="flex flex-1 min-h-0">
        <LayersPanel nodes={nodes} />
        
        <div className="flex-1 relative bg-[#FAFAFA]">
          <ReactFlow
            nodes={renderedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            snapToGrid={true}
            snapGrid={[20, 20]}
            elevateNodesOnSelect={true}
            selectionMode="partial"
            panOnScroll={true}
            zoomOnPinch={true}
            panOnDrag={[1, 2]} // Space + drag also works by default
            selectionOnDrag={true}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd5e1" />
            <Controls className="bg-white border-gray-200 shadow-sm rounded-lg overflow-hidden" />
            <MiniMap 
              className="bg-white border border-gray-200 shadow-sm rounded-lg" 
              maskColor="rgba(248, 250, 252, 0.7)" 
              nodeColor="#c7d2fe" 
            />
          </ReactFlow>
        </div>

        <InspectorPanel selectedNode={selectedNode} />
      </div>
    </div>
  );
}

export function VisualCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
