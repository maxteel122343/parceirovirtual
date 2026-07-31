import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, PartnerProfile } from '../types';
import { supabase } from '../supabaseClient';

export interface TaskItem {
  id: number;
  nome: string;
  categoria: 'Saúde/Fitness' | 'Casa' | 'Estudos' | 'Trabalho' | 'Tarefa';
  tipo: 'Normal' | 'Manutenção' | 'Organização' | 'Infra' | 'Intervalo' | 'Tarefa';
  classe: 'Classe A' | 'Classe B' | 'Classe C';
  localidade: string;
  recorrenciaTipo: 'Exata' | 'Flexível';
  recorrencia: string;
  inicioData: string | null; // null = inicio nulo / sem horario fixo
  duracaoEst: string;
  terminoCalculado: string;
  lembreteIa: string; // ex: "A cada 30 min", "A cada 1 hora", "Desativado"
  proxExecucao: string;
  status: 'Concluído' | 'Pendente';
  quantFeita: number;
  subtarefas: { total: number; concluidas: number; itens: string[] };
  propriedadesGanhas: string;
  inerciaAtual: string;
  notas: string;
  concluidaForaHorario?: boolean;
  isAtivadaPeriodica?: boolean;
  horarioAgendaAgendado?: string;
  isAdiada?: boolean;
}

// Helper to format date string to YYYY-MM-DDTHH:mm for datetime-local input
const getNowDateTimeLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper to calculate End Date & Time from Start Date + Duration
const calculateTermino = (inicioStr: string | null, duracaoStr: string) => {
  if (!inicioStr) return 'Nulo (Sem Horário Fixo no Relógio)';
  const date = new Date(inicioStr);
  if (isNaN(date.getTime())) return 'Nulo (Sem Horário Fixo no Relógio)';

  let minutesToAdd = 30; // default 30 mins
  if (duracaoStr.toLowerCase().includes('h')) {
    const hoursMatch = duracaoStr.match(/(\d+)\s*h/i);
    const minsMatch = duracaoStr.match(/(\d+)\s*m/i);
    const hrs = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
    minutesToAdd = hrs * 60 + mins;
  } else if (duracaoStr.toLowerCase().includes('m')) {
    const minsMatch = duracaoStr.match(/(\d+)\s*m/i);
    minutesToAdd = minsMatch ? parseInt(minsMatch[1]) : 30;
  }

  const endDate = new Date(date.getTime() + minutesToAdd * 60 * 1000);
  const day = endDate.getDate().toString().padStart(2, '0');
  const month = (endDate.getMonth() + 1).toString().padStart(2, '0');
  const year = endDate.getFullYear();
  const hours = endDate.getHours().toString().padStart(2, '0');
  const minutes = endDate.getMinutes().toString().padStart(2, '0');
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekday = weekdays[endDate.getDay()];

  return `${weekday}, ${day}/${month}/${year} às ${hours}:${minutes}`;
};

// Helper to calculate AI reminder frequency based on 1/N fraction of estimated duration
const calculateReminderFromFraction = (duracaoStr: string, fraction: string) => {
  let totalMinutes = 30;
  if (duracaoStr.toLowerCase().includes('h')) {
    const hoursMatch = duracaoStr.match(/(\d+)\s*h/i);
    const minsMatch = duracaoStr.match(/(\d+)\s*m/i);
    const hrs = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
    totalMinutes = hrs * 60 + mins;
  } else if (duracaoStr.toLowerCase().includes('m')) {
    const minsMatch = duracaoStr.match(/(\d+)\s*m/i);
    totalMinutes = minsMatch ? parseInt(minsMatch[1]) : 30;
  }

  let divider = 3;
  if (fraction === '1/5') divider = 5;
  else if (fraction === '1/2') divider = 2;
  else if (fraction === '1/4') divider = 4;

  const intervalMin = Math.max(5, Math.round(totalMinutes / divider));
  const percentStr = Math.round(100 / divider);

  if (intervalMin >= 60) {
    const hrs = Math.round(intervalMin / 60);
    return `A cada ${hrs}h (${fraction} - ${percentStr}% da duração)`;
  }
  return `A cada ${intervalMin} min (${fraction} - ${percentStr}% da duração)`;
};

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
    inicioData: getNowDateTimeLocal(),
    duracaoEst: '1h 30m',
    terminoCalculado: calculateTermino(getNowDateTimeLocal(), '1h 30m'),
    lembreteIa: 'A cada 30 min',
    proxExecucao: '12:00 PM',
    status: 'Concluído',
    quantFeita: 15,
    subtarefas: { total: 3, concluidas: 3, itens: ['Supino', 'Agachamento', 'Biceps'] },
    propriedadesGanhas: '+Força Muscular, +Resistência',
    inerciaAtual: '--',
    notas: 'Foco no Supino',
    isAtivadaPeriodica: false
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
    inicioData: getNowDateTimeLocal(),
    duracaoEst: '15m',
    terminoCalculado: calculateTermino(getNowDateTimeLocal(), '15m'),
    lembreteIa: 'A cada 5 min',
    proxExecucao: 'Indefinido',
    status: 'Pendente',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Alimento Armazenado',
    inerciaAtual: '18h Sem Fazer',
    notas: 'Usar desinfetante',
    isAtivadaPeriodica: false
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
    inicioData: null,
    duracaoEst: '15m',
    terminoCalculado: 'Nulo (Sem Horário Fixo no Relógio)',
    lembreteIa: 'A cada 2 horas',
    proxExecucao: 'Indefinido',
    status: 'Pendente',
    quantFeita: 1,
    subtarefas: { total: 1, concluidas: 0, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Item Limpeza, +Resistência',
    inerciaAtual: '--',
    notas: 'Foco no Supino',
    isAtivadaPeriodica: false
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
    inicioData: getNowDateTimeLocal(),
    duracaoEst: '10m',
    terminoCalculado: calculateTermino(getNowDateTimeLocal(), '10m'),
    lembreteIa: 'A cada 3 min',
    proxExecucao: '12:00 PM',
    status: 'Pendente',
    quantFeita: 1,
    subtarefas: { total: 3, concluidas: 3, itens: ['Jogar Lixo'] },
    propriedadesGanhas: '+Força Muscular, +Resistência',
    inerciaAtual: '--',
    notas: '--',
    isAtivadaPeriodica: false
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
    inicioData: getNowDateTimeLocal(),
    duracaoEst: '72h',
    terminoCalculado: calculateTermino(getNowDateTimeLocal(), '72h'),
    lembreteIa: 'A cada 24h',
    proxExecucao: '2:00 PM',
    status: 'Concluído',
    quantFeita: 8,
    subtarefas: { total: 2, concluidas: 2, itens: ['Revisar Árvores', 'Fazer Leetcode'] },
    propriedadesGanhas: '+Conhecimento Técnico, +Foco',
    inerciaAtual: '--',
    notas: 'Anotar complexidade',
    isAtivadaPeriodica: false
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
    inicioData: getNowDateTimeLocal(),
    duracaoEst: '45m',
    terminoCalculado: calculateTermino(getNowDateTimeLocal(), '45m'),
    lembreteIa: 'A cada 15 min',
    proxExecucao: '9:00 AM',
    status: 'Pendente',
    quantFeita: 3,
    subtarefas: { total: 2, concluidas: 0, itens: ['Planilha de Gastos', 'Conferir Extrato'] },
    propriedadesGanhas: '+Organização Financeira, +Disciplina',
    inerciaAtual: '24h Sem Fazer',
    notas: 'Exportar relatórios',
    isAtivadaPeriodica: false
  }
];

interface TasksTabProps {
  user?: any;
  profile?: PartnerProfile;
  isDark?: boolean;
}

export const TasksTab: React.FC<TasksTabProps> = ({ user, isDark = true }) => {
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [viewMode, setViewMode] = useState<'PLANILHA' | 'CARDS'>('CARDS');
  
  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');
  const [sortBy, setSortBy] = useState<'RECENTE' | 'PRIORIDADE' | 'INERCIA'>('RECENTE');
  const [onlyPeriodicFilter, setOnlyPeriodicFilter] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // -------------------------------------------------------------
  // CONFIGURAÇÃO DE ATIVAÇÃO PERIÓDICA POR IA STATE
  // -------------------------------------------------------------
  const [ativarQuantidade, setAtivarQuantidade] = useState<number>(5);
  const [periodoHoras, setPeriodoHoras] = useState<number>(24);
  const [considerarRecorrencia, setConsiderarRecorrencia] = useState<boolean>(true);
  const [reminderFraction, setReminderFraction] = useState<string>('1/3');
  const [postponedQueue, setPostponedQueue] = useState<number[]>([]);
  const [isPeriodicActivationActive, setIsPeriodicActivationActive] = useState<boolean>(false);
  const [activationFeedback, setActivationFeedback] = useState<string | null>(null);

  // -------------------------------------------------------------
  // EDIT & DELETE CARD STATE
  // -------------------------------------------------------------
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editForm, setEditForm] = useState<{
    nome: string;
    categoria: 'Saúde/Fitness' | 'Casa' | 'Estudos' | 'Trabalho' | 'Tarefa';
    tipo: 'Normal' | 'Manutenção' | 'Organização' | 'Infra' | 'Intervalo' | 'Tarefa';
    classe: 'Classe A' | 'Classe B' | 'Classe C';
    localidade: string;
    inicioNulo: boolean;
    inicioData: string;
    duracaoEst: string;
    lembreteIa: string;
    subtasksInput: string[];
    propriedadesGanhas: string;
    notas: string;
  } | null>(null);

  // Supabase Cloud Sync logic (Mobile <-> PC Realtime Sync & Relogin Persistence)
  const syncTasksWithCloud = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .like('title', '[TASK_ITEM]%')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const cloudTasks: TaskItem[] = [];
        data.forEach(item => {
          if (item.notes) {
            try {
              const parsedTask = JSON.parse(item.notes);
              if (parsedTask && parsedTask.nome) {
                cloudTasks.push(parsedTask);
              }
            } catch (e) {}
          }
        });

        if (cloudTasks.length > 0) {
          setTasks(prev => {
            const taskMap = new Map<string, TaskItem>();
            cloudTasks.forEach(ct => {
              taskMap.set(ct.nome.toLowerCase().trim(), ct);
            });
            prev.forEach(pt => {
              const key = pt.nome.toLowerCase().trim();
              if (!taskMap.has(key)) {
                taskMap.set(key, pt);
              }
            });

            const merged = Array.from(taskMap.values());
            localStorage.setItem('parceiro_virtual_tasks_v2', JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch (e) {
      console.error('Error syncing tasks with Supabase:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Persistence & Realtime Event Listeners
  useEffect(() => {
    try {
      const saved = localStorage.getItem('parceiro_virtual_tasks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
        } else {
          localStorage.setItem('parceiro_virtual_tasks_v2', JSON.stringify(INITIAL_TASKS));
        }
      } else {
        localStorage.setItem('parceiro_virtual_tasks_v2', JSON.stringify(INITIAL_TASKS));
      }

      const savedPeriodic = localStorage.getItem('parceiro_virtual_periodic_active');
      if (savedPeriodic === 'true') {
        setIsPeriodicActivationActive(true);
      } else {
        setIsPeriodicActivationActive(false);
      }
    } catch (e) {}

    // Cloud initial sync + realtime Postgres changes listener
    syncTasksWithCloud();
    const channel = supabase.channel('tasks_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
        syncTasksWithCloud();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const handleTasksUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setTasks(e.detail);
      }
    };
    const handlePeriodicChanged = (e: any) => {
      if (e.detail) {
        setIsPeriodicActivationActive(!!e.detail.active);
      }
    };
    window.addEventListener('tasks-updated', handleTasksUpdated);
    window.addEventListener('periodic-activation-changed', handlePeriodicChanged);
    return () => {
      window.removeEventListener('tasks-updated', handleTasksUpdated);
      window.removeEventListener('periodic-activation-changed', handlePeriodicChanged);
    };
  }, []);

  const updateAndSaveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem('parceiro_virtual_tasks_v2', JSON.stringify(newTasks));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('tasks-updated', { detail: newTasks }));
  };

  // -------------------------------------------------------------
  // LÓGICA DE EXCLUSÃO E EDIÇÃO DE CARDS
  // -------------------------------------------------------------
  const handleDeleteTask = async (task: TaskItem) => {
    if (!window.confirm(`Tem certeza que deseja excluir a tarefa "${task.nome}"?`)) return;

    const updatedTasks = tasks.filter(t => t.id !== task.id);
    updateAndSaveTasks(updatedTasks);

    // Remove from Supabase Cloud
    try {
      await supabase
        .from('reminders')
        .delete()
        .eq('title', `[TASK_ITEM] ${task.nome}`);
    } catch (e) {
      console.error('Error deleting task from Supabase:', e);
    }
  };

  const handleOpenEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setEditForm({
      nome: task.nome,
      categoria: task.categoria,
      tipo: task.tipo,
      classe: task.classe,
      localidade: task.localidade,
      inicioNulo: task.inicioData === null,
      inicioData: task.inicioData || getNowDateTimeLocal(),
      duracaoEst: task.duracaoEst,
      lembreteIa: task.lembreteIa,
      subtasksInput: [...task.subtarefas.itens, '', '', '', ''].slice(0, 5),
      propriedadesGanhas: task.propriedadesGanhas,
      notas: task.notas
    });
  };

  const handleSaveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editForm || !editForm.nome.trim()) return;

    const validSubtasks = editForm.subtasksInput.filter(s => s.trim() !== '');
    const inicioStr = editForm.inicioNulo ? null : editForm.inicioData;
    const terminoCalculado = calculateTermino(inicioStr, editForm.duracaoEst);

    const updatedTask: TaskItem = {
      ...editingTask,
      nome: editForm.nome,
      categoria: editForm.categoria,
      tipo: editForm.tipo,
      classe: editForm.classe,
      localidade: editForm.localidade,
      inicioData: inicioStr,
      duracaoEst: editForm.duracaoEst || '30m',
      terminoCalculado: terminoCalculado,
      lembreteIa: editForm.lembreteIa,
      proxExecucao: inicioStr ? new Date(inicioStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Indefinido',
      subtarefas: {
        total: validSubtasks.length || 1,
        concluidas: Math.min(editingTask.subtarefas.concluidas, validSubtasks.length || 1),
        itens: validSubtasks.length ? validSubtasks : ['Executar Tarefa']
      },
      propriedadesGanhas: editForm.propriedadesGanhas || '+Foco',
      notas: editForm.notas || '--'
    };

    const updatedList = tasks.map(t => (t.id === editingTask.id ? updatedTask : t));
    updateAndSaveTasks(updatedList);

    // Update in Supabase Cloud
    try {
      // First delete old entry if name changed
      if (editingTask.nome !== updatedTask.nome) {
        await supabase.from('reminders').delete().eq('title', `[TASK_ITEM] ${editingTask.nome}`);
      }
      await supabase.from('reminders').insert({
        owner_id: user?.id || null,
        title: `[TASK_ITEM] ${updatedTask.nome}`,
        notes: JSON.stringify(updatedTask),
        trigger_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error updating task in Supabase:', e);
    }

    setEditingTask(null);
    setEditForm(null);
  };

  // -------------------------------------------------------------
  // MODO "SESSÃO ABERTA" (Modo Combo de Categoria) State
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
  // ALGORITMO INTELIGENTE DE ATIVAÇÃO PERIÓDICA DA IA (LIGAR / DESATIVAR)
  // -------------------------------------------------------------
  const handleToggleAtivacaoPeriodica = () => {
    if (isPeriodicActivationActive) {
      // DESATIVAR ATIVAÇÃO PERIÓDICA
      const updatedTasks = tasks.map(t => ({ ...t, isAtivadaPeriodica: false, isAdiada: false }));
      updateAndSaveTasks(updatedTasks);
      setIsPeriodicActivationActive(false);
      localStorage.setItem('parceiro_virtual_periodic_active', 'false');
      window.dispatchEvent(new CustomEvent('periodic-activation-changed', { detail: { active: false } }));
      
      setActivationFeedback('🛑 Ativação Periódica por IA DESATIVADA. A marcação foi removida de todas as tarefas.');
      setTimeout(() => setActivationFeedback(null), 5000);
    } else {
      // ATIVAR EXECUÇÃO PERIÓDICA INTELIGENTE
      const existingAgendaTasks = tasks.filter(t => t.isAtivadaPeriodica || t.horarioAgendaAgendado);
      const countExisting = existingAgendaTasks.length;
      const targetTotal = ativarQuantidade;
      const additionalNeeded = Math.max(0, targetTotal - countExisting);

      const pool = tasks.filter(t => !t.isAtivadaPeriodica);

      const scoredPool = pool.map(t => {
        let score = 0;
        if (t.status === 'Pendente') score += 50;

        if (t.inerciaAtual.includes('36h')) score += 60;
        else if (t.inerciaAtual.includes('24h')) score += 40;
        else if (t.inerciaAtual.includes('18h')) score += 30;

        if (t.classe === 'Classe A') score += 35;
        else if (t.classe === 'Classe B') score += 20;

        if (considerarRecorrencia && t.recorrenciaTipo === 'Flexível') score += 25;

        return { task: t, score };
      });

      scoredPool.sort((a, b) => b.score - a.score);

      const selectedAdditional = scoredPool.slice(0, additionalNeeded).map(item => item.task.id);
      const allActivatedIds = new Set([
        ...existingAgendaTasks.map(t => t.id),
        ...selectedAdditional
      ]);

      const intervalMinutes = (periodoHoras * 60) / Math.max(1, targetTotal);
      let currentTime = new Date();

      const updatedTasks = tasks.map(t => {
        if (allActivatedIds.has(t.id)) {
          currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
          const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = currentTime.getHours() < 24 ? 'Hoje' : 'Amanhã';

          const calculatedReminder = calculateReminderFromFraction(t.duracaoEst, reminderFraction);

          return {
            ...t,
            isAtivadaPeriodica: true,
            isAdiada: false,
            lembreteIa: calculatedReminder,
            horarioAgendaAgendado: t.horarioAgendaAgendado || `${dateStr} ${timeStr}`,
            proxExecucao: t.proxExecucao || timeStr
          };
        }
        return { ...t, isAtivadaPeriodica: false };
      });

      updateAndSaveTasks(updatedTasks);
      setIsPeriodicActivationActive(true);
      localStorage.setItem('parceiro_virtual_periodic_active', 'true');
      window.dispatchEvent(new CustomEvent('periodic-activation-changed', { detail: { active: true } }));

      // Primeiríssima tarefa ativada para ser anunciada em voz alta
      const firstTask = updatedTasks.find(t => t.isAtivadaPeriodica && t.status === 'Pendente');
      const firstTaskName = firstTask ? firstTask.nome : 'Treino de Musculação';
      const firstTaskTime = firstTask ? (firstTask.horarioAgendaAgendado || firstTask.proxExecucao) : '12:00 PM';

      setActivationFeedback(
        `⚡ ATIVADO! A IA selecionou ${targetTotal} tarefas. PRIMEIRA TAREFA: "${firstTaskName}" (${firstTaskTime}).`
      );

      setTimeout(() => setActivationFeedback(null), 7000);
    }
  };

  // Lógica de adiar tarefa (postpone)
  const handlePostponeTask = (id: number) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === id) {
        return { ...t, isAdiada: true };
      }
      return t;
    });

    updateAndSaveTasks(updatedTasks);
    setPostponedQueue(prev => [...prev.filter(pid => pid !== id), id]);
  };

  const totalCount = tasks.length;
  const emAbertoCount = tasks.filter(t => t.status === 'Pendente').length;
  const concluidasCount = tasks.filter(t => t.status === 'Concluído').length + comboCompletedCount;
  const falhasCount = tasks.filter(t => t.inerciaAtual.includes('24h') || t.inerciaAtual.includes('36h')).length;
  const periodicCount = isPeriodicActivationActive ? tasks.filter(t => t.isAtivadaPeriodica).length : 0;

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    nome: '',
    categoria: 'Saúde/Fitness' as 'Saúde/Fitness' | 'Casa' | 'Estudos' | 'Trabalho' | 'Tarefa',
    tipo: 'Normal' as 'Normal' | 'Manutenção' | 'Organização' | 'Infra' | 'Intervalo' | 'Tarefa',
    classe: 'Classe A' as 'Classe A' | 'Classe B' | 'Classe C',
    localidade: '🏋️ Academia',
    recorrenciaTipo: 'Flexível' as 'Exata' | 'Flexível',
    recorrenciaDetalhe: 'A cada 24h',
    inicioNulo: false,
    inicioData: getNowDateTimeLocal(),
    duracaoEst: '30m',
    lembreteIa: 'A cada 1 hora',
    subtasksInput: ['', '', '', '', ''],
    propriedadesGanhas: '+Força Muscular, +Resistência',
    notas: ''
  });

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [viewDayTimeline, setViewDayTimeline] = useState<number | null>(null);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.nome.trim()) return;

    const validSubtasks = newTaskForm.subtasksInput.filter(s => s.trim() !== '');
    const inicioStr = newTaskForm.inicioNulo ? null : newTaskForm.inicioData;
    const terminoCalculado = calculateTermino(inicioStr, newTaskForm.duracaoEst);

    const newTask: TaskItem = {
      id: Date.now(),
      nome: newTaskForm.nome,
      categoria: newTaskForm.categoria,
      tipo: newTaskForm.tipo,
      classe: newTaskForm.classe,
      localidade: newTaskForm.localidade,
      recorrenciaTipo: newTaskForm.recorrenciaTipo,
      recorrencia: `${newTaskForm.recorrenciaTipo} (${newTaskForm.recorrenciaDetalhe})`,
      inicioData: inicioStr,
      duracaoEst: newTaskForm.duracaoEst || '30m',
      terminoCalculado: terminoCalculado,
      lembreteIa: newTaskForm.lembreteIa || 'Desativado',
      proxExecucao: inicioStr ? new Date(inicioStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Indefinido',
      status: 'Pendente',
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

    const updated = [newTask, ...tasks];
    updateAndSaveTasks(updated);

    // Save to Supabase cloud WITH AWAIT to prevent data loss on relogin
    try {
      const { error } = await supabase.from('reminders').insert({
        owner_id: user?.id || null,
        title: `[TASK_ITEM] ${newTask.nome}`,
        notes: JSON.stringify(newTask),
        trigger_at: new Date().toISOString()
      });
      if (error) {
        console.error('Error inserting task to Supabase:', error);
      }
    } catch (e) {
      console.error('Failed to insert task to Supabase:', e);
    }

    setShowCreateModal(false);
    setNewTaskForm({
      nome: '',
      categoria: 'Saúde/Fitness',
      tipo: 'Normal',
      classe: 'Classe A',
      localidade: '🏋️ Academia',
      recorrenciaTipo: 'Flexível',
      recorrenciaDetalhe: 'A cada 24h',
      inicioNulo: false,
      inicioData: getNowDateTimeLocal(),
      duracaoEst: '30m',
      lembreteIa: 'A cada 1 hora',
      subtasksInput: ['', '', '', '', ''],
      propriedadesGanhas: '+Força Muscular, +Resistência',
      notas: ''
    });
  };

  const toggleTaskStatus = (id: number) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Concluído' ? 'Pendente' : 'Concluído';
        const nextQuant = nextStatus === 'Concluído' ? t.quantFeita + 1 : Math.max(0, t.quantFeita - 1);
        if (isComboActive && nextStatus === 'Concluído') {
          setComboCompletedCount(c => c + 1);
          const gained = t.propriedadesGanhas.split(',').map(p => p.trim().replace('+', ''));
          setComboEarnedProperties(ep => [...ep, ...gained]);
        }
        return { ...t, status: nextStatus, quantFeita: nextQuant, isAdiada: false };
      }
      return t;
    });

    updateAndSaveTasks(updatedTasks);
  };

  // Filter & Sorting Logic
  const getFilteredTasks = () => {
    return tasks.filter(t => {
      const matchesSearch =
        t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.localidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.notas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categoria.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === 'TODAS' || t.categoria === filterCategory;
      const matchesStatus = filterStatus === 'TODOS' || t.status === filterStatus;
      const matchesTipo = filterTipo === 'TODOS' || t.tipo === filterTipo;
      const matchesPeriodic = !onlyPeriodicFilter || (isPeriodicActivationActive && t.isAtivadaPeriodica);

      return matchesSearch && matchesCategory && matchesStatus && matchesTipo && matchesPeriodic;
    }).sort((a, b) => {
      if (isPeriodicActivationActive && a.isAtivadaPeriodica && !a.isAdiada && (!b.isAtivadaPeriodica || b.isAdiada)) return -1;
      if (isPeriodicActivationActive && (!a.isAtivadaPeriodica || a.isAdiada) && b.isAtivadaPeriodica && !b.isAdiada) return 1;

      if (a.isAdiada && !b.isAdiada) return 1;
      if (!a.isAdiada && b.isAdiada) return -1;

      if (sortBy === 'PRIORIDADE') {
        const pMap = { 'Classe A': 3, 'Classe B': 2, 'Classe C': 1 };
        return pMap[b.classe] - pMap[a.classe];
      }
      if (sortBy === 'INERCIA') {
        const getInertiaScore = (str: string) => (str.includes('36h') ? 3 : str.includes('24h') ? 2 : str.includes('18h') ? 1 : 0);
        return getInertiaScore(b.inerciaAtual) - getInertiaScore(a.inerciaAtual);
      }
      return b.id - a.id;
    });
  };

  const filteredTasks = getFilteredTasks();

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Saúde/Fitness':
        return 'bg-purple-900/40 text-purple-300 border border-purple-500/30';
      case 'Casa':
        return 'bg-[#1e293b] text-[#38bdf8] border border-sky-500/30';
      case 'Estudos':
        return 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30';
      case 'Trabalho':
        return 'bg-amber-900/40 text-amber-300 border border-amber-500/30';
      case 'Tarefa':
        return 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    return status === 'Concluído'
      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30';
  };

  const generateCalendarDays = () => {
    const days = [];
    const year = selectedCalendarDate.getFullYear();
    const month = selectedCalendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let formRecurrenceIntervalDays = 1;
    if (newTaskForm.recorrenciaDetalhe.toLowerCase().includes('72h')) formRecurrenceIntervalDays = 3;
    else if (newTaskForm.recorrenciaDetalhe.toLowerCase().includes('48h')) formRecurrenceIntervalDays = 2;

    for (let day = 1; day <= daysInMonth; day++) {
      let exataCount = tasks.filter(t => t.recorrenciaTipo === 'Exata').length;
      let flexivelCount = tasks.filter(t => t.recorrenciaTipo === 'Flexível').length;

      if (newTaskForm.recorrenciaTipo === 'Exata' && (day % formRecurrenceIntervalDays === 0 || day === 1)) {
        exataCount += 1;
      } else if (newTaskForm.recorrenciaTipo === 'Flexível' && (day % formRecurrenceIntervalDays === 0 || day === 1)) {
        flexivelCount += 1;
      }

      days.push({ day, exataCount, flexivelCount });
    }
    return days;
  };

  const hoursArray = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  return (
    <div className="w-full max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-[#1e293b] bg-[#0b1120] text-slate-100 transition-all font-sans">
      
      {/* BANNER DO MODO COMBO DE CATEGORIA (TELA 3) */}
      {isComboActive && (
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 px-6 py-4 border-b border-indigo-500/40 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
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
            <div className="hidden md:flex items-center gap-4 text-xs font-bold bg-black/40 px-4 py-2 rounded-2xl border border-white/10">
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

      {/* TOP BAR DE CABEÇALHO */}
      <div className="bg-[#111827] px-6 py-5 flex flex-wrap items-center justify-between border-b border-[#1f2937] gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl text-blue-400 shadow-inner">
            📊
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight uppercase italic text-white flex items-center gap-2">
              CARDS DE TAREFAS
            </h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">FEED INTERATIVO DE CARDS</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div className="flex items-center bg-[#1f2937]/80 p-1 rounded-2xl border border-slate-700/60 shadow-inner">
            <button
              onClick={() => setViewMode('PLANILHA')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                viewMode === 'PLANILHA' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📊</span> PLANILHA
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                viewMode === 'CARDS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>💳</span> CARDS
            </button>
          </div>

          <button
            onClick={syncTasksWithCloud}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Sincronizar tarefas da nuvem Supabase"
          >
            <span className={isSyncing ? 'animate-spin' : ''}>🔄</span> {isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR NUVEM'}
          </button>

          <button
            onClick={() => setOnlyPeriodicFilter(!onlyPeriodicFilter)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
              onlyPeriodicFilter
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <span>⚡</span> ATIVAÇÃO PERIÓDICA ({periodicCount})
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>+</span> NOVA TAREFA
          </button>
        </div>
      </div>

      {/* FEED & CONTROL AREA */}
      <div className="p-6 md:p-8 space-y-6">
        
        {/* BANNER DE CONFIGURAÇÃO DE ATIVAÇÃO PERIÓDICA POR IA (COM TOGGLE LIGAR/DESATIVAR) */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#111827] via-[#1f2937]/50 to-[#111827] border border-amber-500/30 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-lg">⚡</span>
              <h2 className="text-sm font-black uppercase tracking-widest text-amber-400">
                CONFIGURAÇÃO DE ATIVAÇÃO PERIÓDICA POR IA
              </h2>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              AUTOMAÇÃO DE PRODUTIVIDADE
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-6 font-medium leading-relaxed max-w-3xl">
            Defina quantas tarefas você quer que a IA ative no seu feed e o fracionamento do lembrete IA (ex: 1/3 = a cada 33% da duração, 1/5 = a cada 20%).
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-200">
              <span className="text-slate-400 uppercase tracking-wider text-[11px]">ATIVAR</span>
              <input
                type="number"
                min="1"
                max="50"
                value={ativarQuantidade}
                onChange={e => setAtivarQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-[#0b1120] text-center font-black text-amber-400 border border-amber-500/40 rounded-xl py-2 px-2 focus:outline-none focus:border-amber-400 shadow-inner"
              />
              <span className="text-slate-400 uppercase tracking-wider text-[11px]">TAREFAS</span>

              <span className="text-slate-400 uppercase tracking-wider text-[11px] ml-2">A CADA</span>
              <input
                type="number"
                min="1"
                max="168"
                value={periodoHoras}
                onChange={e => setPeriodoHoras(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 bg-[#0b1120] text-center font-black text-amber-400 border border-amber-500/40 rounded-xl py-2 px-2 focus:outline-none focus:border-amber-400 shadow-inner"
              />
              <span className="text-slate-400 uppercase tracking-wider text-[11px]">HORAS</span>

              <div className="flex items-center gap-2 ml-2">
                <span className="text-purple-400 uppercase tracking-wider text-[11px]">LEMBRETE IA (1/N):</span>
                <select
                  value={reminderFraction}
                  onChange={e => setReminderFraction(e.target.value)}
                  className="bg-[#0b1120] text-purple-300 font-mono font-bold border border-purple-500/40 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-purple-400 shadow-inner"
                >
                  <option value="1/3">1/3 (A cada 33% do tempo)</option>
                  <option value="1/5">1/5 (A cada 20% do tempo)</option>
                  <option value="1/2">1/2 (A cada 50% do tempo)</option>
                  <option value="1/4">1/4 (A cada 25% do tempo)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 ml-4 cursor-pointer text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={considerarRecorrencia}
                  onChange={e => setConsiderarRecorrencia(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500/40"
                />
                <span className="text-[11px] font-bold uppercase tracking-wider">CONSIDERAR FREQUÊNCIA DE RECORRÊNCIA</span>
              </label>
            </div>

            {/* BOTÃO TOGGLE DE ATIVAÇÃO PERIÓDICA */}
            <button
              onClick={handleToggleAtivacaoPeriodica}
              className={`px-6 py-3.5 font-black uppercase tracking-wider rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-xs flex items-center gap-2 ${
                isPeriodicActivationActive
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isPeriodicActivationActive ? (
                <>
                  <span>🛑</span> DESATIVAR ATIVAÇÃO PERIÓDICA
                </>
              ) : (
                <>
                  <span>🚀</span> EXECUTAR ATIVAÇÃO INTELIGENTE
                </>
              )}
            </button>
          </div>

          {activationFeedback && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs font-bold text-amber-300 animate-in fade-in duration-300 flex items-center gap-2">
              <span>{activationFeedback}</span>
            </div>
          )}
        </div>

        {/* MÉTRICAS (GRID DE CARDS TOTAL, EM ABERTO, CONCLUÍDAS, FALHAS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-white">{totalCount}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">TOTAL</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-amber-400">{emAbertoCount}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">EM ABERTO</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-emerald-400">{concluidasCount}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">CONCLUÍDAS</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-rose-400">{falhasCount}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">FALHAS</span>
          </div>
        </div>

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="p-4 rounded-2xl bg-[#111827] border border-[#1f2937] flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#0b1120] text-white placeholder-slate-500 text-xs font-medium pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#0b1120] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="TODOS">Todos Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Concluído">Concluído</option>
            </select>

            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
              className="bg-[#0b1120] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="TODOS">Todos Tipos</option>
              <option value="Normal">Normal</option>
              <option value="Manutenção">Manutenção</option>
              <option value="Organização">Organização</option>
              <option value="Infra">Infra</option>
              <option value="Intervalo">Intervalo</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-[#0b1120] border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="RECENTE">↕ Recente</option>
              <option value="PRIORIDADE">⭐ Prioridade</option>
              <option value="INERCIA">⏳ Maior Inércia</option>
            </select>
          </div>
        </div>

        {/* MODO CARDS / FEED INTERATIVO */}
        {viewMode === 'CARDS' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredTasks.map(t => (
              <div
                key={t.id}
                className={`p-6 rounded-3xl border transition-all duration-300 relative flex flex-col justify-between ${
                  t.isAdiada
                    ? 'bg-[#180e29]/70 border-purple-500/30 opacity-75'
                    : (isPeriodicActivationActive && t.isAtivadaPeriodica)
                    ? 'bg-gradient-to-b from-[#1e1b4b]/60 to-[#0f172a] border-amber-500/40 shadow-xl shadow-amber-500/5'
                    : 'bg-[#111827] border-[#1f2937] hover:border-slate-700'
                }`}
              >
                {/* BOTÕES DE AÇÕES NO TOPO DO CARD (EDITAR E EXCLUIR) */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight ${getCategoryBadgeClass(t.categoria)}`}>
                      {t.categoria}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {t.classe}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 z-10">
                    <button
                      onClick={() => handleOpenEditModal(t)}
                      className="p-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition-all text-xs"
                      title="Editar Tarefa"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t)}
                      className="p-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 transition-all text-xs"
                      title="Excluir Tarefa"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {t.isAdiada ? (
                  <div className="mb-2 inline-flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit">
                    <span>⏩ Tarefa Adiada (Fila Final)</span>
                  </div>
                ) : (isPeriodicActivationActive && t.isAtivadaPeriodica) ? (
                  <div className="mb-2 inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit">
                    <span>⚡ Ativação Periódica</span>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-base font-black text-white mb-2 leading-snug">{t.nome}</h3>
                  
                  <div className="space-y-1 mb-4 bg-[#0b1120] p-3 rounded-2xl border border-slate-800 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 font-bold text-[10px] uppercase">Início:</span>
                      <span>{t.inicioData ? new Date(t.inicioData).toLocaleString('pt-BR') : 'Nulo (Sem Horário Fixo)'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#38bdf8] font-bold">
                      <span className="text-slate-400 font-bold text-[10px] uppercase">Término:</span>
                      <span>{t.terminoCalculado}</span>
                    </div>
                  </div>

                  <div className="mb-4 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs font-bold text-purple-300 flex items-center gap-2">
                    <span>🤖 Lembrete IA ({reminderFraction}):</span>
                    <span className="text-white font-mono text-[11px]">{t.lembreteIa}</span>
                  </div>

                  <div className="mb-4 space-y-1.5 bg-[#0b1120] p-3 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Subtarefas ({t.subtarefas.concluidas}/{t.subtarefas.total})
                    </span>
                    {t.subtarefas.itens.map((sub, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{sub}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4 text-xs font-medium text-emerald-400 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Propriedades Ganhas</span>
                    {t.propriedadesGanhas}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {t.status === 'Pendente' && !t.isAdiada && (
                    <button
                      onClick={() => handlePostponeTask(t.id)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 transition-all"
                    >
                      ⏩ Adiar
                    </button>
                  )}
                  <button
                    onClick={() => toggleTaskStatus(t.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${getStatusBadgeClass(t.status)}`}
                  >
                    {t.status}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* MODO SPREADSHEET */
          <div className="overflow-x-auto bg-[#111827] text-slate-200 rounded-2xl border border-[#1f2937] no-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1f2937] text-slate-300 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-700">
                  <th className="py-3 px-3 border-r border-slate-700 text-center w-12">ID</th>
                  <th className="py-3 px-4 border-r border-slate-700 min-w-[180px]">NOME DA TAREFA</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[130px]">CATEGORIA</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[100px]">TIPO</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[90px]">CLASSE</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[130px]">LOCALIDADE</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[160px]">RECORRÊNCIA</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[180px]">TÉRMINO CALCULADO</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[160px]">LEMBRETE IA (1/N)</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[110px]">STATUS</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[100px]">DURAÇÃO EST.</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[90px] text-center">QUANT. FEITA</th>
                  <th className="py-3 px-4 border-r border-slate-700 min-w-[200px]">SUBTAREFAS (Progresso)</th>
                  <th className="py-3 px-4 border-r border-slate-700 min-w-[220px]">PROPRIEDADES GANHAS</th>
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[130px]">INÉRCIA ATUAL</th>
                  <th className="py-3 px-4 border-r border-slate-700 min-w-[150px]">NOTAS</th>
                  <th className="py-3 px-3 min-w-[100px] text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[12px] font-medium">
                {filteredTasks.map((t, idx) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      t.isAdiada ? 'bg-purple-950/20' : (isPeriodicActivationActive && t.isAtivadaPeriodica) ? 'bg-amber-500/5' : idx % 2 === 0 ? 'bg-[#111827]' : 'bg-[#0f172a]'
                    }`}
                  >
                    <td className="py-2.5 px-3 border-r border-slate-800 text-center font-bold text-slate-400">{t.id}</td>
                    <td className="py-2.5 px-4 border-r border-slate-800 font-bold text-white flex items-center gap-2">
                      {t.isAdiada ? <span className="text-purple-400 text-xs">⏩</span> : (isPeriodicActivationActive && t.isAtivadaPeriodica) && <span className="text-amber-400 text-xs">⚡</span>}
                      <span>{t.nome}</span>
                    </td>
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
                    <td className="py-2.5 px-3 border-r border-slate-800 font-bold text-[#38bdf8] text-[11px]">
                      {t.terminoCalculado}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800 text-purple-300 font-mono text-[11px]">
                      🤖 {t.lembreteIa}
                    </td>
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
                    <td className="py-2.5 px-4 border-r border-slate-800 text-slate-300 text-[11px] italic">{t.notas}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="p-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-xs"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t)}
                          className="p-1 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all text-xs"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO DE TAREFA */}
      {editingTask && editForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 text-slate-100 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                <span>✏️</span> Editar Tarefa: {editingTask.nome}
              </h2>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setEditForm(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedTask} className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">1. Informações Básicas</h3>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Nome da Tarefa</label>
                  <input
                    type="text"
                    required
                    value={editForm.nome}
                    onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Categoria</label>
                    <select
                      value={editForm.categoria}
                      onChange={e => setEditForm({ ...editForm, categoria: e.target.value as any })}
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
                      value={editForm.classe}
                      onChange={e => setEditForm({ ...editForm, classe: e.target.value as any })}
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
                      value={editForm.tipo}
                      onChange={e => setEditForm({ ...editForm, tipo: e.target.value as any })}
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

              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">2. Tempo e Lembrete</h3>

                <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Horário de Início</label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-400 font-bold">
                      <input
                        type="checkbox"
                        checked={editForm.inicioNulo}
                        onChange={e => setEditForm({ ...editForm, inicioNulo: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500"
                      />
                      <span>Início Nulo (Sem Horário Fixo)</span>
                    </label>
                  </div>

                  {!editForm.inicioNulo && (
                    <input
                      type="datetime-local"
                      value={editForm.inicioData}
                      onChange={e => setEditForm({ ...editForm, inicioData: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Duração Estimada</label>
                      <input
                        type="text"
                        placeholder="ex: 30m, 1h 30m, 72h"
                        value={editForm.duracaoEst}
                        onChange={e => setEditForm({ ...editForm, duracaoEst: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Término Calculado (Automático)</label>
                      <div className="w-full bg-slate-800/90 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-[#38bdf8] font-bold font-mono">
                        {calculateTermino(editForm.inicioNulo ? null : editForm.inicioData, editForm.duracaoEst)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                    🤖 Lembrete IA
                  </label>
                  <select
                    value={editForm.lembreteIa}
                    onChange={e => setEditForm({ ...editForm, lembreteIa: e.target.value })}
                    className="w-full bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-purple-300 font-bold focus:outline-none focus:border-purple-400"
                  >
                    <option value="A cada 15 min">Lembrar a cada 15 minutos</option>
                    <option value="A cada 30 min">Lembrar a cada 30 minutos</option>
                    <option value="A cada 1 hora">Lembrar a cada 1 hora</option>
                    <option value="A cada 2 horas">Lembrar a cada 2 horas</option>
                    <option value="A cada 4 horas">Lembrar a cada 4 horas</option>
                    <option value="Desativado">Desativado</option>
                  </select>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">3. Contexto e Subtarefas</h3>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Localidade</label>
                  <input
                    type="text"
                    value={editForm.localidade}
                    onChange={e => setEditForm({ ...editForm, localidade: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Subtarefas (até 5)</label>
                  <div className="space-y-2">
                    {editForm.subtasksInput.map((sub, idx) => (
                      <input
                        key={idx}
                        type="text"
                        placeholder={`Subtarefa ${idx + 1}`}
                        value={sub}
                        onChange={e => {
                          const updated = [...editForm.subtasksInput];
                          updated[idx] = e.target.value;
                          setEditForm({ ...editForm, subtasksInput: updated });
                        }}
                        className="w-full bg-slate-900 border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">4. Resultados e Notas</h3>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Propriedades Ganhas</label>
                  <input
                    type="text"
                    value={editForm.propriedadesGanhas}
                    onChange={e => setEditForm({ ...editForm, propriedadesGanhas: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Observações / Notas</label>
                  <textarea
                    value={editForm.notas}
                    onChange={e => setEditForm({ ...editForm, notas: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setEditForm(null);
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE NOVA TAREFA COM MINI CALENDÁRIO INTERATIVO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 text-slate-100 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                <span>✨</span> Criar Nova Tarefa
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setViewDayTimeline(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
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

              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
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

                <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Horário de Início</label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-400 font-bold">
                      <input
                        type="checkbox"
                        checked={newTaskForm.inicioNulo}
                        onChange={e => setNewTaskForm({ ...newTaskForm, inicioNulo: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500"
                      />
                      <span>Início Nulo (Sem Horário Fixo)</span>
                    </label>
                  </div>

                  {!newTaskForm.inicioNulo && (
                    <input
                      type="datetime-local"
                      value={newTaskForm.inicioData}
                      onChange={e => setNewTaskForm({ ...newTaskForm, inicioData: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Duração Estimada</label>
                      <input
                        type="text"
                        placeholder="ex: 30m, 1h 30m, 72h"
                        value={newTaskForm.duracaoEst}
                        onChange={e => setNewTaskForm({ ...newTaskForm, duracaoEst: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Término Calculado (Automático)</label>
                      <div className="w-full bg-slate-800/90 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-[#38bdf8] font-bold font-mono">
                        {calculateTermino(newTaskForm.inicioNulo ? null : newTaskForm.inicioData, newTaskForm.duracaoEst)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                    🤖 Lembrete IA (Notificação & Chamada Contínua)
                  </label>
                  <select
                    value={newTaskForm.lembreteIa}
                    onChange={e => setNewTaskForm({ ...newTaskForm, lembreteIa: e.target.value })}
                    className="w-full bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-purple-300 font-bold focus:outline-none focus:border-purple-400"
                  >
                    <option value="A cada 15 min">Lembrar a cada 15 minutos</option>
                    <option value="A cada 30 min">Lembrar a cada 30 minutos</option>
                    <option value="A cada 1 hora">Lembrar a cada 1 hora</option>
                    <option value="A cada 2 horas">Lembrar a cada 2 horas</option>
                    <option value="A cada 4 horas">Lembrar a cada 4 horas</option>
                    <option value="Desativado">Desativado</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                        {viewDayTimeline !== null ? `📅 Timeline do Dia ${viewDayTimeline}` : '📅 Agenda do Mês (Dê 2 cliques para ver horários)'}
                      </span>
                    </div>

                    {viewDayTimeline !== null ? (
                      <button
                        type="button"
                        onClick={() => setViewDayTimeline(null)}
                        className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-blue-500/40"
                      >
                        ← Voltar ao Calendário
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-blue-500" /> Recorrência Fixa
                        </span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-rose-500" /> Recorrência Flexível
                        </span>
                      </div>
                    )}
                  </div>

                  {viewDayTimeline !== null ? (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {hoursArray.map(hour => (
                        <div key={hour} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs">
                          <span className="font-mono font-bold text-blue-400 w-12">{hour}</span>
                          <div className="flex-1 flex flex-wrap gap-2">
                            {tasks.slice(0, 2).map(t => (
                              <div key={t.id} className="bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>{t.nome}</span>
                                <span className="text-[9px] text-slate-400 font-mono">({t.duracaoEst})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                        <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {generateCalendarDays().map(item => (
                          <div
                            key={item.day}
                            onClick={() => setViewDayTimeline(item.day)}
                            onDoubleClick={() => setViewDayTimeline(item.day)}
                            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-blue-900/40 hover:border-blue-500/50 cursor-pointer border border-slate-700/40 text-center flex flex-col items-center justify-between min-h-[38px] transition-all group"
                          >
                            <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">{item.day}</span>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {item.exataCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />}
                              {item.flexivelCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
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

              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
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
                  onClick={() => {
                    setShowCreateModal(false);
                    setViewDayTimeline(null);
                  }}
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
