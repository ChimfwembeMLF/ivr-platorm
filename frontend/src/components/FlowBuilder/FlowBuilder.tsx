import React, { useCallback, useState, useRef, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  MarkerType
} from 'reactflow';
import type { Connection, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

import { StepPalette } from './StepPalette';
import { StepProperties } from './StepProperties';
import { AudioManager } from '../AudioManager/AudioManager';
import { StartNode, PlayAudioNode, GatherInputNode, ApiCallNode, HangupNode } from '../FlowNodes/CustomNodes';
import { Phone, Save, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const initialNodes = [
  {
    id: 'start',
    type: 'start',
    data: { label: 'Inbound Call' },
    position: { x: 250, y: 40 },
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

  const nodeTypes = useMemo(() => ({
    start: StartNode,
    play_audio: PlayAudioNode,
    collect_dtmf: GatherInputNode,
    api_call: ApiCallNode,
    hangup: HangupNode
  }), []);

  const onConnect = useCallback((params: Connection | Edge) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#8b5cf6',
      },
    }, eds));
  }, [setEdges]);

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
          data: { label: `Configure ${type}...` },
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = (_: any, node: any) => {
    setSelectedNode(node);
  };
  
  const onPaneClick = () => {
    setSelectedNode(null);
  };

  const handleSave = async () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      console.log('Saved flow:', flow);
      alert('Flow saved successfully!');
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-background text-foreground">
      {showAudioManager && (
        <AudioManager tenantId="00000000-0000-0000-0000-000000000000" onClose={() => setShowAudioManager(false)} />
      )}
      
      {/* Header */}
      <div className="border-b bg-card flex justify-between items-center px-6 py-4 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Phone size={20} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              IVR Platform
            </h1>
            <p className="text-xs text-muted-foreground font-medium">Flow Builder Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="outline"
            onClick={() => setShowAudioManager(true)}
            className="gap-2"
          >
            <Volume2 size={16} />
            <span>Audio Assets</span>
          </Button>
          <Button 
            onClick={handleSave}
            className="gap-2"
          >
            <Save size={16} />
            <span>Deploy Flow</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-row flex-grow w-full overflow-hidden bg-muted/20">
        <StepPalette />
        <div className="flex-grow h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Controls className="bg-card border-border fill-foreground shadow-sm rounded-md overflow-hidden" />
            <Background gap={24} size={1} />
            <MiniMap 
              nodeStrokeColor={(n) => {
                if (n.type === 'start') return '#10b981';
                if (n.type === 'hangup') return '#ef4444';
                return '#8b5cf6';
              }}
              nodeColor={(n) => {
                return 'hsl(var(--card))';
              }}
              maskColor="hsl(var(--muted)/0.5)"
              className="bg-card border border-border shadow-sm rounded-md overflow-hidden"
            />
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
