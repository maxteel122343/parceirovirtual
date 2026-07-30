import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, PartnerProfile } from '../types';

export interface TaskItem {
  id: number;
  nome: string;
  categoria: 'Saúde/Fitness' | 'Casa' | 'Estudos' | 'Trabalho' | 'Tarefa';
  tipo: 'Normal' | 'Manutenção' | 'Organização' | 'Infra' | 'Intervalo' | 'Tarefa';
  classe: 'Classe A' | 'Classe B' | 'Classe C';
  localidade: string;
  recorrenciaTipo: 'Exata' | 'Flexível';
  recorrencia: string;
  proxExecucao: string;
  status: 'Concluído' | 'Pendente';
  duracaoEst: string;
  quantFeita: number;
  subtarefas: { total: number; concluidas: number; itens: string[] };
  propriedadesGanhas: string;
  inerciaAtual: string;
  notas: string;
  concluidaForaHorario?: boolean;
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 1,
    nome: 'Treino de Musculação',
    categoria: 'Saúde/Fitness',
    tipo: 'Normal',
    classe: 'Classe A',
    localidade: '🏋️ Academia',
    recorrenciaTipo: 'Flexível',
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
    recorrenciaTipo: 'Exata',
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
    recorrenciaTipo: 'Exata',
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
    recorrenciaTipo: 'Flexível',
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
    nome: 'Estudo de Algoritmos Avançados',
    categoria: 'Estudos',
    tipo: 'Normal',
    classe: 'Classe A',
    localidade: '💻 Escritório',
    recorrenciaTipo: 'Flexível',
    recorrencia: 'Flexível (A cada 12h)',
    proxExecucao: '2:00 PM',
    status: 'Concluído',
    duracaoEst: '1h 00m',
    quantFeita: 8,
    subtarefas: { total: 2, concluidas: 2, itens: ['Revisar Árvores', 'Fazer Leetcode'] },
    propriedadesGanhas: '+Conhecimento Técnico, +Foco',
    inerciaAtual: '--',
    notas: 'Anotar complexidade'
  },
  {
    id: 6,
    nome: 'Organização Financeira Mensal',
    categoria: 'Trabalho',
    tipo: 'Organização',
    classe: 'Classe A',
    localidade: '💼 Home Office',
    recorrenciaTipo: 'Exata',
    recorrencia: 'Exata (Dia 1, 09:00)',
    proxExecucao: '9:00 AM',
    status: 'Pendente',
    duracaoEst: '45m',
    quantFeita: 3,
    subtarefas: { total: 2, concluidas: 0, itens: ['Planilha de Gastos', 'Conferir Extrato'] },
    propriedadesGanhas: '+Organização Financeira, +Disciplina',
    inerciaAtual: '24h Sem Fazer',
    notas: 'Exportar relatórios'
  }
];

interface TasksTabProps {
  user?: any;
  profile?: PartnerProfile;
  isDark?: boolean;
}

export const TasksTab: React.FC<TasksTabProps> = ({ isDark = false }) => {
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [topTab, setTopTab] = useState<'HOJE' | 'LOCALIDADES' | 'ESTATÍSTICAS'>('HOJE');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // -------------------------------------------------------------
  // TELA 3: MODO "SESSÃO ABERTA" (Modo Combo de Categoria) State
  // -------------------------------------------------------------
  const [isComboActive, setIsComboActive] = useState(false);
  const [comboCategory, setComboCategory] = useState<'Saúde/Fitness' | 'Casa' | 'Estudos' | 'Trabalho' | 'Tarefa'>('Estudos');
  const [comboSeconds, setComboSeconds] = useState(0);
  const [comboCompletedCount, setComboCompletedCount] = useState(0);
  const [comboEarnedProperties, setComboEarnedProperties] = useState<string[]>([]);
  const comboTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isComboActive) {
      comboTimerRef.current = setInterval(() => {
        setComboSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    }
    return () => {
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    };
  }, [isComboActive]);

  const startComboSession = (cat: 'Saúde/Fitness' | 'Casa' | 'Estudos' | 'Trabalho' | 'Tarefa') => {
    setComboCategory(cat);
    setComboSeconds(0);
    setComboCompletedCount(0);
    setComboEarnedProperties([]);
    setIsComboActive(true);
  };

  const endComboSession = () => {
    setIsComboActive(false);
  };

  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // TELA 4: PERFIL DE PROPRIEDADES E ESTATÍSTICAS
  // -------------------------------------------------------------
  const calculateProperties = () => {
    const propMap: Record<string, number> = {
      'Força Muscular': 45,
      'Resistência': 38,
      'Conhecimento Técnico': 60,
      'Organização Financeira': 30,
      'Item Limpeza': 25,
      'Alimento Armazenado': 15,
      'Foco': 50,
      'Disciplina': 40
    };

    tasks.filter(t => t.status === 'Concluído').forEach(t => {
      const props = t.propriedadesGanhas.split(',').map(p => p.trim().replace('+', ''));
      props.forEach(p => {
        if (p) propMap[p] = (propMap[p] || 0) + 10;
      });
    });

    comboEarnedProperties.forEach(p => {
      if (p) propMap[p] = (propMap[p] || 0) + 15;
    });

    return propMap;
  };

  const propertiesData = calculateProperties();
  const totalCompleted = tasks.filter(t => t.status === 'Concluído').length + comboCompletedCount;
  const offScheduleCompleted = tasks.filter(t => t.concluidaForaHorario).length + 2;

  // -------------------------------------------------------------
  // FLUXO DE CRIAÇÃO DE NOVA TAREFA (Modal "+ Nova Tarefa")
  // -------------------------------------------------------------
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    nome: '',
    categoria: 'Saúde/Fitness' as 'Saúde/Fitness' | 'Casa' | 'Estudos' | 'Trabalho' | 'Tarefa',
    tipo: 'Normal' as 'Normal' | 'Manutenção' | 'Organização' | 'Infra' | 'Intervalo' | 'Tarefa',
    classe: 'Classe A' as 'Classe A' | 'Classe B' | 'Classe C',
    localidade: '🏋️ Academia',
    recorrenciaTipo: 'Flexível' as 'Exata' | 'Flexível',
    recorrenciaDetalhe: 'A cada 24h',
    proxExecucao: '12:00 PM',
    duracaoEst: '30m',
    subtasksInput: ['', '', '', '', ''],
    propriedadesGanhas: '+Força Muscular, +Resistência',
    notas: ''
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.nome.trim()) return;

    const validSubtasks = newTaskForm.subtasksInput.filter(s => s.trim() !== '');
    const newTask: TaskItem = {
      id: Date.now(),
      nome: newTaskForm.nome,
      categoria: newTaskForm.categoria,
      tipo: newTaskForm.tipo,
      classe: newTaskForm.classe,
      localidade: newTaskForm.localidade,
      recorrenciaTipo: newTaskForm.recorrenciaTipo,
      recorrencia: `${newTaskForm.recorrenciaTipo} (${newTaskForm.recorrenciaDetalhe})`,
      proxExecucao: newTaskForm.proxExecucao || 'Indefinido',
      status: 'Pendente',
      duracaoEst: newTaskForm.duracaoEst || '15m',
      quantFeita: 0,
      subtarefas: {
        total: validSubtasks.length || 1,
        concluidas: 0,
        itens: validSubtasks.length ? validSubtasks : ['Executar Tarefa']
      },
      propriedadesGanhas: newTaskForm.propriedadesGanhas || '+Foco',
      inerciaAtual: '--',
      notas: newTaskForm.notas || '--'
    };

    setTasks(prev => [newTask, ...prev]);
    setShowCreateModal(false);
    setNewTaskForm({
      nome: '',
      categoria: 'Saúde/Fitness',
      tipo: 'Normal',
      classe: 'Classe A',
      localidade: '🏋️ Academia',
      recorrenciaTipo: 'Flexível',
      recorrenciaDetalhe: 'A cada 24h',
      proxExecucao: '12:00 PM',
      duracaoEst: '30m',
      subtasksInput: ['', '', '', '', ''],
      propriedadesGanhas: '+Força Muscular, +Resistência',
      notas: ''
    });
  };

  const toggleTaskStatus = (id: number) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextStatus = t.status === 'Concluído' ? 'Pendente' : 'Concluído';
          const nextQuant = nextStatus === 'Concluído' ? t.quantFeita + 1 : Math.max(0, t.quantFeita - 1);
          if (isComboActive && nextStatus === 'Concluído') {
            setComboCompletedCount(c => c + 1);
            const gained = t.propriedadesGanhas.split(',').map(p => p.trim().replace('+', ''));
            setComboEarnedProperties(ep => [...ep, ...gained]);
          }
          return { ...t, status: nextStatus, quantFeita: nextQuant };
        }
        return t;
      })
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
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300/30';
      case 'Casa':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-300/30';
      case 'Estudos':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300/30';
      case 'Trabalho':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/30';
      case 'Tarefa':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300/30';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    return status === 'Concluído'
      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30';
  };

  return (
    <div className={`w-full max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-2xl border transition-all ${isDark ? 'bg-[#0f172a] text-slate-100 border-slate-800' : 'bg-slate-900 text-white border-slate-200'}`}>
      
      {/* BANNER DO MODO COMBO DE CATEGORIA (TELA 3) */}
      {isComboActive && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 px-6 py-4 border-b border-indigo-500/40 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-lg animate-pulse">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-blue-500/30 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                  Modo Combo Ativo
                </span>
                <span className="text-xs font-bold text-slate-300">Categoria: <strong className="text-white uppercase">{comboCategory}</strong></span>
              </div>
              <h2 className="text-2xl font-black tracking-tight font-mono text-emerald-400 mt-1">
                {formatTimer(comboSeconds)} <span className="text-xs font-normal text-slate-300">tempo contínuo de foco</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-xs font-bold bg-black/30 px-4 py-2 rounded-2xl border border-white/10">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Concluídas no Combo</span>
                <span className="text-lg font-black text-emerald-400">+{comboCompletedCount}</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Atributos Ganhos</span>
                <span className="text-xs text-indigo-300 font-mono">
                  {comboEarnedProperties.length > 0 ? comboEarnedProperties.slice(-2).join(', ') : 'Nenhum ainda'}
                </span>
              </div>
            </div>

            <button
              onClick={endComboSession}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all"
            >
              Encerrar Sessão
            </button>
          </div>
        </div>
      )}

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

        <div className="flex items-center gap-3">
          {/* Botão Modo Combo */}
          {!isComboActive && (
            <button
              onClick={() => startComboSession('Estudos')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>⚡</span> Modo Combo
            </button>
          )}

          {/* Botão Criar Nova Tarefa (+) */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>+</span> Nova Tarefa
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
            <span>⚡ Filtra ({filterCategory})</span>
            <span className="text-[10px]">▼</span>
          </button>

          {showFilterDropdown && (
            <div className="absolute top-12 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 min-w-[170px] space-y-1 animate-in fade-in duration-200">
              {['TODAS', 'Saúde/Fitness', 'Casa', 'Estudos', 'Trabalho', 'Tarefa'].map(cat => (
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
            placeholder="Buscar por nome, local ou nota..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 text-white placeholder-slate-400 text-xs font-medium pl-9 pr-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 transition-all"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
        </div>
      </div>

      {/* RENDERIZADOR DAS GUIA / TABS */}
      {topTab === 'ESTATÍSTICAS' ? (
        /* TELA 4: PERFIL DE PROPRIEDADES E ESTATÍSTICAS */
        <div className="p-6 md:p-8 space-y-8 bg-[#0b1120]">
          {/* Header Dashboard */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic text-white flex items-center gap-3">
                📊 Perfil de Atributos & Estatísticas Gerais
              </h2>
              <p className="text-xs text-slate-400 mt-1">Impacto acumulado das suas rotinas e histórico de execução</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700">
              <span className="text-xs font-bold text-slate-400">Status Geral:</span>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                Alta Produtividade 🔥
              </span>
            </div>
          </div>

          {/* Grid de Atributos Acumulados */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
              <span>🛡️</span> PAINEL DE ATRIBUTOS GANHOS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(propertiesData).map(([propName, score]) => (
                <div key={propName} className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/80 hover:border-blue-500/40 transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-200">{propName}</span>
                    <span className="text-xs font-black text-blue-400 font-mono">Nível {Math.floor(score / 20) + 1}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mb-2 border border-slate-700/40">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (score % 100))}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{score} Pontos Acumulados</span>
                </div>
              ))}
            </div>
          </div>

          {/* Métricas Gerais */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
              <span>📈</span> MÉTRICAS DE EXECUÇÃO
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Concluído</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-400">{totalCompleted}</span>
                  <span className="text-xs font-bold text-slate-400">tarefas finalizadas</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fora do Horário</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-amber-400">{offScheduleCompleted}</span>
                  <span className="text-xs font-bold text-slate-400">conclusões flexíveis</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Inércia Média das Rotinas</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-indigo-400">12.4h</span>
                  <span className="text-xs font-bold text-slate-400">tempo médio de espera</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TABELA DA PLANILHA DE TAREFAS */
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
      )}

      {/* MODAL DE CRIAÇÃO DE NOVA TAREFA (3. FLUXO DE CRIAÇÃO) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 text-slate-100 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                <span>✨</span> Criar Nova Tarefa
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-6">
              {/* BLOCO 1: Informações Básicas */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">1. Informações Básicas</h3>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Nome da Tarefa</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Treino de Pernas, Estudo de React"
                    value={newTaskForm.nome}
                    onChange={e => setNewTaskForm({ ...newTaskForm, nome: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Categoria</label>
                    <select
                      value={newTaskForm.categoria}
                      onChange={e => setNewTaskForm({ ...newTaskForm, categoria: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Saúde/Fitness">Saúde/Fitness</option>
                      <option value="Casa">Casa</option>
                      <option value="Estudos">Estudos</option>
                      <option value="Trabalho">Trabalho</option>
                      <option value="Tarefa">Tarefa</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Prioridade / Classe</label>
                    <select
                      value={newTaskForm.classe}
                      onChange={e => setNewTaskForm({ ...newTaskForm, classe: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Classe A">Classe A</option>
                      <option value="Classe B">Classe B</option>
                      <option value="Classe C">Classe C</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Tipo</label>
                    <select
                      value={newTaskForm.tipo}
                      onChange={e => setNewTaskForm({ ...newTaskForm, tipo: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Organização">Organização</option>
                      <option value="Infra">Infra</option>
                      <option value="Intervalo">Intervalo</option>
                      <option value="Tarefa">Tarefa</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOCO 2: Tempo e Regra */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">2. Tempo e Regra</h3>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTaskForm({ ...newTaskForm, recorrenciaTipo: 'Flexível' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                      newTaskForm.recorrenciaTipo === 'Flexível'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Flexível (Intervalo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTaskForm({ ...newTaskForm, recorrenciaTipo: 'Exata' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                      newTaskForm.recorrenciaTipo === 'Exata'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Recorrência Exata (Data/Hora)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Recorrência</label>
                    <input
                      type="text"
                      placeholder="ex: A cada 24h ou Qui, 10:00"
                      value={newTaskForm.recorrenciaDetalhe}
                      onChange={e => setNewTaskForm({ ...newTaskForm, recorrenciaDetalhe: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Próxima Execução</label>
                    <input
                      type="text"
                      placeholder="ex: 12:00 PM"
                      value={newTaskForm.proxExecucao}
                      onChange={e => setNewTaskForm({ ...newTaskForm, proxExecucao: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Duração Est.</label>
                    <input
                      type="text"
                      placeholder="ex: 30m ou 1h 30m"
                      value={newTaskForm.duracaoEst}
                      onChange={e => setNewTaskForm({ ...newTaskForm, duracaoEst: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 3: Contexto (Localidade e Subtasks) */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">3. Contexto</h3>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Localidade</label>
                  <input
                    type="text"
                    placeholder="ex: 🏋️ Academia, 🚽 Banheiro, 💻 Escritório"
                    value={newTaskForm.localidade}
                    onChange={e => setNewTaskForm({ ...newTaskForm, localidade: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Subtarefas (até 5)</label>
                  <div className="space-y-2">
                    {newTaskForm.subtasksInput.map((sub, idx) => (
                      <input
                        key={idx}
                        type="text"
                        placeholder={`Subtarefa ${idx + 1}`}
                        value={sub}
                        onChange={e => {
                          const updated = [...newTaskForm.subtasksInput];
                          updated[idx] = e.target.value;
                          setNewTaskForm({ ...newTaskForm, subtasksInput: updated });
                        }}
                        className="w-full bg-slate-900 border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* BLOCO 4: Resultados e Notas */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">4. Resultados e Notas</h3>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Propriedades Ganhas</label>
                  <input
                    type="text"
                    placeholder="ex: +Força Muscular, +Resistência"
                    value={newTaskForm.propriedadesGanhas}
                    onChange={e => setNewTaskForm({ ...newTaskForm, propriedadesGanhas: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Observações / Notas</label>
                  <textarea
                    placeholder="Notas adicionais sobre como executar a tarefa..."
                    value={newTaskForm.notas}
                    onChange={e => setNewTaskForm({ ...newTaskForm, notas: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all"
                >
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
