import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
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

import { validationEngine } from '../../lib/studio/ValidationEngine';
import { useStudioStore } from '../../store/useStudioStore';
import { StudioNode, StudioEdge } from '../../lib/studio/types';
import { 
  StartNode, EndNode, PromptNode, ConditionNode, ToolNode, LlmNode, VoiceNode, 
  QuestionNode, SwitchNode, MemoryNode, KnowledgeNode, HumanHandoffNode 
} from './nodes';
import { StudioEdge as CustomStudioEdge } from './edges/StudioEdge';
import { TopBar } from './panels/TopBar';
import { LayersPanel } from './panels/LayersPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { BottomDrawer } from './panels/BottomDrawer';

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

function CanvasInner() {
  const {
    nodes,
    edges,
    selectedNodeId,
    setSelectedNodeId,
    setNodes,
    setEdges,
    connectNodes,
    nodeLifecycles,
    loadWorkflowFromServer,
    saveWorkflowToServer
  } = useStudioStore();

  useEffect(() => {
    loadWorkflowFromServer();
  }, [loadWorkflowFromServer]);

  useEffect(() => {
    // Only save if there are actual nodes
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        saveWorkflowToServer();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, saveWorkflowToServer]);
  
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      setSelectedNodeId(selectedNodes.length > 0 ? selectedNodes[0].id : null);
    },
  });

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const result = validationEngine.validate(nodes, edges);
  const health = result.healthScore;
  const issues = result.issues;

  const renderedNodes = nodes.map(n => {
    const nodeIssues = issues.filter(i => i.nodeId === n.id);
    const lifecycle = nodeLifecycles[n.id] || 'Ready';
    return {
      ...n,
      data: {
        ...n.data,
        lifecycleState: lifecycle,
        validation: {
          isValid: nodeIssues.filter(i => i.type === 'error').length === 0,
          errors: nodeIssues.filter(i => i.type === 'error').map(i => i.message),
          warnings: nodeIssues.filter(i => i.type === 'warning').map(i => i.message),
        }
      }
    };
  });

  const onNodesChange = useCallback(
    (changes: NodeChange<StudioNode>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<StudioEdge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const onConnect = useCallback(
    (params: Connection) => connectNodes(params),
    [connectNodes],
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
      
      <div className="flex-1 flex min-h-0">
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

      <BottomDrawer />
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
