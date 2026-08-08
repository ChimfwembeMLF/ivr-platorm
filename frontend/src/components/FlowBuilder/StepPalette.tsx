import React from 'react';
import { PlayCircle, PhoneOff, Keyboard, Network, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const PALETTE_NODES = [
  { type: 'play_audio', label: 'Play Audio', icon: PlayCircle },
  { type: 'collect_dtmf', label: 'Gather Input', icon: Keyboard },
  { type: 'api_call', label: 'API Request', icon: Network },
  { type: 'hangup', label: 'Hangup', icon: PhoneOff }
];

export const StepPalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card className="w-72 m-4 h-[calc(100%-2rem)] z-10 flex flex-col rounded-xl border-border bg-card text-card-foreground shadow">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Node Library</CardTitle>
        <CardDescription>Drag nodes onto the canvas to build your flow.</CardDescription>
      </CardHeader>
      
      <ScrollArea className="flex-grow">
        <CardContent className="pt-4 flex flex-col gap-3">
          {PALETTE_NODES.map((node) => {
            const Icon = node.icon;
            return (
              <div 
                key={node.type}
                className="group flex items-center p-3 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground cursor-grab active:cursor-grabbing transition-colors relative"
                onDragStart={(e) => onDragStart(e, node.type)} 
                draggable
              >
                <div className="flex items-center justify-center p-1.5 rounded-md border bg-muted mr-3">
                  <Icon size={16} />
                </div>
                
                <span className="text-sm font-medium flex-grow">{node.label}</span>
                
                <GripVertical size={16} className="text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
