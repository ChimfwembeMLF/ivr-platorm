import React from 'react';

export const StepPalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 glass-panel p-4 flex flex-col gap-3 h-full border-r border-border-dark bg-surface-dark/50">
      <h3 className="font-semibold text-lg text-primary mb-2">Nodes</h3>
      
      <div 
        className="p-3 border border-border-dark rounded cursor-grab hover:border-primary transition-colors bg-background-dark shadow-sm text-gray-200"
        onDragStart={(e) => onDragStart(e, 'playAudio')} 
        draggable
      >
        Play Audio
      </div>
      
      <div 
        className="p-3 border border-border-dark rounded cursor-grab hover:border-primary transition-colors bg-background-dark shadow-sm text-gray-200"
        onDragStart={(e) => onDragStart(e, 'gather')} 
        draggable
      >
        Gather DTMF
      </div>
      
      <div 
        className="p-3 border border-border-dark rounded cursor-grab hover:border-primary transition-colors bg-background-dark shadow-sm text-gray-200"
        onDragStart={(e) => onDragStart(e, 'hangup')} 
        draggable
      >
        Hangup
      </div>
    </div>
  );
};
