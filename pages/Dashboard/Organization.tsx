import React, { useState, useEffect, useRef } from 'react';
import { Save, UserPlus, Upload, Shield, Video, Loader2 } from 'lucide-react';
import { auth } from '../../lib/auth';
import { useSessionStore } from '../../store/useSessionStore';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState('branding');
  const brandColor = useSessionStore((state) => state.brandColor);
  const setBrandColor = useSessionStore((state) => state.setBrandColor);
  const [branding, setBranding] = useState({ color: brandColor, name: '' });
  
  // Video Generation States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoPrompt, setVideoPrompt] = useState('Um agente amigável sorrindo em um escritório moderno, com iluminação suave.');
  const [selectedImage, setSelectedImage] = useState<{base64: string, type: string, previewUrl: string} | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoOperation, setVideoOperation] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
      // Load org data and set current branding color from global store
      setBranding({
          name: auth.getUser()?.company || 'My Company',
          color: brandColor
      });
  }, [brandColor]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (videoOperation && !videoUrl && !videoError) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName: videoOperation })
          });
          const data = await res.json();
          if (data.error) {
            setVideoError(data.error.message || 'Erro na geração');
            setVideoOperation(null);
          } else if (data.done) {
            setVideoUrl(`/api/video-download?operationName=${encodeURIComponent(videoOperation)}`);
            setIsGeneratingVideo(false);
            setVideoOperation(null);
          }
        } catch (e: unknown) {
          console.error(e);
        }
      }, 5000); // poll every 5s
    }
    return () => clearInterval(interval);
  }, [videoOperation, videoUrl, videoError]);

  const handleSave = () => {
    setBrandColor(branding.color);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      // result is "data:image/png;base64,..."
      const base64 = result.split(',')[1];
      setSelectedImage({
        base64,
        type: file.type,
        previewUrl: result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async () => {
    if (!selectedImage) return;
    setIsGeneratingVideo(true);
    setVideoError(null);
    setVideoUrl(null);
    
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: videoPrompt,
          imageBytes: selectedImage.base64,
          mimeType: selectedImage.type
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na chamada de API');
      
      setVideoOperation(data.operationName);
    } catch (err: unknown) {
      setVideoError(err instanceof Error ? err.message : String(err));
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="space-y-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 font-sans">Configurações da Organização</h1>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button onClick={() => setActiveTab('branding')} className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'branding' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Marca & White-label</button>
                <button onClick={() => setActiveTab('video')} className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'video' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Vídeo de Boas Vindas</button>
                <button onClick={() => setActiveTab('team')} className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'team' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Equipe & Permissões</button>
                <button onClick={() => setActiveTab('audit')} className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'audit' ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>Audit Log</button>
            </div>

            <div className="p-6">
                {activeTab === 'branding' && (
                    <div className="max-w-xl space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Organização</label>
                            <input type="text" value={branding.name} onChange={e => setBranding({...branding, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Cor da Marca</label>
                            <div className="flex gap-4 items-center">
                                <input type="color" value={branding.color} onChange={e => setBranding({...branding, color: e.target.value})} className="h-10 w-20 p-1 rounded border border-slate-300 cursor-pointer" />
                                <span className="font-mono text-slate-500 text-sm bg-slate-100 px-2 py-1 rounded">{branding.color}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Escolha uma cor principal da marca. Isso atualizará o tema da plataforma em tempo real.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Clique para fazer upload (PNG, SVG)</p>
                            </div>
                        </div>
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:opacity-90 font-medium transition-opacity">
                            <Save className="h-4 w-4" /> Salvar Alterações
                        </button>
                    </div>
                )}

                {activeTab === 'video' && (
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg mb-2">Vídeo Avatar da Marca</h3>
                                <p className="text-sm text-slate-600 mb-6">Gere um vídeo de boas vindas para ser exibido no chat web usando o modelo Veo. Envie uma foto base e descreva a ação.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">1. Upload de Imagem Base</label>
                                <input 
                                    type="file" 
                                    accept="image/png, image/jpeg" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                />
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    {selectedImage ? (
                                        <div className="relative">
                                            <img src={selectedImage.previewUrl} alt="Preview" className="max-h-48 mx-auto rounded" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                                <span className="text-white text-sm font-bold">Trocar Imagem</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                            <p className="text-sm text-slate-500">Clique para fazer upload (PNG, JPG)</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">2. Prompt do Vídeo</label>
                                <textarea 
                                    value={videoPrompt}
                                    onChange={e => setVideoPrompt(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand outline-none resize-none h-24"
                                />
                            </div>

                            {videoError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                                    {videoError}
                                </div>
                            )}

                            <button 
                                onClick={handleGenerateVideo}
                                disabled={isGeneratingVideo || !selectedImage || !videoPrompt.trim()}
                                className="flex items-center justify-center gap-2 px-4 py-2 w-full bg-brand text-white rounded-lg hover:opacity-90 font-medium transition-opacity disabled:opacity-50"
                            >
                                {isGeneratingVideo ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Gerando Vídeo (pode demorar alguns minutos)...</>
                                ) : (
                                    <><Video className="h-4 w-4" /> Gerar Avatar</>
                                )}
                            </button>
                        </div>

                        <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-200 pt-8 md:pt-0 md:pl-8 flex flex-col">
                            <label className="block text-sm font-medium text-slate-700 mb-4">Resultado</label>
                            
                            {videoUrl ? (
                                <div className="space-y-4">
                                    <video src={videoUrl} controls className="w-full rounded-lg border border-slate-200" autoPlay loop />
                                    <a 
                                        href={videoUrl}
                                        download="avatar.mp4"
                                        className="w-full block text-center py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        Baixar MP4
                                    </a>
                                </div>
                            ) : (
                                <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 text-slate-400">
                                    {isGeneratingVideo ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-brand" />
                                            <span className="text-sm">Processando com Veo...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <Video className="h-8 w-8 opacity-20" />
                                            <span className="text-sm">Nenhum vídeo gerado</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">Membros do Time</h3>
                            <button className="flex items-center gap-2 px-4 py-2 border border-brand text-brand rounded-lg hover:bg-brand-50 font-medium transition-colors">
                                <UserPlus className="h-4 w-4" /> Convidar Membro
                            </button>
                        </div>
                        <div className="space-y-4">
                             <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-brand-50 text-brand rounded-full flex items-center justify-center font-bold">JD</div>
                                     <div>
                                         <div className="font-bold text-slate-900">John Doe</div>
                                         <div className="text-xs text-slate-500">john@company.com</div>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                     <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">OWNER</span>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div>
                         <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm">
                             <Shield className="h-4 w-4" />
                             Mostrando últimos 30 dias
                         </div>
                         <table className="w-full text-sm text-left">
                             <thead className="bg-slate-50 text-slate-500 font-medium">
                                 <tr>
                                     <th className="p-3">Data</th>
                                     <th className="p-3">Usuário</th>
                                     <th className="p-3">Ação</th>
                                     <th className="p-3">Recurso</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                 <tr>
                                     <td className="p-3 text-slate-500">Hoje, 14:30</td>
                                     <td className="p-3 font-medium">John Doe</td>
                                     <td className="p-3">Alterou Prompt</td>
                                     <td className="p-3 text-mono text-slate-500">agent_sales_v2</td>
                                 </tr>
                             </tbody>
                         </table>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}