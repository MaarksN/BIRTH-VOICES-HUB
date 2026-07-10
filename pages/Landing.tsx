import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, CheckCircle, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl text-slate-900">Birth Voices Hub</span>
          </div>
          <nav className="hidden md:flex gap-8">
            <a href="#" className="text-slate-600 hover:text-slate-900 font-medium">Casos de Uso</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 font-medium">Recursos</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 font-medium">Preços</a>
          </nav>
          <div>
            <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Acessar Plataforma
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-white py-20 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Conheça a Catarina, nossa agente padrão
            </div>
            <h1 className="text-5xl font-bold text-slate-900 tracking-tight mb-6">
              Voice Agents Inteligentes para<br/>Conversas Estruturadas
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10">
              A Catarina não apenas conversa. Ela conduz, entende, registra e entrega.
              Automatize triagens, pesquisas e vendas com humanidade e escala.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors flex items-center gap-2">
                Criar meu Agente
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/login" className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3 rounded-lg font-bold text-lg transition-colors">
                Ver Demo
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <Feature
                title="Conversa Natural"
                description="Português brasileiro nativo, com variação de entonação, ritmo e pausas humanas."
              />
              <Feature
                title="Lógica Estruturada"
                description="Conduz chamadas de 5 a 40 minutos com lógica condicional e objetivos claros."
              />
              <Feature
                title="Integração Total"
                description="Preenche seu CRM, ATS ou banco de dados automaticamente ao final da chamada."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500">
          <p>© 2024 Birth Voices Hub. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, description }: { title: string, description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}