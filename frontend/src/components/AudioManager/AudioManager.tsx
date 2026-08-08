import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { UploadCloud, Music, Volume2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export const AudioManager = ({ tenantId, onClose }: { tenantId: string, onClose: () => void }) => {
  const [audioList, setAudioList] = useState([]);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tenantId) loadAudio();
  }, [tenantId]);

  const loadAudio = async () => {
    try {
      const res = await api.get(`/audio?tenant_id=${tenantId}`);
      setAudioList(res.data);
    } catch (e) {
      console.error("Failed to load audio", e);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenant_id', tenantId);
    formData.append('language', 'en');
    formData.append('type', 'custom');

    try {
      await api.post('/audio/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadAudio();
    } catch (e) {
      console.error("Upload failed", e);
      alert("Audio upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Volume2 className="text-primary" size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl">Audio Assets</DialogTitle>
              <DialogDescription>
                Manage voice prompts and recordings for your IVR
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-grow">
          <div className="p-6 flex flex-col gap-8">
            
            {/* Upload Zone */}
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold text-lg">Upload New Prompt</h3>
              
              <Card 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed cursor-pointer transition-all duration-300 ${
                  isDragOver || file 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground hover:bg-muted/50'
                }`}
              >
                <input 
                  type="file" 
                  accept="audio/*"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && setFile(e.target.files[0])}
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <Music className="text-primary" size={48} />
                    <span className="font-medium text-lg">{file.name}</span>
                    <span className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-muted border shadow-sm">
                      <UploadCloud className="text-muted-foreground" size={32} />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-lg mb-1">Click or drag audio file here</p>
                      <p className="text-muted-foreground text-sm">Supports MP3, WAV (Max 10MB)</p>
                    </div>
                  </div>
                )}
              </Card>
              
              {file && (
                <div className="flex justify-end">
                  <Button 
                    onClick={uploadFile}
                    disabled={isUploading}
                    className="min-w-[140px]"
                  >
                    {isUploading ? (
                      <><Loader2 className="animate-spin mr-2" size={16} /> Uploading...</>
                    ) : (
                      <>Upload Asset</>
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Library */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-semibold text-lg">Asset Library</h3>
                <Badge variant="outline">
                  {audioList.length} items
                </Badge>
              </div>
              
              {audioList.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 border-dashed bg-muted/30">
                  <Music className="text-muted-foreground mb-3" size={32} />
                  <p className="text-muted-foreground text-sm">No audio assets available. Upload one above.</p>
                </Card>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {audioList.map((a: any) => (
                    <Card key={a.id} className="p-4 hover:border-muted-foreground transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]" title={a.file_path.split('/').pop()}>
                            {a.file_path.split('/').pop()}
                          </span>
                          <div className="flex gap-2 mt-1.5">
                            <Badge variant="secondary" className="text-[10px] uppercase">{a.type}</Badge>
                            <Badge variant="outline" className="text-[10px] uppercase">{a.language}</Badge>
                          </div>
                        </div>
                      </div>
                      <audio controls src={`http://localhost:8000/api/v1/audio/${a.id}`} className="w-full h-8 mt-2 opacity-80 hover:opacity-100 transition-opacity" />
                    </Card>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
