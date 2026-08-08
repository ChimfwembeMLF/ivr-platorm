import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { PlayCircle, PhoneCall, PhoneOff, Keyboard, Network } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BaseNode = ({ 
  data, 
  icon: Icon, 
  title, 
  primaryColor, 
  isStart = false,
  isEnd = false,
  children
}: any) => {
  return (
    <Card className="min-w-[220px] shadow-sm border-l-4 group" style={{ borderLeftColor: primaryColor }}>
      {!isStart && (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 rounded-full border-2 border-background"
          style={{ backgroundColor: primaryColor }}
        />
      )}
      
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted border flex items-center justify-center">
            <Icon size={20} style={{ color: primaryColor }} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-foreground">{title}</span>
            <span className="text-xs text-muted-foreground font-medium truncate max-w-[130px]">
              {data?.label || 'Configure node...'}
            </span>
          </div>
        </div>
        {children && (
          <div className="pt-2 border-t text-xs text-muted-foreground flex flex-col gap-1">
            {children}
          </div>
        )}
      </CardContent>

      {!isEnd && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 rounded-full border-2 border-background"
          style={{ backgroundColor: primaryColor }}
        />
      )}
    </Card>
  );
};

export const StartNode = memo((props: NodeProps) => (
  <BaseNode {...props} icon={PhoneCall} title="Start Call" primaryColor="#10b981" isStart />
));

export const PlayAudioNode = memo((props: NodeProps) => (
  <BaseNode {...props} icon={PlayCircle} title="Play Audio" primaryColor="#8b5cf6">
    {props.data?.audio_asset_id && (
      <span className="truncate" title={props.data.audio_asset_id}>Asset: {props.data.audio_asset_id}</span>
    )}
  </BaseNode>
));

export const GatherInputNode = memo((props: NodeProps) => (
  <BaseNode {...props} icon={Keyboard} title="Gather Input" primaryColor="#3b82f6">
    <div className="flex justify-between items-center">
      <span>Max Digits: {props.data?.max_digits || 1}</span>
      <span>Var: {props.data?.variable_name || 'dtmf_input'}</span>
    </div>
  </BaseNode>
));

export const ApiCallNode = memo((props: NodeProps) => (
  <BaseNode {...props} icon={Network} title="API Request" primaryColor="#f59e0b">
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-[10px] uppercase h-4 px-1">{props.data?.method || 'GET'}</Badge>
      <span className="truncate max-w-[130px]" title={props.data?.url}>{props.data?.url || 'No URL'}</span>
    </div>
  </BaseNode>
));

export const HangupNode = memo((props: NodeProps) => (
  <BaseNode {...props} icon={PhoneOff} title="Hangup" primaryColor="#ef4444" isEnd>
    {props.data?.reason && (
      <span>Reason: {props.data.reason}</span>
    )}
  </BaseNode>
));
