import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from '../../services/api';

interface StepPropertiesProps {
  selectedNode: any;
  setNodes: any;
}

export const StepProperties: React.FC<StepPropertiesProps> = ({ selectedNode, setNodes }) => {
  const [data, setData] = useState<any>({});
  const [audioAssets, setAudioAssets] = useState<any[]>([]);

  useEffect(() => {
    if (selectedNode) {
      setData(selectedNode.data || {});
      
      // If play_audio node, fetch audio assets
      if (selectedNode.type === 'play_audio' && audioAssets.length === 0) {
        // Use a dummy tenant ID for now or fetch from context
        api.get('/audio?tenant_id=00000000-0000-0000-0000-000000000000')
          .then(res => setAudioAssets(res.data))
          .catch(err => console.error("Failed to load audio assets", err));
      }
    } else {
      setData({});
    }
  }, [selectedNode]);

  const updateNodeData = (key: string, value: any) => {
    const newData = { ...data, [key]: value };
    setData(newData);
    
    setNodes((nds: any[]) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          node.data = newData;
        }
        return node;
      })
    );
  };

  if (!selectedNode) {
    return (
      <Card className="w-80 m-4 h-[calc(100%-2rem)] z-10 flex flex-col items-center justify-center rounded-xl border-border bg-card text-muted-foreground shadow">
        <p>Select a node to edit properties</p>
      </Card>
    );
  }

  return (
    <Card className="w-80 m-4 h-[calc(100%-2rem)] z-10 flex flex-col rounded-xl border-border bg-card shadow overflow-y-auto">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-lg">Properties</CardTitle>
        <CardDescription>Configure the selected node.</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground">Node ID</Label>
          <code className="text-xs bg-muted p-2 rounded">{selectedNode.id}</code>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Label</Label>
          <Input 
            value={data.label || ''}
            onChange={(e) => updateNodeData('label', e.target.value)}
            placeholder="Node label"
          />
        </div>
        
        {/* Dynamic Fields based on Node Type */}
        {selectedNode.type === 'play_audio' && (
          <div className="flex flex-col gap-2">
            <Label>Audio Asset</Label>
            <Select 
              value={data.audio_asset_id || ''} 
              onValueChange={(val) => updateNodeData('audio_asset_id', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audio asset..." />
              </SelectTrigger>
              <SelectContent>
                {audioAssets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.file_path.split('/').pop()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedNode.type === 'collect_dtmf' && (
          <>
            <div className="flex flex-col gap-2">
              <Label>Max Digits</Label>
              <Input 
                type="number"
                min="1"
                max="20"
                value={data.max_digits || 1}
                onChange={(e) => updateNodeData('max_digits', parseInt(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Timeout (seconds)</Label>
              <Input 
                type="number"
                min="1"
                max="60"
                value={data.timeout || 5}
                onChange={(e) => updateNodeData('timeout', parseInt(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Variable Name</Label>
              <Input 
                value={data.variable_name || 'dtmf_input'}
                onChange={(e) => updateNodeData('variable_name', e.target.value)}
                placeholder="e.g. account_number"
              />
            </div>
          </>
        )}

        {selectedNode.type === 'api_call' && (
          <>
            <div className="flex flex-col gap-2">
              <Label>Method</Label>
              <Select 
                value={data.method || 'GET'} 
                onValueChange={(val) => updateNodeData('method', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>URL</Label>
              <Input 
                value={data.url || ''}
                onChange={(e) => updateNodeData('url', e.target.value)}
                placeholder="https://api.example.com/data"
              />
            </div>
          </>
        )}
        
        {selectedNode.type === 'hangup' && (
          <div className="flex flex-col gap-2">
            <Label>Reason</Label>
            <Input 
              value={data.reason || 'Normal'}
              onChange={(e) => updateNodeData('reason', e.target.value)}
              placeholder="e.g. Normal, Rejected"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
