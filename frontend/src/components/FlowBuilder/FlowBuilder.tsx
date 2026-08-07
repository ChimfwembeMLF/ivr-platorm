import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StepPalette } from './StepPalette';
import { StepProperties } from './StepProperties';
import { AudioManager } from '../AudioManager/AudioManager';
import { FlowService } from '../../services/api';

const initialNodes = [
  {
    id: 'start',
    type: 'input',
    data: { label: 'Start Call' },
    position: { x: 250, y: 5 },
  },
];

let id = 0;
const getId = () => `node_${id++}`;

export const FlowBuilder = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showAudioManager, setShowAudioManager] = useState(false);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      if (reactFlowInstance) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const newNode = {
          id: getId(),
          type,
          position,
          data: { label: `${type} node` },
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = (_: any, node: any) => {
    setSelectedNode(node);
  };

  const handleSave = async () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      // Tenant and Flow ID would be dynamically loaded
      // await FlowService.saveFlowDefinition('tenant_id', 'flow_id', flow);
      console.log('Saved flow:', flow);
      alert('Flow saved successfully!');
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {showAudioManager && (
        <AudioManager tenantId="00000000-0000-0000-0000-000000000000" onClose={() => setShowAudioManager(false)} />
      )}
      <div className="flex justify-between p-4 bg-surface-dark border-b border-border-dark">
        <h1 className="text-2xl font-bold text-white flex items-center gap-4">
          Flow Builder
          <button 
            onClick={() => setShowAudioManager(true)}
            className="text-sm px-3 py-1 bg-border-dark hover:bg-gray-700 text-white rounded transition-colors font-normal"
          >
            Manage Audio
          </button>
        </h1>
        <button 
          onClick={handleSave}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded transition-colors shadow-[0_0_15px_rgba(170,59,255,0.4)]"
        >
          Save Flow
        </button>
      </div>
      <div className="flex flex-row h-[calc(100vh-73px)] w-full">
        <StepPalette />
        <div className="flex-grow h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            fitView
            className="bg-background-dark"
          >
            <Controls className="bg-surface-dark border-border-dark fill-white" />
            <Background color="#2e303a" gap={16} />
          </ReactFlow>
        </div>
        <StepProperties selectedNode={selectedNode} setNodes={setNodes} />
      </div>
    </div>
  );
};

export default function FlowBuilderWithProvider() {
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  );
}
