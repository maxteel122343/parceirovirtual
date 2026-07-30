import React, { useState, useEffect } from 'react';
import { 
  AppTask, 
  TaskStatus, 
  TaskPriorityClass, 
  TaskType, 
  RecurrenceMode, 
  TaskSubtask, 
  CategorySession 
} from '../types';

const INITIAL_TASKS: AppTask[] = [
  {
    id: '1',
    name: 'Treino de Musculação',
    category: 'Saúde/Fitness',
    status: TaskStatus.COMPLETED,
    priority: TaskPriorityClass.CLASS_A,
    type: TaskType.NORMAL,
    recurrenceMode: RecurrenceMode.FLEXIBLE,
    flexibleIntervalHours: 24,
    recurrenceRule: 'Flexível (A cada 24h)',
    nextExecutionAt: '12:00 PM',
    realizedCount: 15,
    estimatedDurationMinutes: 90,
    lastCompletedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    location: 'Academia',
    subtasks: [
      { id: 's1', title: 'Supino', completed: true },
      { id: 's2', title: 'Agachamento', completed: true },
      { id: 's3', title: 'Bíceps', completed: true },
    ],
    earnedProperties: ['+Força Muscular', '+Resistência'],
    notes: 'Foco no Supino',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Limpar Pia Banheiro',
    category: 'Casa',
    status: TaskStatus.PENDING,
    priority: TaskPriorityClass.CLASS_B,
    type: TaskType.MAINTENANCE,
    recurrenceMode: RecurrenceMode.EXACT,
    recurrenceRule: 'Exata (Qui, 10:00)',
    nextExecutionAt: 'Indefinido',
    realizedCount: 1,
    estimatedDurationMinutes: 15,
    lastCompletedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    location: 'Banheiro',
    subtasks: [
      { id: 's4', title: 'Jogar Lixo', completed: false }
    ],
    earnedProperties: ['+Item Limpeza', '+Alimento Armazenado'],
    notes: 'Usar desinfetante',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Jogar Lixo Banheiro',
    category: 'Casa',
    status: TaskStatus.PENDING,
    priority: TaskPriorityClass.CLASS_B,
    type: TaskType.NORMAL,
    recurrenceMode: RecurrenceMode.EXACT,
    recurrenceRule: 'Exata (Qui, 10:00)',
    nextExecutionAt: 'Indefinido',
    realizedCount: 1,
    estimatedDurationMinutes: 15,
    lastCompletedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    location: 'Banheiro',
    subtasks: [
      { id: 's5', title: 'Jogar Lixo', completed: false }
    ],
    earnedProperties: ['+Item Limpeza', '+Resistência'],
    notes: 'Foco no Supino',
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Organizar Arquivos do PC',
    category: 'Trabalho',
    status: TaskStatus.OPEN,
    priority: TaskPriorityClass.CLASS_A,
    type: TaskType.ORGANIZATION,
    recurrenceMode: RecurrenceMode.FLEXIBLE,
    flexibleIntervalHours: 48,
    recurrenceRule: 'Flexível (A cada 48h)',
    nextExecutionAt: '2:00 PM',
    realizedCount: 5,
    estimatedDurationMinutes: 30,
    lastCompletedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    location: 'PC',
    subtasks: [
      { id: 's6', title: 'Limpar Downloads', completed: true },
      { id: 's7', title: 'Esvaziar Lixeira', completed: false }
    ],
    earnedProperties: ['+Organização Digital', '+Foco'],
    notes: 'Manter a pasta limpa',
    createdAt: new Date().toISOString()
  }
];

export const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<AppTask[]>(() => {
    const saved = localStorage.getItem('app_tasks_v2');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [activeSubTab, setActiveSubTab] = useState<'table' | 'session' | 'stats'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedLocation, setSelectedLocation] = useState<string>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedPriority, setSelectedPriority] = useState<string>('TODAS');

  // Modal de Criação / Edição
  const [showModal, setShowModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'basic' | 'frequency' | 'context' | 'rewards'>('basic');

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Casa');
  const [formStatus, setFormStatus] = useState<TaskStatus>(TaskStatus.OPEN);
  const [formPriority, setFormPriority] = useState<TaskPriorityClass>(TaskPriorityClass.CLASS_B);
  const [formType, setFormType] = useState<TaskType>(TaskType.NORMAL);
  const [formRecurrenceMode, setFormRecurrenceMode] = useState<RecurrenceMode>(RecurrenceMode.EXACT);
  const [formRecurrenceRule, setFormRecurrenceRule] = useState('Qui, 10:00');
  const [formFlexibleInterval, setFormFlexibleInterval] = useState(24);
  const [formDuration, setFormDuration] = useState(15);
  const [formLocation, setFormLocation] = useState('Banheiro');
  const [formNotes, setFormNotes] = useState('');
  const [formSubtasks, setFormSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [formEarnedPropInput, setFormEarnedPropInput] = useState('');
  const [formEarnedProperties, setFormEarnedProperties] = useState<string[]>([]);

  // Modo Sessão Aberta (Combo de Categoria)
  const [sessionCategory, setSessionCategory] = useState<string>('Saúde/Fitness');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionCompletedTasksCount, setSessionCompletedTasksCount] = useState(0);

  // Persistir Tarefas
  useEffect(() => {
    localStorage.setItem('app_tasks_v2', JSON.stringify(tasks));
  }, [tasks]);

  // Cronômetro da Sessão Aberta
  useEffect(() => {
    let timer: any;
    if (isSessionActive) {
      timer = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSessionActive]);

  // Categorias & Localidades únicas para filtros
  const categories = ['TODAS', ...Array.from(new Set(tasks.map(t => t.category)))];
  const locations = ['TODAS', ...Array.from(new Set(tasks.map(t => t.location)))];

  // Cálculo da Inércia (tempo sem ser realizada)
  const getInertiaString = (lastCompletedAt?: string | null) => {
    if (!lastCompletedAt) return 'Sem registro';
    const diffMs = Date.now() - new Date(lastCompletedAt).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return 'Recente';
    if (hours < 24) return `${hours}h Sem Fazer`;
    const days = Math.floor(hours / 24);
    return `${days}d Sem Fazer`;
  };

  // Filtro principal de tarefas
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'TODAS' || t.category === selectedCategory;
    const matchesLocation = selectedLocation === 'TODAS' || t.location === selectedLocation;
    const matchesStatus = selectedStatus === 'TODOS' || t.status === selectedStatus;
    const matchesPriority = selectedPriority === 'TODAS' || t.priority === selectedPriority;
    return matchesSearch && matchesCategory && matchesLocation && matchesStatus && matchesPriority;
  });

  // Abrir Modal de Criação / Edição
  const handleOpenModal = (task?: AppTask) => {
    if (task) {
      setEditingTaskId(task.id);
      setFormName(task.name);
      setFormCategory(task.category);
      setFormStatus(task.status);
      setFormPriority(task.priority);
      setFormType(task.type);
      setFormRecurrenceMode(task.recurrenceMode);
      setFormRecurrenceRule(task.recurrenceRule || '');
      setFormFlexibleInterval(task.flexibleIntervalHours || 24);
      setFormDuration(task.estimatedDurationMinutes);
      setFormLocation(task.location);
      setFormNotes(task.notes || '');
      setFormSubtasks(task.subtasks || []);
      setFormEarnedProperties(task.earnedProperties || []);
    } else {
      setEditingTaskId(null);
      setFormName('');
      setFormCategory('Casa');
      setFormStatus(TaskStatus.OPEN);
      setFormPriority(TaskPriorityClass.CLASS_B);
      setFormType(TaskType.NORMAL);
      setFormRecurrenceMode(RecurrenceMode.EXACT);
      setFormRecurrenceRule('Qui, 10:00');
      setFormFlexibleInterval(24);
      setFormDuration(15);
      setFormLocation('Banheiro');
      setFormNotes('');
      setFormSubtasks([]);
      setFormEarnedProperties(['+Item Limpeza', '+Resistência']);
    }
    setModalTab('basic');
    setShowModal(true);
  };

  // Salvar Tarefa
  const handleSaveTask = () => {
    if (!formName.trim()) return;

    if (editingTaskId) {
      setTasks(prev => prev.map(t => t.id === editingTaskId ? {
        ...t,
        name: formName,
        category: formCategory,
        status: formStatus,
        priority: formPriority,
        type: formType,
        recurrenceMode: formRecurrenceMode,
        recurrenceRule: formRecurrenceMode === RecurrenceMode.EXACT ? `Exata (${formRecurrenceRule})` : `Flexível (A cada ${formFlexibleInterval}h)`,
        flexibleIntervalHours: formFlexibleInterval,
        estimatedDurationMinutes: formDuration,
        location: formLocation,
        notes: formNotes,
        subtasks: formSubtasks,
        earnedProperties: formEarnedProperties,
      } : t));
    } else {
      const newTask: AppTask = {
        id: Date.now().toString(),
        name: formName,
        category: formCategory,
        status: formStatus,
        priority: formPriority,
        type: formType,
        recurrenceMode: formRecurrenceMode,
        recurrenceRule: formRecurrenceMode === RecurrenceMode.EXACT ? `Exata (${formRecurrenceRule})` : `Flexível (A cada ${formFlexibleInterval}h)`,
        flexibleIntervalHours: formFlexibleInterval,
        nextExecutionAt: '2:00 PM',
        realizedCount: 0,
        estimatedDurationMinutes: formDuration,
        lastCompletedAt: null,
        location: formLocation,
        subtasks: formSubtasks,
        earnedProperties: formEarnedProperties,
        notes: formNotes,
        createdAt: new Date().toISOString()
      };
      setTasks(prev => [newTask, ...prev]);
    }
    setShowModal(false);
  };

  // Alternar Conclusão Rápida de Tarefa
  const handleToggleComplete = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const isAlreadyDone = t.status === TaskStatus.COMPLETED;
        const newStatus = isAlreadyDone ? TaskStatus.PENDING : TaskStatus.COMPLETED;
        return {
          ...t,
          status: newStatus,
          realizedCount: isAlreadyDone ? Math.max(0, t.realizedCount - 1) : t.realizedCount + 1,
          lastCompletedAt: isAlreadyDone ? t.lastCompletedAt : new Date().toISOString(),
          subtasks: t.subtasks.map(st => ({ ...st, completed: !isAlreadyDone }))
        };
      }
      return t;
    }));
  };

  // Excluir Tarefa
  const handleDeleteTask = (taskId: string) => {
    if (confirm('Deseja realmente remover esta tarefa?')) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  // Adicionar Subtask no Form
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    if (formSubtasks.length >= 5) {
      alert('Você pode adicionar no máximo 5 subpassos.');
      return;
    }
    setFormSubtasks(prev => [...prev, { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setFormSubtasks(prev => prev.filter(st => st.id !== id));
  };

  // Adicionar Propriedade Ganha
  const handleAddEarnedProperty = () => {
    if (!formEarnedPropInput.trim()) return;
    const prop = formEarnedPropInput.startsWith('+') ? formEarnedPropInput.trim() : `+${formEarnedPropInput.trim()}`;
    if (!formEarnedProperties.includes(prop)) {
      setFormEarnedProperties(prev => [...prev, prop]);
    }
    setFormEarnedPropInput('');
  };

  // Modo Sessão Aberta - Concluir Tarefa no Modo Combo
  const handleCompleteInSession = (task: AppTask) => {
    handleToggleComplete(task.id);
    setSessionCompletedTasksCount(prev => prev + 1);
  };

  // Formatação de Tempo HH:MM:SS
  const formatSeconds = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Métricas para Estatísticas
  const totalCompleted = tasks.reduce((acc, t) => acc + t.realizedCount, 0);
  const completedLateCount = tasks.filter(t => t.status === TaskStatus.COMPLETED_LATE).length;
  
  // Propriedades Acumuladas
  const propertyAcc: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.realizedCount > 0 && t.earnedProperties) {
      t.earnedProperties.forEach(p => {
        propertyAcc[p] = (propertyAcc[p] || 0) + t.realizedCount;
      });
    }
  });

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 p-3 sm:p-6 font-sans">
      {/* Header Principal da Planilha / Tabela */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              📊
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                PLANILHA GERAL DE TAREFAS
              </h1>
              <p className="text-xs text-gray-400">
                Gerenciador Dinâmico de Tarefas, Sessões Contínuas e Estatísticas
              </p>
            </div>
          </div>
        </div>

        {/* Abas de Navegação Superior */}
        <div className="flex items-center gap-1 bg-[#161b22] p-1.5 rounded-xl border border-gray-800 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('table')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'table' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            📋 Planilha Geral
          </button>

          <button
            onClick={() => setActiveSubTab('session')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'session' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            ⏱️ Modo Sessão Aberta {isSessionActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
          </button>

          <button
            onClick={() => setActiveSubTab('stats')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'stats' 
                ? 'bg-purple-600 text-white shadow' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            📈 Estatísticas & Ganhos
          </button>
        </div>
      </div>

      {/* SUB-ABA 1: TABELA GERAL (Spreadsheet Style) */}
      {activeSubTab === 'table' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Input de Busca */}
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="🔍 Buscar tarefa, categoria ou local..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Filtro Categoria */}
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
              >
                <option value="TODAS">📁 Categoria: Todas</option>
                {categories.filter(c => c !== 'TODAS').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Filtro Localidade */}
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
              >
                <option value="TODAS">📍 Local: Todos</option>
                {locations.filter(l => l !== 'TODAS').map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              {/* Filtro Prioridade */}
              <select
                value={selectedPriority}
                onChange={e => setSelectedPriority(e.target.value)}
                className="bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
              >
                <option value="TODAS">⭐ Prioridade: Todas</option>
                <option value={TaskPriorityClass.CLASS_A}>Classe A</option>
                <option value={TaskPriorityClass.CLASS_B}>Classe B</option>
                <option value={TaskPriorityClass.CLASS_C}>Classe C</option>
              </select>
            </div>

            {/* Botão de Adicionar Nova Tarefa */}
            <button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-600/30 active:scale-95"
            >
              <span className="text-base font-bold">+</span> Nova Tarefa
            </button>
          </div>

          {/* Tabela Estilo Data Table / Planilha */}
          <div className="bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#21262d] text-gray-400 border-b border-gray-800 font-semibold select-none">
                    <th className="p-3 w-10 text-center">ID</th>
                    <th className="p-3 min-w-[180px]">NOME DA TAREFA</th>
                    <th className="p-3 min-w-[130px]">CATEGORIA</th>
                    <th className="p-3 min-w-[110px]">TIPO</th>
                    <th className="p-3 min-w-[90px]">CLASSE</th>
                    <th className="p-3 min-w-[110px]">LOCALIDADE</th>
                    <th className="p-3 min-w-[150px]">RECORRÊNCIA</th>
                    <th className="p-3 min-w-[110px]">STATUS</th>
                    <th className="p-3 text-center min-w-[80px]">DURAÇÃO</th>
                    <th className="p-3 text-center min-w-[80px]">QTD. FEITA</th>
                    <th className="p-3 min-w-[180px]">SUBTAREFAS (PROGRESSO)</th>
                    <th className="p-3 min-w-[170px]">PROPRIEDADES GANHAS</th>
                    <th className="p-3 min-w-[130px]">INÉRCIA ATUAL</th>
                    <th className="p-3 min-w-[140px]">NOTAS</th>
                    <th className="p-3 text-center min-w-[90px]">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-gray-300">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="p-8 text-center text-gray-500">
                        Nenhuma tarefa encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task, idx) => {
                      const completedSubtasks = task.subtasks.filter(s => s.completed).length;
                      const subtaskRatio = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0;

                      return (
                        <tr 
                          key={task.id} 
                          className="hover:bg-[#1c2128] transition-colors group"
                        >
                          {/* ID */}
                          <td className="p-3 text-center text-gray-500 font-mono">
                            {idx + 1}
                          </td>

                          {/* Nome com Checkbox rápido */}
                          <td className="p-3 font-medium text-white">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={task.status === TaskStatus.COMPLETED}
                                onChange={() => handleToggleComplete(task.id)}
                                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-[#0d1117] cursor-pointer"
                              />
                              <span className={task.status === TaskStatus.COMPLETED ? 'line-through text-gray-500' : 'text-gray-100'}>
                                {task.name}
                              </span>
                            </div>
                          </td>

                          {/* Categoria Badge */}
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-950/60 text-blue-300 border border-blue-800/40">
                              🏷️ {task.category}
                            </span>
                          </td>

                          {/* Tipo */}
                          <td className="p-3">
                            <span className="text-gray-300 text-[11px] font-medium">
                              {task.type}
                            </span>
                          </td>

                          {/* Classe / Prioridade */}
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              task.priority === TaskPriorityClass.CLASS_A 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' 
                                : task.priority === TaskPriorityClass.CLASS_B
                                ? 'bg-amber-950 text-amber-300 border border-amber-800/40'
                                : 'bg-gray-800 text-gray-300'
                            }`}>
                              {task.priority}
                            </span>
                          </td>

                          {/* Localidade */}
                          <td className="p-3 text-gray-300">
                            📍 {task.location}
                          </td>

                          {/* Recorrência */}
                          <td className="p-3 text-gray-400 text-[11px]">
                            {task.recurrenceMode === RecurrenceMode.EXACT ? '📅 ' : '⏱️ '}
                            {task.recurrenceRule || 'Flexível'}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                              task.status === TaskStatus.COMPLETED 
                                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' 
                                : task.status === TaskStatus.PENDING
                                ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                                : task.status === TaskStatus.OPEN
                                ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                                : 'bg-gray-800 text-gray-400'
                            }`}>
                              {task.status}
                            </span>
                          </td>

                          {/* Duração Estimada */}
                          <td className="p-3 text-center text-gray-300 font-mono">
                            {task.estimatedDurationMinutes}m
                          </td>

                          {/* Quantidade Realizada */}
                          <td className="p-3 text-center font-bold text-blue-400 font-mono">
                            {task.realizedCount}
                          </td>

                          {/* Subtarefas & Progresso */}
                          <td className="p-3">
                            {task.subtasks.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-gray-400">
                                  <span>{completedSubtasks}/{task.subtasks.length} subpassos</span>
                                  <span>{Math.round(subtaskRatio)}%</span>
                                </div>
                                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-emerald-500 h-full transition-all duration-300"
                                    style={{ width: `${subtaskRatio}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-600 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Propriedades Ganhas */}
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {task.earnedProperties && task.earnedProperties.length > 0 ? (
                                task.earnedProperties.map((prop, pIdx) => (
                                  <span key={pIdx} className="bg-purple-950/70 text-purple-300 text-[10px] px-1.5 py-0.5 rounded border border-purple-800/40">
                                    {prop}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-600">—</span>
                              )}
                            </div>
                          </td>

                          {/* Cronômetro de Inércia */}
                          <td className="p-3 text-gray-400 text-[11px]">
                            {getInertiaString(task.lastCompletedAt)}
                          </td>

                          {/* Notas */}
                          <td className="p-3 text-gray-400 truncate max-w-[150px]" title={task.notes}>
                            {task.notes || '—'}
                          </td>

                          {/* Ações */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={() => handleOpenModal(task)}
                                className="p-1 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                                title="Editar Tarefa"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 hover:bg-red-950 text-red-400 rounded transition-colors"
                                title="Excluir Tarefa"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé Informativo da Tabela */}
            <div className="bg-[#161b22] px-4 py-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <div>Exibindo {filteredTasks.length} de {tasks.length} tarefas</div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Concluídas</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pendentes</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Em Aberto</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: MODO SESSÃO ABERTA (Combo de Categoria) */}
      {activeSubTab === 'session' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Painel do Cronômetro de Categoria */}
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 text-center md:text-left">
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800/40">
                  Modo Sessão Aberta • Combo Contínuo
                </span>
                <h2 className="text-2xl font-bold text-white">
                  Tempo Sem Intervalo na Categoria
                </h2>
                <p className="text-xs text-gray-400 max-w-md">
                  Execute múltiplas tarefas em sequência da mesma categoria sem pausar o foco. As propriedades ganhas e o histórico são creditados em tempo real!
                </p>
              </div>

              {/* Relógio do Cronômetro */}
              <div className="flex flex-col items-center justify-center bg-[#0d1117] px-8 py-4 rounded-2xl border border-gray-800 shadow-inner">
                <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">
                  Tempo Acumulado
                </span>
                <div className="text-4xl sm:text-5xl font-mono font-extrabold text-indigo-400 tracking-tight">
                  {formatSeconds(sessionSeconds)}
                </div>
                <span className="text-[10px] text-gray-500 mt-1">
                  Concluídas nesta sessão: <strong className="text-emerald-400">{sessionCompletedTasksCount}</strong>
                </span>
              </div>
            </div>

            {/* Controles de Categoria e Início */}
            <div className="mt-6 pt-6 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-300 font-medium">Selecione a Categoria:</label>
                <select
                  disabled={isSessionActive}
                  value={sessionCategory}
                  onChange={e => setSessionCategory(e.target.value)}
                  className="bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium disabled:opacity-50"
                >
                  {categories.filter(c => c !== 'TODAS').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                {!isSessionActive ? (
                  <button
                    onClick={() => {
                      setIsSessionActive(true);
                      setSessionSeconds(0);
                      setSessionCompletedTasksCount(0);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                  >
                    ▶️ Iniciar Combo de {sessionCategory}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSessionActive(false)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95"
                  >
                    ⏹️ Finalizar Sessão
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Fila de Tarefas da Categoria Selecionada */}
          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              📋 Tarefas da Categoria <span className="text-indigo-400">{sessionCategory}</span>
            </h3>

            <div className="space-y-3">
              {tasks.filter(t => t.category === sessionCategory).length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">Nenhuma tarefa cadastrada nesta categoria.</p>
              ) : (
                tasks.filter(t => t.category === sessionCategory).map(task => (
                  <div 
                    key={task.id} 
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      task.status === TaskStatus.COMPLETED
                        ? 'bg-emerald-950/20 border-emerald-800/40 opacity-75'
                        : 'bg-[#0d1117] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{task.name}</span>
                        <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                          ⏱️ {task.estimatedDurationMinutes}m
                        </span>
                        <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-medium">
                          📍 {task.location}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {task.earnedProperties.map((p, i) => (
                          <span key={i} className="text-[10px] bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded border border-purple-800/40">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      disabled={!isSessionActive}
                      onClick={() => handleCompleteInSession(task)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        task.status === TaskStatus.COMPLETED
                          ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      } ${!isSessionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {task.status === TaskStatus.COMPLETED ? '✓ Concluída no Combo' : 'Concluir Agora +1'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: ESTATÍSTICAS & PROPRIEDADES GANHAS */}
      {activeSubTab === 'stats' && (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Cards de Métricas Gerais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 shadow-lg">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Concluídas</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono">{totalCompleted}</div>
              <p className="text-[11px] text-gray-500 mt-1">Execuções totais registradas</p>
            </div>

            <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 shadow-lg">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Fora do Horário</span>
              <div className="text-3xl font-extrabold text-amber-400 mt-2 font-mono">{completedLateCount}</div>
              <p className="text-[11px] text-gray-500 mt-1">Tarefas concluídas após o prazo</p>
            </div>

            <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 shadow-lg">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Categorias Ativas</span>
              <div className="text-3xl font-extrabold text-blue-400 mt-2 font-mono">{categories.length - 1}</div>
              <p className="text-[11px] text-gray-500 mt-1">Agrupamentos temáticos configurados</p>
            </div>
          </div>

          {/* Painel de Atributos & Propriedades Ganhas */}
          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              🏆 Painel de Atributos e Propriedades Ganhas
            </h3>
            <p className="text-xs text-gray-400">
              Acúmulo total de ganhos recebidos ao finalizar as tarefas da rotina.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {Object.keys(propertyAcc).length === 0 ? (
                <p className="text-xs text-gray-500 col-span-full py-4 text-center">Nenhum atributo acumulado ainda. Conclua tarefas para pontuar!</p>
              ) : (
                Object.entries(propertyAcc).map(([prop, count]) => (
                  <div key={prop} className="bg-[#0d1117] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-300">{prop}</span>
                    <span className="text-sm font-bold font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/40">
                      x{count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE TAREFAS */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header do Modal */}
            <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ➕ {editingTaskId ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Navegação por Abas no Modal */}
            <div className="flex border-b border-gray-800 bg-[#0d1117] text-xs font-medium">
              <button
                onClick={() => setModalTab('basic')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  modalTab === 'basic' ? 'border-blue-500 text-blue-400 font-bold bg-[#161b22]' : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                1. Dados Principais
              </button>
              <button
                onClick={() => setModalTab('frequency')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  modalTab === 'frequency' ? 'border-blue-500 text-blue-400 font-bold bg-[#161b22]' : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                2. Frequência & Tempo
              </button>
              <button
                onClick={() => setModalTab('context')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  modalTab === 'context' ? 'border-blue-500 text-blue-400 font-bold bg-[#161b22]' : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                3. Subtarefas (até 5)
              </button>
              <button
                onClick={() => setModalTab('rewards')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  modalTab === 'rewards' ? 'border-blue-500 text-blue-400 font-bold bg-[#161b22]' : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                4. Ganhos & Notas
              </button>
            </div>

            {/* Conteúdo das Abas do Modal */}
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* TAB 1: DADOS PRINCIPAIS */}
              {modalTab === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Nome da Tarefa *</label>
                    <input
                      type="text"
                      placeholder="Ex: Limpar a pia do banheiro"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Categoria</label>
                      <input
                        type="text"
                        placeholder="Ex: Saúde, Casa, Trabalho"
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Localidade (Contexto)</label>
                      <input
                        type="text"
                        placeholder="Ex: Banheiro, PC, Cozinha"
                        value={formLocation}
                        onChange={e => setFormLocation(e.target.value)}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Status Inicial</label>
                      <select
                        value={formStatus}
                        onChange={e => setFormStatus(e.target.value as TaskStatus)}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {Object.values(TaskStatus).map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Prioridade</label>
                      <select
                        value={formPriority}
                        onChange={e => setFormPriority(e.target.value as TaskPriorityClass)}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value={TaskPriorityClass.CLASS_A}>Classe A (Alta)</option>
                        <option value={TaskPriorityClass.CLASS_B}>Classe B (Média)</option>
                        <option value={TaskPriorityClass.CLASS_C}>Classe C (Baixa)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Tipo de Tarefa</label>
                      <select
                        value={formType}
                        onChange={e => setFormType(e.target.value as TaskType)}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {Object.values(TaskType).map(tp => (
                          <option key={tp} value={tp}>{tp}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FREQUÊNCIA E TEMPO */}
              {modalTab === 'frequency' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">Modo de Recorrência</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormRecurrenceMode(RecurrenceMode.EXACT)}
                        className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                          formRecurrenceMode === RecurrenceMode.EXACT
                            ? 'bg-blue-950/60 border-blue-500 text-blue-300'
                            : 'bg-[#0d1117] border-gray-800 text-gray-400'
                        }`}
                      >
                        <span>📅 Recorrência Exata</span>
                        <span className="text-[10px] text-gray-500 font-normal">Dia e horário fixos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormRecurrenceMode(RecurrenceMode.FLEXIBLE)}
                        className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                          formRecurrenceMode === RecurrenceMode.FLEXIBLE
                            ? 'bg-blue-950/60 border-blue-500 text-blue-300'
                            : 'bg-[#0d1117] border-gray-800 text-gray-400'
                        }`}
                      >
                        <span>⏱️ Recorrência Flexível</span>
                        <span className="text-[10px] text-gray-500 font-normal">Janela contínua (ex: a cada 24h)</span>
                      </button>
                    </div>
                  </div>

                  {formRecurrenceMode === RecurrenceMode.EXACT ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Regra de Horário Exato</label>
                      <input
                        type="text"
                        placeholder="Ex: Toda segunda-feira às 14:00"
                        value={formRecurrenceRule}
                        onChange={e => setFormRecurrenceRule(e.target.value)}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Intervalo Flexível (Horas)</label>
                      <input
                        type="number"
                        placeholder="Ex: 24"
                        value={formFlexibleInterval}
                        onChange={e => setFormFlexibleInterval(Number(e.target.value))}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Duração Estimada (Minutos)</label>
                    <input
                      type="number"
                      placeholder="Ex: 15"
                      value={formDuration}
                      onChange={e => setFormDuration(Number(e.target.value))}
                      className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: SUBTAREFAS */}
              {modalTab === 'context' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-300">Subpassos de Execução (Até 5)</label>
                    <span className="text-[11px] text-gray-500">{formSubtasks.length}/5 adicionados</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Jogar lixo fora"
                      value={newSubtaskTitle}
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      className="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs"
                    >
                      Adicionar
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    {formSubtasks.map((st, idx) => (
                      <div key={st.id} className="flex items-center justify-between bg-[#0d1117] p-2.5 rounded-lg border border-gray-800 text-xs">
                        <span className="text-gray-300">{idx + 1}. {st.title}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="text-red-400 hover:text-red-300 font-bold px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: GANHOS & NOTAS */}
              {modalTab === 'rewards' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Propriedades Ganhas (Atributos)</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Ex: Força Muscular, Item Limpeza"
                        value={formEarnedPropInput}
                        onChange={e => setFormEarnedPropInput(e.target.value)}
                        className="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddEarnedProperty}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-xs"
                      >
                        + Atributo
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formEarnedProperties.map((prop, i) => (
                        <span key={i} className="bg-purple-950 text-purple-300 text-xs px-2 py-1 rounded border border-purple-800/40 flex items-center gap-1.5">
                          {prop}
                          <button
                            type="button"
                            onClick={() => setFormEarnedProperties(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-purple-400 hover:text-white font-bold"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Notas e Observações</label>
                    <textarea
                      rows={3}
                      placeholder="Anotações rápidas sobre como realizar a tarefa..."
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      className="w-full bg-[#0d1117] border border-gray-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal com Ações */}
            <div className="p-4 border-t border-gray-800 bg-[#0d1117] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveTask}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg text-xs shadow-lg shadow-blue-600/30 transition-all"
              >
                Salvar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
