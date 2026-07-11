import React from 'react';
import { Card, Button, Badge } from '../../components/design-system';
import { BookMarked, UploadCloud, Search, RefreshCw, FileText, Database } from 'lucide-react';

export default function KnowledgeManager() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Knowledge Base (RAG)</h1>
          <p className="text-sm text-slate-500">Centralize documentos e manuais corporativos para seus agentes consultarem.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary">
            <UploadCloud className="h-4 w-4 mr-2" /> Upload de Documentos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Protocolos de Triagem', docs: 45, status: 'synced', size: '12MB', updated: '2h atrás' },
          { title: 'Manuais de Faturamento', docs: 12, status: 'syncing', size: '4MB', updated: 'Agora' },
          { title: 'FAQ Clínico', docs: 120, status: 'synced', size: '2MB', updated: '1d atrás' }
        ].map((kb, i) => (
          <Card key={i} className="p-5 flex flex-col hover:border-brand transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-brand/10 text-brand rounded-lg group-hover:scale-105 transition-transform">
                <Database className="h-5 w-5" />
              </div>
              {kb.status === 'synced' ? (
                <Badge variant="success">Sincronizado</Badge>
              ) : (
                <Badge variant="warning" className="animate-pulse">Sincronizando</Badge>
              )}
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">{kb.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{kb.docs} documentos • {kb.size}</p>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Atualizado: {kb.updated}</span>
              <button className="hover:text-brand transition-colors"><RefreshCw className="h-3.5 w-3.5" /></button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
