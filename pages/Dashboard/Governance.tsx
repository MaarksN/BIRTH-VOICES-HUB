import React from 'react';
import { Card, Button, Badge } from '../../components/design-system';
import { Shield, Users, Lock, Key, CheckCircle } from 'lucide-react';

export default function GovernancePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Governança & RBAC</h1>
          <p className="text-sm text-slate-500">Controle de acessos, permissões granulares e auditoria corporativa.</p>
        </div>
        <Button variant="primary">
          <Users className="h-4 w-4 mr-2" /> Convidar Membro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'Administrator', desc: 'Acesso irrestrito a todos os projetos e faturamento.', count: 2 },
          { title: 'AI Developer', desc: 'Pode editar prompts, modelos e publicar agentes.', count: 5 },
          { title: 'Operator', desc: 'Acesso restrito a relatórios e monitoramento.', count: 12 }
        ].map((role, i) => (
          <Card key={i} className="p-5 border-t-4 border-t-brand">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand" /> {role.title}
            </h3>
            <p className="text-xs text-slate-500 mt-2 mb-4 h-8">{role.desc}</p>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{role.count} membros ativos</span>
              <Button variant="outline" size="sm">Gerenciar</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-400" /> Auditoria e Políticas de Segurança
        </h3>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Autenticação SSO (SAML 2.0)</p>
              <p className="text-slate-500 text-xs mt-0.5">Obrigar login via provedor de identidade corporativo (Okta, Entra ID).</p>
            </div>
            <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Ativado</Badge>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Data Residency (HIPAA)</p>
              <p className="text-slate-500 text-xs mt-0.5">Armazenar dados, gravações e logs exclusivamente na região selecionada.</p>
            </div>
            <div className="text-xs font-mono bg-white dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">sa-east-1 (SP)</div>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Mascaramento de PII/PHI</p>
              <p className="text-slate-500 text-xs mt-0.5">Ocultar automaticamente dados de saúde e financeiros nos logs do sistema.</p>
            </div>
            <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Ativado</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
