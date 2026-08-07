import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';

export const AudioManager = ({ tenantId, onClose }: { tenantId: string, onClose: () => void }) => {
  const [audioList, setAudioList] = useState([]);
  const [file, setFile] = useState<File | null>(null);
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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenant_id', tenantId);
    formData.append('language', 'en');
    formData.append('type', 'custom');

    try {
      await api.post('/audio/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Audio uploaded successfully!");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadAudio();
    } catch (e) {
      console.error("Upload failed", e);
      alert("Audio upload failed.");
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface-dark border border-border-dark rounded-xl shadow-2xl flex flex-col max-h-full">
        <div className="flex justify-between items-center p-4 border-b border-border-dark">
          <h2 className="text-xl font-bold text-white">Audio Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        
        <div className="p-4 flex-grow overflow-auto flex flex-col gap-6">
          <div className="glass-panel p-4 flex items-center justify-between">
            <input 
              type="file" 
              accept="audio/*"
              ref={fileInputRef}
              onChange={(e) => e.target.files && setFile(e.target.files[0])}
              className="text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover file:transition-colors file:cursor-pointer"
            />
            <button 
              onClick={uploadFile}
              disabled={!file}
              className={`px-4 py-2 rounded font-semibold transition-colors ${file ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-border-dark text-gray-500 cursor-not-allowed'}`}
            >
              Upload Audio
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-gray-300">Available Audio Assets</h3>
            {audioList.length === 0 ? (
              <p className="text-gray-500 text-sm">No audio assets uploaded for this tenant yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {audioList.map((a: any) => (
                  <li key={a.id} className="flex justify-between items-center p-3 rounded bg-background-dark border border-border-dark">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{a.type}</span>
                      <span className="text-xs text-gray-400">{a.file_path.split('/').pop()} • {a.language}</span>
                    </div>
                    <audio controls src={`#`} className="h-8 w-48 opacity-70" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
