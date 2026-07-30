import React, { useState } from 'react';
import { UserProfile, PartnerProfile } from '../types';

interface TaskItem {
  id: number;
  nome: string;
  categoria: 'Saúde/Fitness' | 'Casa' | 'Tarefa';
  tipo: 'Normal' | 'Manutenção' | 'Tarefa';
  classe: 'Classe A' | 'Classe B';
  localidade: string;
  recorrencia: string;
  proxExecucao: string;
  status: 'Concluído' | 'Pendente';
  duracaoEst: string;
  quantFeita: number;
  subtarefas: { total: number; concluidas: number; itens: string[] };
  propriedadesGanhas: string;
  inerciaAtual: string;
  notas: string;
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 1,
    nome: 'Treino de Musculação',
    categoria: 'Saúde/Fitness',
    tipo: 'Normal',
    classe: 'Classe A',
    localidade: '🏋️ Academia',
    recorrencia: 'Flexível (A cada 24h)',
    proxExecucao: '12:00 PM',
    status: 'Concluído',
    duracaoEst: '1h 30m',
    quantFeita: 15,
    subtarefas: { total: 3, concluidas: 3, itens: ['Supino', 'Agachamento', 'Biceps'] },
    propriedadesGanhas: '+Força Muscular, +Resistência',
    inerciaAtual: '--',
    notas: 'Foco no Supino'
  },
  {
    id: 2,
    nome: 'Limpar Pia Banheiro',
    categoria: 'Casa',
    tipo: 'Manutenção',
    classe: 'Classe B',
    localidade: '🚽 Banheiro',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: 'Indefinido',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Alimento Armazenado',
    inerciaAtual: '18h Sem Fazer',
    notas: 'Usar desinfetante'
  },
  {
    id: 3,
    nome: 'Limpar Pia Banheiro',
    categoria: 'Casa',
    tipo: 'Normal',
    classe: 'Classe B',
    localidade: '🚽 Banheiro',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: 'Indefinido',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '--',
    notas: 'Foco no Supino'
  },
  {
    id: 4,
    nome: 'Jogar Lixo Banheiro',
    categoria: 'Saúde/Fitness',
    tipo: 'Normal',
    classe: 'Classe A',
    localidade: '🏋️ Academia',
    recorrencia: 'Flexível (A cada 24h)',
    proxExecucao: '12:00 PM',
    status: 'Pendente',
    duracaoEst: '10m',
    quantFeita: 1,
    subtarefas: { total: 3, concluidas: 3, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Força Muscular, +Resistência',
    inerciaAtual: '--',
    notas: '--'
  },
  {
    id: 5,
    nome: 'Jogar Lixo Banheiro',
    categoria: 'Saúde/Fitness',
    tipo: 'Normal',
    classe: 'Classe A',
    localidade: '🏋️ Academia',
    recorrencia: 'Flexível (A cada 24h)',
    proxExecucao: '2:00 PM',
    status: 'Concluído',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Força Muscular, +Resistência',
    inerciaAtual: '--',
    notas: '--'
  },
  {
    id: 6,
    nome: 'Jogar Lixo Banheiro',
    categoria: 'Saúde/Fitness',
    tipo: 'Manutenção',
    classe: 'Classe B',
    localidade: '🏋️ Academia',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: '2:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '--',
    notas: 'Usar desinfetante'
  },
  {
    id: 7,
    nome: 'Limpar Pia Banheiro',
    categoria: 'Casa',
    tipo: 'Manutenção',
    classe: 'Classe B',
    localidade: '🚽 Banheiro',
    recorrencia: 'Flexível (A cada 24h)',
    proxExecucao: '3:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '18h Sem Fazer',
    notas: '--'
  },
  {
    id: 8,
    nome: 'Treino de Musculação',
    categoria: 'Saúde/Fitness',
    tipo: 'Manutenção',
    classe: 'Classe B',
    localidade: '🏋️ Academia',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: 'Indefinido',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '--',
    notas: '--'
  },
  {
    id: 9,
    nome: 'Limpar Pia Banheiro',
    categoria: 'Saúde/Fitness',
    tipo: 'Normal',
    classe: 'Classe A',
    localidade: '🚽 Banheiro',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: '2:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 1, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '18h Sem Fazer',
    notas: '--'
  },
  {
    id: 10,
    nome: 'Jogar Supino',
    categoria: 'Casa',
    tipo: 'Normal',
    classe: 'Classe A',
    localidade: '🏋️ Academia',
    recorrencia: 'Flexível (A cada 24h)',
    proxExecucao: '2:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 1, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '18h Sem Fazer',
    notas: '--'
  },
  {
    id: 11,
    nome: 'Limpar Pia Banheiro',
    categoria: 'Casa',
    tipo: 'Tarefa',
    classe: 'Classe B',
    localidade: '🏋️ Academia',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: '2:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 0,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '--',
    notas: 'Usar desinfetante'
  },
  {
    id: 12,
    nome: 'Limpar Pia Banheiro',
    categoria: 'Casa',
    tipo: 'Manutenção',
    classe: 'Classe B',
    localidade: '🚽 Banheiro',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: '2:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 1, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '18h Sem Fazer',
    notas: '--'
  },
  {
    id: 13,
    nome: 'Jogar Lixo Banheiro',
    categoria: 'Tarefa',
    tipo: 'Tarefa',
    classe: 'Classe B',
    localidade: '🚽 Banheiro',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: '2:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 1, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '--',
    notas: '--'
  },
  {
    id: 14,
    nome: 'Treino de Musculação',
    categoria: 'Saúde/Fitness',
    tipo: 'Normal',
    classe: 'Classe A',
    localidade: '🏋️ Academia',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: '2:00 PM',
    status: 'Concluído',
    duracaoEst: '10m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 1, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Armazenado',
    inerciaAtual: '18h Sem Fazer',
    notas: 'Usar desinfetante'
  },
  {
    id: 15,
    nome: 'Treino de Feita',
    categoria: 'Saúde/Fitness',
    tipo: 'Normal',
    classe: 'Classe A',
    localidade: '🏋️ Academia',
    recorrencia: 'Flexível (A cada 24h)',
    proxExecucao: '2:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 0,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '--',
    notas: '--'
  },
  {
    id: 16,
    nome: 'Jogar Supino',
    categoria: 'Casa',
    tipo: 'Manutenção',
    classe: 'Classe B',
    localidade: '🏋️ Academia',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: '2:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '--',
    notas: 'Usar desinfetante'
  },
  {
    id: 18,
    nome: 'Limpar Pia Banheiro',
    categoria: 'Casa',
    tipo: 'Manutenção',
    classe: 'Classe B',
    localidade: '🚽 Banheiro',
    recorrencia: 'Exata (Qui, 10:00)',
    proxExecucao: '2:00 PM',
    status: 'Pendente',
    duracaoEst: '15m',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '--',
    notas: '--'
  }
];

interface TasksTabProps {
  user?: any;
  profile?: PartnerProfile;
  isDark?: boolean;
}

export const TasksTab: React.FC<TasksTabProps> = ({ isDark = false }) => {
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [topTab, setTopTab] = useState<'HOJE' | 'LOCALIDADES' | 'ESTATÍSTICAS'>('ESTATÍSTICAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const toggleTaskStatus = (id: number) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, status: t.status === 'Concluído' ? 'Pendente' : 'Concluído' } : t))
    );
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.localidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.notas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoria.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'TODAS' || t.categoria === filterCategory;

    if (topTab === 'HOJE') {
      return matchesSearch && matchesCategory && (t.status === 'Pendente' || t.proxExecucao.includes('12:00') || t.proxExecucao.includes('2:00'));
    }
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Saúde/Fitness':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
      case 'Casa':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300';
      case 'Tarefa':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    return status === 'Concluído'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
  };

  return (
    <div className={`w-full max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-2xl border transition-all ${isDark ? 'bg-[#0f172a] text-slate-100 border-slate-800' : 'bg-slate-900 text-white border-slate-200'}`}>
      {/* Top Header Bar */}
      <div className="bg-[#1e293b] px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-700/60 gap-4">
        <h1 className="text-lg md:text-xl font-black tracking-wider uppercase italic text-white flex items-center gap-2">
          <span>📋</span> PLANILHA GERAL DE TAREFAS
        </h1>

        <div className="flex items-center gap-2 md:gap-3 bg-[#0f172a]/60 p-1.5 rounded-2xl border border-slate-700/50">
          <button
            onClick={() => setTopTab('HOJE')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              topTab === 'HOJE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📅</span> HOJE
          </button>
          <button
            onClick={() => setTopTab('LOCALIDADES')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              topTab === 'LOCALIDADES' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📍</span> LOCALIDADES
          </button>
          <button
            onClick={() => setTopTab('ESTATÍSTICAS')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              topTab === 'ESTATÍSTICAS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📊</span> ESTATÍSTICAS
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
            <span>⋮</span>
          </button>
        </div>
      </div>

      {/* Sub Bar: Search & Filter */}
      <div className="bg-[#0f172a] px-6 py-3 flex flex-wrap items-center justify-between border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all"
          >
            <span>⚡ Filtra</span>
            <span className="text-[10px]">▼</span>
          </button>

          {showFilterDropdown && (
            <div className="absolute top-12 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 min-w-[160px] space-y-1 animate-in fade-in duration-200">
              {['TODAS', 'Saúde/Fitness', 'Casa', 'Tarefa'].map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setFilterCategory(cat);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    filterCategory === cat ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 text-white placeholder-slate-400 text-xs font-medium pl-9 pr-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 transition-all"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto bg-slate-900 text-slate-200 no-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800/90 text-slate-300 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-700/80">
              <th className="py-3 px-3 border-r border-slate-700/60 text-center w-12">ID</th>
              <th className="py-3 px-4 border-r border-slate-700/60 min-w-[180px]">NOME DA TAREFA</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[130px]">CATEGORIA</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[100px]">TIPO</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[90px]">CLASSE</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[130px]">LOCALIDADE</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[160px]">RECORRÊNCIA</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[120px]">PRÓX. EXECUÇÃO</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[110px]">STATUS</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[100px]">DURAÇÃO EST.</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[90px] text-center">QUANT. FEITA</th>
              <th className="py-3 px-4 border-r border-slate-700/60 min-w-[200px]">SUBTAREFAS (Progresso)</th>
              <th className="py-3 px-4 border-r border-slate-700/60 min-w-[220px]">PROPRIEDADES GANHAS</th>
              <th className="py-3 px-3 border-r border-slate-700/60 min-w-[130px]">INÉRCIA ATUAL</th>
              <th className="py-3 px-4 min-w-[150px]">NOTAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-[12px] font-medium">
            {filteredTasks.map((t, idx) => (
              <tr
                key={t.id}
                className={`hover:bg-slate-800/40 transition-colors ${
                  idx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-900/90'
                }`}
              >
                <td className="py-2.5 px-3 border-r border-slate-800 text-center font-bold text-slate-400">{t.id}</td>
                <td className="py-2.5 px-4 border-r border-slate-800 font-bold text-white">{t.nome}</td>
                <td className="py-2.5 px-3 border-r border-slate-800">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight inline-block ${getCategoryBadgeClass(t.categoria)}`}>
                    {t.categoria}
                  </span>
                </td>
                <td className="py-2.5 px-3 border-r border-slate-800 text-slate-300">{t.tipo}</td>
                <td className="py-2.5 px-3 border-r border-slate-800">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {t.classe}
                  </span>
                </td>
                <td className="py-2.5 px-3 border-r border-slate-800 text-slate-200">{t.localidade}</td>
                <td className="py-2.5 px-3 border-r border-slate-800 text-slate-300 text-[11px]">{t.recorrencia}</td>
                <td className="py-2.5 px-3 border-r border-slate-800 text-slate-300">{t.proxExecucao}</td>
                <td className="py-2.5 px-3 border-r border-slate-800">
                  <button
                    onClick={() => toggleTaskStatus(t.id)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${getStatusBadgeClass(t.status)}`}
                  >
                    {t.status}
                  </button>
                </td>
                <td className="py-2.5 px-3 border-r border-slate-800 text-slate-300">{t.duracaoEst}</td>
                <td className="py-2.5 px-3 border-r border-slate-800 text-center font-bold text-slate-200">{t.quantFeita}</td>
                <td className="py-2.5 px-4 border-r border-slate-800">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-bold text-slate-300">
                      {t.subtarefas.concluidas}/{t.subtarefas.total}
                    </span>
                    <span className={t.subtarefas.concluidas === t.subtarefas.total ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {t.subtarefas.concluidas === t.subtarefas.total ? '[✓]' : '[ ]'}
                    </span>
                    <span className="text-slate-400 truncate">({t.subtarefas.itens.join(', ')})</span>
                  </div>
                </td>
                <td className="py-2.5 px-4 border-r border-slate-800 text-emerald-400 font-medium text-[11px]">{t.propriedadesGanhas}</td>
                <td className="py-2.5 px-3 border-r border-slate-800 text-slate-400 text-[11px]">{t.inerciaAtual}</td>
                <td className="py-2.5 px-4 text-slate-300 text-[11px] italic">{t.notas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
