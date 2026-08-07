import React, { useEffect, useState } from 'react';

interface StepPropertiesProps {
  selectedNode: any;
  setNodes: any;
}

export const StepProperties: React.FC<StepPropertiesProps> = ({ selectedNode, setNodes }) => {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data?.label || '');
    }
  }, [selectedNode]);

  const updateNodeLabel = (newLabel: string) => {
    setLabel(newLabel);
    setNodes((nds: any[]) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          node.data = {
            ...node.data,
            label: newLabel,
          };
        }
        return node;
      })
    );
  };

  if (!selectedNode) {
    return (
      <div className="w-80 glass-panel p-4 flex flex-col items-center justify-center text-gray-400 border-l border-border-dark bg-surface-dark/50 h-full">
        <p>Select a node to edit properties</p>
      </div>
    );
  }

  return (
    <div className="w-80 glass-panel p-4 flex flex-col gap-4 border-l border-border-dark bg-surface-dark/50 h-full">
      <h3 className="font-semibold text-lg text-primary border-b border-border-dark pb-2">
        Properties
      </h3>
      
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Node ID</label>
        <code className="text-xs bg-black/30 p-2 rounded text-gray-400">{selectedNode.id}</code>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Label</label>
        <input 
          value={label}
          onChange={(e) => updateNodeLabel(e.target.value)}
          className="bg-background-dark border border-border-dark rounded px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors"
        />
      </div>
      
      {selectedNode.type === 'playAudio' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">Audio Asset</label>
          <select className="bg-background-dark border border-border-dark rounded px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors">
            <option>Select audio...</option>
          </select>
        </div>
      )}
    </div>
  );
};
