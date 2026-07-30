import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus =
  | 'em_aberto'
  | 'pendente'
  | 'concluido'
  | 'concluido_fora'
  | 'adiado'
  | 'nao_concluido'
  | 'falhou';

type TaskType = 'manutencao' | 'normal' | 'organizacao' | 'infra' | 'intervalo';
type TaskClass = 'A' | 'B' | 'C';
type RecurrenceMode = 'exata' | 'flexivel' | 'unica';

interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  name: string;
  category: string;
  status: TaskStatus;
  taskClass: TaskClass;
  taskType: TaskType;
  recurrenceMode: RecurrenceMode;
  recurrenceExactTime?: string;
  recurrenceExactDays?: string[];
  recurrenceFlexHours?: number;
  timesCompleted: number;
  estimatedMinutes: number;
  lastCompletedAt?: string;
  locality: string;
  subtasks: Subtask[];
  rewards: string;
  notes: string;
  createdAt: string;
  user_id?: string;
  isPeriodicallyActive?: boolean;
  scheduledAt?: string; // Data e hora distribuída na agenda
  startTime?: string;   // Data/Hora de Início (ISO string)
  endTime?: string;     // Data/Hora de Término calculada (ISO string)
  reminderMinutes?: number; // Lembrete IA a cada X minutos
}

interface TasksTabProps {
  user?: any;
  initialMode?: 'table' | 'cards';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; icon: string }> = {
  em_aberto:      { label: 'Em Aberto',            color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300',   icon: '🔵' },
  pendente:       { label: 'Pendente',              color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300', icon: '⏳' },
  concluido:      { label: 'Concluído',             color: 'text-emerald-400',bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300', icon: '✅' },
  concluido_fora: { label: 'Fora do Prazo',          color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30 text-orange-300', icon: '⚠️' },
  adiado:         { label: 'Adiado',                color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30 text-purple-300', icon: '⏭️' },
  nao_concluido:  { label: 'Não Concluído',         color: 'text-rose-400',   bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',   icon: '❌' },
  falhou:         { label: 'Falhou',                color: 'text-slate-400',  bg: 'bg-slate-500/15 border-slate-500/30 text-slate-300', icon: '💀' },
};

const TYPE_META: Record<TaskType, { label: string; icon: string; color: string; bg: string }> = {
  manutencao:  { label: 'Manutenção',  icon: '🔧', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' },
  normal:      { label: 'Normal',      icon: '📝', color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/20' },
  organizacao: { label: 'Organização', icon: '📦', color: 'text-teal-300', bg: 'bg-teal-500/10 border-teal-500/20' },
  infra:       { label: 'Infra',       icon: '🏗️', color: 'text-indigo-300', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  intervalo:   { label: 'Intervalo',   icon: '🎮', color: 'text-pink-300', bg: 'bg-pink-500/10 border-pink-500/20' },
};

const CLASS_META: Record<TaskClass, { label: string; color: string; bg: string }> = {
  A: { label: 'Classe A', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  B: { label: 'Classe B', color: 'text-amber-300',   bg: 'bg-amber-500/15 border-amber-500/30' },
  C: { label: 'Classe C', color: 'text-slate-300',   bg: 'bg-slate-500/15 border-slate-500/30' },
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const genId = () => Math.random().toString(36).slice(2, 10);

const elapsedSince = (isoDate?: string): string => {
  if (!isoDate) return '--';
  const diff = Date.now() - new Date(isoDate).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m sem fazer`;
};

const blankTask = (): Omit<Task, 'id' | 'createdAt'> => {
  const now = new Date();
  const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const endIso = new Date(now.getTime() + 15 * 60000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return {
    name: '',
    category: '',
    status: 'em_aberto',
    taskClass: 'B',
    taskType: 'normal',
    recurrenceMode: 'unica',
    recurrenceExactTime: '',
    recurrenceExactDays: [],
    recurrenceFlexHours: 24,
    timesCompleted: 0,
    estimatedMinutes: 15,
    lastCompletedAt: undefined,
    locality: '',
    subtasks: [],
    rewards: '',
    notes: '',
    startTime: nowIso,
    endTime: endIso,
    reminderMinutes: 60,
  };
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1.5">{children}</p>
);

const InertiaClock: React.FC<{ lastCompletedAt?: string }> = ({ lastCompletedAt }) => {
  const [elapsed, setElapsed] = useState(elapsedSince(lastCompletedAt));
  useEffect(() => {
    const t = setInterval(() => setElapsed(elapsedSince(lastCompletedAt)), 60000);
    return () => clearInterval(t);
  }, [lastCompletedAt]);
  return <span>{elapsed}</span>;
};

// ─── Mini Calendar Component for Form ──────────────────────────────────────────

const MiniCalendar: React.FC<{ scheduledTasks: Task[]; currentForm?: Partial<Task> }> = ({ scheduledTasks, currentForm }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timelineDay, setTimelineDay] = useState<number | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const daysArray = [];
  for (let i = 0; i < firstDay; i++) daysArray.push(null);
  for (let d = 1; d <= daysInMonth; d++) daysArray.push(d);

  // Inclui as tarefas salvas + o rascunho da tarefa atual sendo configurada no formulário
  const allTasksPool = [...scheduledTasks];
  if (currentForm && currentForm.name) {
    allTasksPool.push({
      id: 'draft',
      name: currentForm.name || 'Nova Tarefa (Rascunho)',
      category: currentForm.category || '',
      status: currentForm.status || 'em_aberto',
      taskClass: currentForm.taskClass || 'B',
      taskType: currentForm.taskType || 'normal',
      recurrenceMode: currentForm.recurrenceMode || 'unica',
      recurrenceExactTime: currentForm.recurrenceExactTime,
      recurrenceExactDays: currentForm.recurrenceExactDays || [],
      recurrenceFlexHours: currentForm.recurrenceFlexHours,
      timesCompleted: 0,
      estimatedMinutes: currentForm.estimatedMinutes || 15,
      locality: currentForm.locality || '',
      subtasks: currentForm.subtasks || [],
      rewards: currentForm.rewards || '',
      notes: currentForm.notes || '',
      createdAt: new Date().toISOString(),
      startTime: currentForm.startTime,
      endTime: currentForm.endTime,
      scheduledAt: currentForm.startTime,
    });
  }

  // Se o usuário deu duplo clique em um dia, mostra a linha do tempo de 24h (00:00 - 23:00)
  if (timelineDay !== null) {
    const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(timelineDay).padStart(2, '0')}`;
    const dayTasks = allTasksPool.filter(t => {
      if (t.startTime && t.startTime.startsWith(selectedDateStr)) return true;
      if (t.scheduledAt && t.scheduledAt.startsWith(selectedDateStr)) return true;
      return false;
    });

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');

    return (
      <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <span className="text-xs font-black text-blue-300 uppercase">
            📅 Timeline ({timelineDay} {monthNames[month].slice(0,3)})
          </span>
          <button
            onClick={() => setTimelineDay(null)}
            className="px-2.5 py-1 rounded bg-blue-600/30 border border-blue-500/40 text-[9px] font-black text-blue-200 uppercase hover:bg-blue-600/50"
          >
            ← Voltar
          </button>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
          {hours.map(h => {
            const tasksAtHour = dayTasks.filter(t => {
              const taskStart = t.startTime || t.scheduledAt || '';
              const taskHour = taskStart.slice(11, 13) + ':00';
              return taskHour === h;
            });

            return (
              <div key={h} className="flex items-start gap-2 border-b border-white/5 py-1">
                <span className="w-12 text-white/40 font-bold">{h}</span>
                <div className="flex-1 min-h-[20px]">
                  {tasksAtHour.length > 0 ? (
                    tasksAtHour.map(t => (
                      <div key={t.id} className="bg-blue-600/20 border border-blue-500/40 px-2 py-1 rounded text-blue-200 font-sans font-bold text-[10px] mb-1 flex justify-between items-center">
                        <span>📋 {t.name}</span>
                        <span className="text-[9px] text-blue-300/60 font-mono">{t.estimatedMinutes}m</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-white/10 text-[9px]">-- livre --</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-blue-300 uppercase">{monthNames[month]} {year}</span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-xs text-white"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-xs text-white"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-black text-white/40 uppercase">
        <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px]">
        {daysArray.map((day, idx) => {
          if (!day) return <div key={idx} className="h-6" />;
          
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const currentCellDate = new Date(year, month, day);
          const dayOfWeekStr = currentCellDate.getDay().toString();

          // PROJEÇÃO RIGOROSA: Apenas dias estritamente válidos possuem o ponto!
          const fixedTasks = allTasksPool.filter(t => {
            if (t.recurrenceMode === 'exata') {
              return (t.recurrenceExactDays || []).includes(dayOfWeekStr);
            }
            return (t.startTime && t.startTime.startsWith(dateStr)) || (t.scheduledAt && t.scheduledAt.startsWith(dateStr));
          });

          const flexTasks = allTasksPool.filter(t => {
            if (t.recurrenceMode !== 'flexivel') return false;
            
            // Se tiver data de início, calcula a repetição a cada X horas
            if (t.startTime) {
              const startMs = new Date(t.startTime).getTime();
              const cellMs = currentCellDate.getTime();
              const flexMs = (t.recurrenceFlexHours || 24) * 60 * 60 * 1000;
              if (cellMs >= startMs) {
                const diffMs = cellMs - startMs;
                return Math.floor(diffMs / flexMs) * flexMs <= diffMs && diffMs < (Math.floor(diffMs / flexMs) + 1) * flexMs;
              }
            }
            return (t.scheduledAt && t.scheduledAt.startsWith(dateStr));
          });

          const hasFixed = fixedTasks.length > 0;
          const hasFlex = flexTasks.length > 0;

          return (
            <div
              key={idx}
              onDoubleClick={() => setTimelineDay(day)}
              title="Clique duas vezes para ver horários (00:00 - 23:00)"
              className="h-7 border border-white/5 rounded flex flex-col items-center justify-center relative bg-white/3 cursor-pointer hover:bg-white/10 transition-all select-none"
            >
              <span className="opacity-70 text-[9px]">{day}</span>
              <div className="flex gap-0.5 mt-0.5">
                {hasFixed && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.8)]" title="Horário Fixo" />}
                {hasFlex && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]" title="Flexível" />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-around pt-2 border-t border-white/5 text-[8px] uppercase font-bold">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Horário Fixo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Recorrência Flexível</span>
      </div>
    </div>
  );
};

// ─── Task Form Modal ──────────────────────────────────────────────────────────

interface TaskFormProps {
  initial?: Task;
  allTasks?: Task[];
  onSave: (task: Task) => void;
  onClose: () => void;
}

const TaskFormModal: React.FC<TaskFormProps> = ({ initial, allTasks = [], onSave, onClose }) => {
  const [form, setForm] = useState<Omit<Task, 'id' | 'createdAt'>>(
    initial ? { ...initial } : blankTask()
  );
  const [subtaskInput, setSubtaskInput] = useState('');
  const [activeSection, setActiveSection] = useState<'main' | 'time' | 'context' | 'metrics'>('main');

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // Função para recalcular horário de término dinamicamente
  const handleDurationOrStartChange = (newStart?: string, newMinutes?: number) => {
    const start = newStart !== undefined ? newStart : form.startTime;
    const duration = newMinutes !== undefined ? newMinutes : form.estimatedMinutes;

    if (start) {
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + (duration || 0) * 60000);
      const endIso = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setForm(prev => ({ ...prev, startTime: start, estimatedMinutes: duration, endTime: endIso }));
    } else {
      setForm(prev => ({ ...prev, estimatedMinutes: duration }));
    }
  };

  const addSubtask = () => {
    if (!subtaskInput.trim() || form.subtasks.length >= 5) return;
    set('subtasks', [...form.subtasks, { id: genId(), title: subtaskInput.trim(), done: false }]);
    setSubtaskInput('');
  };

  const toggleSubtask = (id: string) =>
    set('subtasks', form.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s));

  const removeSubtask = (id: string) =>
    set('subtasks', form.subtasks.filter(s => s.id !== id));

  const save = () => {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      id: initial?.id || genId(),
      createdAt: initial?.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-4xl bg-[#131722] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black tracking-tighter text-white">
                {initial ? '✏️ Editar Tarefa' : '➕ Nova Tarefa'}
              </h2>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Gerenciador de Tarefas Sincronizado</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">✕</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['main', 'time', 'context', 'metrics'] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  activeSection === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'opacity-40 hover:opacity-70 text-white'
                }`}
              >
                {s === 'main' ? '📋 Dados Principais' : s === 'time' ? '⏱️ Frequência & Tempo' : s === 'context' ? '📍 Contexto & Subtarefas' : '📊 Métricas & Ganho'}
              </button>
            ))}
          </div>
        </div>

        {/* Body com Grid Principal (Formulário + Mini Calendário na Direita) */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lado Esquerdo / Centro: Formulário Principal (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {activeSection === 'main' && (
                <>
                  <div>
                    <FieldLabel>Nome da Tarefa *</FieldLabel>
                    <input
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      placeholder="Ex: Treino de Musculação, Limpar Pia..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Categoria</FieldLabel>
                      <input
                        value={form.category}
                        onChange={e => set('category', e.target.value)}
                        placeholder="Ex: Saúde/Fitness, Casa, Trabalho"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-all"
                      />
                    </div>
                    <div>
                      <FieldLabel>Localidade</FieldLabel>
                      <input
                        value={form.locality}
                        onChange={e => set('locality', e.target.value)}
                        placeholder="Ex: Academia, Banheiro, Cozinha"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Status Atual</FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(Object.entries(STATUS_META) as [TaskStatus, typeof STATUS_META[TaskStatus]][]).map(([key, meta]) => (
                        <button
                          key={key}
                          onClick={() => set('status', key)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                            form.status === key ? `${meta.bg} font-black border-current shadow-md` : 'bg-white/5 border-white/5 opacity-40 hover:opacity-80 text-white'
                          }`}
                        >
                          <span>{meta.icon}</span>
                          <span className="text-[10px] font-bold truncate">{meta.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Classe / Prioridade</FieldLabel>
                    <div className="flex gap-3">
                      {(['A', 'B', 'C'] as TaskClass[]).map(c => (
                        <button
                          key={c}
                          onClick={() => set('taskClass', c)}
                          className={`flex-1 py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${
                            form.taskClass === c ? `${CLASS_META[c].bg} ${CLASS_META[c].color} border-current` : 'bg-white/5 border-white/5 opacity-40 hover:opacity-70 text-white'
                          }`}
                        >
                          {CLASS_META[c].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Tipo de Tarefa</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(TYPE_META) as [TaskType, typeof TYPE_META[TaskType]][]).map(([key, meta]) => (
                        <button
                          key={key}
                          onClick={() => set('taskType', key)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                            form.taskType === key ? `bg-blue-600/30 border-blue-500/50 text-blue-200` : 'bg-white/5 border-white/5 text-white/40 hover:text-white/80'
                          }`}
                        >
                          <span>{meta.icon}</span>{meta.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'time' && (
                <>
                  {/* Datas de Início e Término Calculado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div>
                      <FieldLabel>Horário / Data de Início</FieldLabel>
                      <input
                        type="datetime-local"
                        value={form.startTime || ''}
                        onChange={e => handleDurationOrStartChange(e.target.value, form.estimatedMinutes)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/60 transition-all font-mono"
                      />
                      <button
                        onClick={() => handleDurationOrStartChange('', form.estimatedMinutes)}
                        className="text-[9px] text-white/40 hover:text-rose-400 mt-1 uppercase font-bold"
                      >
                        Limpar Início (Tornar Nulo)
                      </button>
                    </div>

                    <div>
                      <FieldLabel>Horário / Data de Término (Calculado)</FieldLabel>
                      <div className="w-full bg-blue-600/10 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-blue-200 font-mono font-bold">
                        {form.endTime ? new Date(form.endTime).toLocaleString('pt-BR') : 'Sem Término'}
                      </div>
                      <p className="text-[9px] text-blue-300/60 mt-1 italic">Calculado automaticamente via Duração Estimada</p>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Modo de Recorrência</FieldLabel>
                    <div className="flex gap-3">
                      {([['unica', '1x Única'], ['exata', '📅 Exata (Fixo)'], ['flexivel', '🔄 Flexível']] as [RecurrenceMode, string][]).map(([m, label]) => (
                        <button
                          key={m}
                          onClick={() => set('recurrenceMode', m)}
                          className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${
                            form.recurrenceMode === m ? 'bg-blue-600/30 border-blue-500/50 text-blue-200' : 'bg-white/5 border-white/5 text-white/40 hover:text-white/80'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.recurrenceMode === 'exata' && (
                    <div className="space-y-4">
                      <div>
                        <FieldLabel>Horário Fixo Diário</FieldLabel>
                        <input
                          type="time"
                          value={form.recurrenceExactTime || ''}
                          onChange={e => set('recurrenceExactTime', e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldLabel>Dias Fixos</FieldLabel>
                        <div className="flex gap-2 flex-wrap">
                          {WEEKDAYS.map((d, i) => {
                            const key = String(i);
                            const active = (form.recurrenceExactDays || []).includes(key);
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  const current = form.recurrenceExactDays || [];
                                  set('recurrenceExactDays', active ? current.filter(x => x !== key) : [...current, key]);
                                }}
                                className={`w-10 h-10 rounded-xl text-[10px] font-black border transition-all ${
                                  active ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                              >{d}</button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {form.recurrenceMode === 'flexivel' && (
                    <div>
                      <FieldLabel>Intervalo de Recorrência (Horas)</FieldLabel>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min={1}
                          value={form.recurrenceFlexHours || 24}
                          onChange={e => set('recurrenceFlexHours', Number(e.target.value))}
                          className="w-28 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all font-mono"
                        />
                        <span className="text-white/50 text-sm">horas (Ex: A cada 24h)</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Duração Estimada (minutos ou horas)</FieldLabel>
                      <input
                        type="number"
                        min={1}
                        value={form.estimatedMinutes}
                        onChange={e => handleDurationOrStartChange(undefined, Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all font-mono"
                      />
                    </div>

                    <div>
                      <FieldLabel>🔔 Lembrete IA (Reminder a cada X min)</FieldLabel>
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={form.reminderMinutes || 60}
                        onChange={e => set('reminderMinutes', Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500/60 transition-all"
                      />
                      <p className="text-[9px] text-amber-300/60 mt-1">IA lembra a cada X min em ligação ou notificação</p>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'context' && (
                <>
                  <div>
                    <FieldLabel>Subtarefas / Passos ({form.subtasks.length}/5)</FieldLabel>
                    <div className="space-y-2 mb-3">
                      {form.subtasks.map(s => (
                        <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl">
                          <button onClick={() => toggleSubtask(s.id)} className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${s.done ? 'bg-emerald-500 border-emerald-400' : 'bg-white/10 border-white/20'}`}>
                            {s.done && <span className="text-[10px] text-white font-black">✓</span>}
                          </button>
                          <span className={`flex-1 text-sm ${s.done ? 'line-through opacity-40' : 'text-white/90'}`}>{s.title}</span>
                          <button onClick={() => removeSubtask(s.id)} className="text-white/30 hover:text-rose-400 transition-all text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                    {form.subtasks.length < 5 && (
                      <div className="flex gap-2">
                        <input
                          value={subtaskInput}
                          onChange={e => setSubtaskInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addSubtask()}
                          placeholder="Adicionar subpasso..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-all"
                        />
                        <button onClick={addSubtask} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all">+</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <FieldLabel>Propriedades Ganhas / Recompensas</FieldLabel>
                    <input
                      value={form.rewards}
                      onChange={e => set('rewards', e.target.value)}
                      placeholder="Ex: +Força Muscular, +Alimento Armazenado..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-all"
                    />
                  </div>

                  <div>
                    <FieldLabel>Notas / Observações</FieldLabel>
                    <textarea
                      value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      rows={4}
                      placeholder="Anotações sobre a tarefa..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-all resize-none"
                    />
                  </div>
                </>
              )}

              {activeSection === 'metrics' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Quantidade Feita</p>
                      <p className="text-3xl font-black text-white">{form.timesCompleted}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Duração Est.</p>
                      <p className="text-3xl font-black text-white">{form.estimatedMinutes}<span className="text-sm text-white/40">m</span></p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-2xl p-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-2">⏱️ Inércia Atual (Tempo Sem Fazer)</p>
                    <p className="text-2xl font-black text-amber-300">
                      <InertiaClock lastCompletedAt={form.lastCompletedAt} />
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Lado Direito: Mini Calendário da Agenda para Orientação Visual */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">📅 Agenda Atual & Projeção</p>
              <MiniCalendar scheduledTasks={allTasks} currentForm={form} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 flex gap-3 bg-slate-900/50">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-[10px] font-black uppercase tracking-widest transition-all">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!form.name.trim()}
            className="flex-1 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all"
          >
            {initial ? 'Atualizar Tarefa' : 'Salvar Tarefa'} ✨
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Local Storage Helper ─────────────────────────────────────────────────────

const STORAGE_KEY = 'tasks_v1';

const loadLocalTasks = (): Task[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

const saveLocalTasks = (tasks: Task[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

type FilterStatus = 'all' | 'periodic' | TaskStatus;
type SortMode = 'created' | 'class' | 'status' | 'category' | 'inertia';

// ─── Main TasksTab Component ──────────────────────────────────────────────────

export const TasksTab: React.FC<TasksTabProps> = ({ user, initialMode = 'table' }) => {
  const [tasks, setTasks] = useState<Task[]>(loadLocalTasks);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('created');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(initialMode);
  const [cardsLayout, setCardsLayout] = useState<'grid' | 'feed'>('grid');

  // Configuração da Ativação Periódica
  const [periodicCount, setPeriodicCount] = useState<number>(5);
  const [periodicHours, setPeriodicHours] = useState<number>(24);
  const [considerRecurrence, setConsiderRecurrence] = useState<boolean>(true);
  const [showPeriodicSettings, setShowPeriodicSettings] = useState<boolean>(false);

  useEffect(() => {
    setViewMode(initialMode);
  }, [initialMode]);

  // Sync Supabase tasks
  const fetchSupabaseTasks = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted: Task[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || '',
        status: item.status || 'em_aberto',
        taskClass: item.task_class || 'B',
        taskType: item.task_type || 'normal',
        recurrenceMode: item.recurrence_mode || 'unica',
        recurrenceExactTime: item.recurrence_exact_time,
        recurrenceExactDays: item.recurrence_exact_days || [],
        recurrenceFlexHours: item.recurrence_flex_hours,
        timesCompleted: item.times_completed || 0,
        estimatedMinutes: item.estimated_minutes || 15,
        lastCompletedAt: item.last_completed_at,
        locality: item.locality || '',
        subtasks: item.subtasks || [],
        rewards: item.rewards || '',
        notes: item.notes || '',
        createdAt: item.created_at,
        user_id: item.user_id,
        isPeriodicallyActive: item.is_periodically_active || false,
        scheduledAt: item.scheduled_at,
        startTime: item.start_time,
        endTime: item.end_time,
        reminderMinutes: item.reminder_minutes,
      }));

      setTasks(formatted);
      saveLocalTasks(formatted);
    }
  };

  useEffect(() => {
    fetchSupabaseTasks();

    if (!user) return;
    const channel = supabase
      .channel('realtime_user_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_tasks', filter: `user_id=eq.${user.id}` }, () => {
        fetchSupabaseTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    saveLocalTasks(tasks);
  }, [tasks]);

  // ⚡ ALGORITMO DE SELEÇÃO INTELIGENTE DA IA & DISTRIBUIÇÃO NA AGENDA
  const triggerPeriodicActivation = async () => {
    if (tasks.length === 0) return;

    // 1. Verificar tarefas que já possuem agendamento no período (últimas/próximas X horas)
    const now = Date.now();
    const periodEndMs = now + (periodicHours * 60 * 60 * 1000);

    const alreadyScheduledInPeriod = tasks.filter(t => {
      if (!t.scheduledAt && !t.startTime) return false;
      const targetTime = new Date(t.scheduledAt || t.startTime || '').getTime();
      return targetTime >= now && targetTime <= periodEndMs;
    });

    // Quanto falta para atingir o limite desejado periodicCount
    const remainingSlots = Math.max(0, periodicCount - alreadyScheduledInPeriod.length);

    // 2. Filtrar tarefas elegíveis (não concluídas)
    const pendingTasks = tasks.filter(t => t.status !== 'concluido');
    const pool = pendingTasks.length > 0 ? pendingTasks : tasks;

    // 3. Pontuar cada tarefa com base em Inércia, Prioridade (Classe A > B > C) e Tipo
    const scored = pool.map(t => {
      let score = 0;

      // Pontuação por Classe/Prioridade
      if (t.taskClass === 'A') score += 100;
      else if (t.taskClass === 'B') score += 50;
      else score += 10;

      // Pontuação por Tipo (Manutenção e Infra têm alta relevância)
      if (t.taskType === 'manutencao') score += 40;
      if (t.taskType === 'infra') score += 30;

      // Se considerar frequência de recorrência estiver ATIVADO
      if (considerRecurrence && t.recurrenceMode === 'flexivel' && t.recurrenceFlexHours) {
        // Tarefas de alta frequência (ex: a cada 1 hora) ganham impulso
        score += Math.max(0, (24 / t.recurrenceFlexHours) * 20);
      }

      // Pontuação por Inércia (Tempo sem fazer)
      if (t.lastCompletedAt) {
        const hoursInactive = (Date.now() - new Date(t.lastCompletedAt).getTime()) / (1000 * 60 * 60);
        score += Math.min(hoursInactive * 2, 200);
      } else {
        score += 80;
      }

      return { task: t, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Selecionar as melhores até completar o limite desejado
    const newlySelected = scored.slice(0, remainingSlots).map(s => s.task);
    const allActiveInPeriod = [...alreadyScheduledInPeriod, ...newlySelected];

    const selectedIds = new Set(allActiveInPeriod.map(t => t.id));

    // 4. Distribuir horários na Agenda ao longo do período escolhido
    const intervalMs = (periodicHours * 60 * 60 * 1000) / Math.max(selectedIds.size, 1);
    let currentScheduleTime = Date.now();

    const updated = tasks.map(t => {
      if (selectedIds.has(t.id)) {
        currentScheduleTime += intervalMs;
        const scheduledIso = t.scheduledAt || t.startTime || new Date(currentScheduleTime).toISOString();
        
        if (user && !t.scheduledAt) {
          supabase.from('scheduled_calls').insert({
            user_id: user.id,
            target_time: scheduledIso,
            reason: `[Ativação Periódica] ${t.name}`,
            status: 'scheduled'
          }).then();
        }

        return {
          ...t,
          isPeriodicallyActive: true,
          scheduledAt: scheduledIso,
        };
      }
      return {
        ...t,
        isPeriodicallyActive: false,
      };
    });

    setTasks(updated);
    saveLocalTasks(updated);

    // Persistir no Supabase
    if (user) {
      for (const t of updated) {
        await supabase.from('user_tasks').upsert({
          id: t.id,
          user_id: user.id,
          name: t.name,
          category: t.category,
          status: t.status,
          task_class: t.taskClass,
          task_type: t.taskType,
          recurrence_mode: t.recurrenceMode,
          recurrence_exact_time: t.recurrenceExactTime,
          recurrence_exact_days: t.recurrenceExactDays,
          recurrence_flex_hours: t.recurrenceFlexHours,
          times_completed: t.timesCompleted,
          estimated_minutes: t.estimatedMinutes,
          last_completed_at: t.lastCompletedAt,
          locality: t.locality,
          subtasks: t.subtasks,
          rewards: t.rewards,
          notes: t.notes,
          created_at: t.createdAt,
          is_periodically_active: t.isPeriodicallyActive,
          scheduled_at: t.scheduledAt,
          start_time: t.startTime,
          end_time: t.endTime,
          reminder_minutes: t.reminderMinutes,
        });
      }
    }

    alert(`⚡ Ativação concluída! ${selectedIds.size} tarefas ativas no período de ${periodicHours} horas (incluindo as da agenda).`);
  };

  const upsert = async (task: Task) => {
    const isNew = !tasks.some(t => t.id === task.id);
    const updatedTasks = isNew ? [task, ...tasks] : tasks.map(t => t.id === task.id ? task : t);
    setTasks(updatedTasks);
    saveLocalTasks(updatedTasks);

    if (user) {
      await supabase.from('user_tasks').upsert({
        id: task.id,
        user_id: user.id,
        name: task.name,
        category: task.category,
        status: task.status,
        task_class: task.taskClass,
        task_type: task.taskType,
        recurrence_mode: task.recurrenceMode,
        recurrence_exact_time: task.recurrenceExactTime,
        recurrence_exact_days: task.recurrenceExactDays,
        recurrence_flex_hours: task.recurrenceFlexHours,
        times_completed: task.timesCompleted,
        estimated_minutes: task.estimatedMinutes,
        last_completed_at: task.lastCompletedAt,
        locality: task.locality,
        subtasks: task.subtasks,
        rewards: task.rewards,
        notes: task.notes,
        created_at: task.createdAt,
        is_periodically_active: task.isPeriodicallyActive,
        scheduled_at: task.scheduledAt,
      });
    }
  };

  const deleteTask = async (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    saveLocalTasks(updated);

    if (user) {
      await supabase.from('user_tasks').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  const completeTask = async (id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    const isAlreadyDone = target.status === 'concluido';
    const updatedTask: Task = {
      ...target,
      status: isAlreadyDone ? 'em_aberto' : 'concluido',
      timesCompleted: isAlreadyDone ? target.timesCompleted : target.timesCompleted + 1,
      lastCompletedAt: isAlreadyDone ? target.lastCompletedAt : now,
    };

    upsert(updatedTask);
  };

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))];

  // 🏆 ORDENAÇÃO E FILTRAGEM: Tarefas com Ativação Periódica aparecem no TOPO do feed por padrão!
  const filtered = tasks
    .filter(t => {
      if (filterStatus === 'periodic') return t.isPeriodicallyActive;
      if (filterStatus === 'all') return true;
      return t.status === filterStatus;
    })
    .filter(t => !filterCategory || t.category === filterCategory)
    .filter(t => filterType === 'all' || t.taskType === filterType)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Prioridade máxima para tarefas de Ativação Periódica ficarem no topo do Feed
      if (a.isPeriodicallyActive && !b.isPeriodicallyActive) return -1;
      if (!a.isPeriodicallyActive && b.isPeriodicallyActive) return 1;

      if (sortMode === 'class') return ['A', 'B', 'C'].indexOf(a.taskClass) - ['A', 'B', 'C'].indexOf(b.taskClass);
      if (sortMode === 'status') return a.status.localeCompare(b.status);
      if (sortMode === 'category') return (a.category || '').localeCompare(b.category || '');
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const total = tasks.length;
  const periodicCountActive = tasks.filter(t => t.isPeriodicallyActive).length;
  const done = tasks.filter(t => t.status === 'concluido').length;
  const open = tasks.filter(t => t.status === 'em_aberto' || t.status === 'pendente').length;
  const failed = tasks.filter(t => t.status === 'falhou' || t.status === 'nao_concluido').length;

  return (
    <div className="flex flex-col h-full bg-[#181d29] text-white font-sans overflow-hidden border border-white/10 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl">
      {/* Header Bar / Controls */}
      <div className="p-3 sm:p-6 bg-[#1f2636] border-b border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-lg sm:text-xl shadow-lg flex-shrink-0">
              {viewMode === 'table' ? '📋' : '📊'}
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black tracking-tighter uppercase leading-tight">
                {viewMode === 'table' ? 'PLANILHA GERAL DE TAREFAS' : 'CARDS DE TAREFAS'}
              </h1>
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                {viewMode === 'table' ? 'Visão Ampla em Tabela (DataGrid)' : 'Feed Interativo de Cards'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
            {/* View Mode Selector */}
            <div className="flex bg-white/5 border border-white/10 p-0.5 sm:p-1 rounded-xl">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white shadow' : 'opacity-40 hover:opacity-100'}`}
              >
                📋 Planilha
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'cards' ? 'bg-blue-600 text-white shadow' : 'opacity-40 hover:opacity-100'}`}
              >
                📊 Cards
              </button>
            </div>

            {/* Layout dos Cards (quando no modo cards) */}
            {viewMode === 'cards' && (
              <div className="flex bg-white/5 border border-white/10 p-0.5 sm:p-1 rounded-xl">
                <button
                  onClick={() => setCardsLayout('grid')}
                  className={`px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all ${cardsLayout === 'grid' ? 'bg-indigo-600 text-white shadow' : 'opacity-40 hover:opacity-100'}`}
                  title="Layout em Grade"
                >
                  Grade
                </button>
                <button
                  onClick={() => setCardsLayout('feed')}
                  className={`px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all ${cardsLayout === 'feed' ? 'bg-indigo-600 text-white shadow' : 'opacity-40 hover:opacity-100'}`}
                  title="Layout em Feed (Coluna Única)"
                >
                  Feed
                </button>
              </div>
            )}

            <button
              onClick={() => setShowPeriodicSettings(prev => !prev)}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              ⚡ Ativação Periódica ({periodicCountActive})
            </button>

            <button
              onClick={() => { setEditingTask(undefined); setShowForm(true); }}
              className="flex-1 sm:flex-initial px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 text-center whitespace-nowrap"
            >
              + Nova Tarefa
            </button>
          </div>
        </div>

        {/* Painel Configurador da Ativação Periódica */}
        {showPeriodicSettings && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <span>⚡ Configuração de Ativação Periódica por IA</span>
              </h3>
              <span className="text-[9px] text-amber-300/60 uppercase font-bold">Automação de Produtividade</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Defina quantas tarefas você quer que a IA ative no seu feed e distribua automaticamente na sua agenda ao longo do tempo estipulado.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-200 uppercase">Ativar</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={periodicCount}
                  onChange={e => setPeriodicCount(Math.max(1, Number(e.target.value)))}
                  className="w-16 bg-black/40 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold text-center focus:outline-none"
                />
                <span className="text-[10px] font-bold text-amber-200 uppercase">tarefas</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-200 uppercase">a cada</span>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={periodicHours}
                  onChange={e => setPeriodicHours(Math.max(1, Number(e.target.value)))}
                  className="w-20 bg-black/40 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold text-center focus:outline-none"
                />
                <span className="text-[10px] font-bold text-amber-200 uppercase">horas (Ex: 24h, 48h)</span>
              </div>

              <div className="flex items-center gap-2 border-l border-amber-500/30 pl-4">
                <label className="flex items-center gap-2 text-[10px] font-bold text-amber-200 uppercase cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={considerRecurrence}
                    onChange={e => setConsiderRecurrence(e.target.checked)}
                    className="w-4 h-4 rounded bg-black/40 border-amber-500/40 text-amber-500 focus:ring-0"
                  />
                  <span>Considerar Frequência de Recorrência</span>
                </label>
              </div>

              <button
                onClick={triggerPeriodicActivation}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
              >
                🚀 Executar Ativação Inteligente
              </button>
            </div>
          </div>
        )}

        {/* Top Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Total', val: total, color: 'text-white' },
            { label: 'Em Aberto', val: open, color: 'text-blue-400' },
            { label: 'Concluídas', val: done, color: 'text-emerald-400' },
            { label: 'Falhas', val: failed, color: 'text-rose-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-3 text-center">
              <p className={`text-base sm:text-xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest opacity-40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar..."
            className="col-span-2 sm:flex-1 min-w-0 sm:min-w-[180px] bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 transition-all"
          />

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[9px] sm:text-[10px] font-bold text-white/80 focus:outline-none transition-all truncate"
          >
            <option value="all" className="bg-[#1f2636]">Todos Status</option>
            <option value="periodic" className="bg-[#1f2636] font-bold text-amber-300">⚡ Ativação Periódica</option>
            {(Object.entries(STATUS_META) as [TaskStatus, any][]).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#1f2636]">{v.label}</option>
            ))}
          </select>

          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[9px] sm:text-[10px] font-bold text-white/80 focus:outline-none transition-all truncate"
            >
              <option value="" className="bg-[#1f2636]">Categorias</option>
              {categories.map(c => <option key={c} value={c} className="bg-[#1f2636]">{c}</option>)}
            </select>
          )}

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as TaskType | 'all')}
            className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[9px] sm:text-[10px] font-bold text-white/80 focus:outline-none transition-all truncate"
          >
            <option value="all" className="bg-[#1f2636]">Todos Tipos</option>
            {(Object.entries(TYPE_META) as [TaskType, any][]).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#1f2636]">{v.icon} {v.label}</option>
            ))}
          </select>

          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[9px] sm:text-[10px] font-bold text-white/80 focus:outline-none transition-all truncate sm:ml-auto"
          >
            <option value="created" className="bg-[#1f2636]">↕ Recente</option>
            <option value="class" className="bg-[#1f2636]">↕ Classe A→C</option>
            <option value="status" className="bg-[#1f2636]">↕ Status</option>
            <option value="category" className="bg-[#1f2636]">↕ Categoria</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-[#181d29] p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-30">
            <span className="text-6xl mb-4">📋</span>
            <p className="text-sm font-black uppercase tracking-widest">Nenhuma tarefa encontrada</p>
            <p className="text-[10px] mt-1">Clique em "+ Nova Tarefa" para adicionar!</p>
          </div>
        ) : viewMode === 'table' ? (
          /* 📋 PLANILHA GERAL DE TAREFAS (DATAGRID TABLE) */
          <div className="w-full overflow-x-auto border border-white/10 rounded-xl shadow-2xl bg-[#1d2332]">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[1200px]">
              <thead>
                <tr className="bg-[#262e42] border-b border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-300 select-none">
                  <th className="p-3 text-center w-12 border-r border-white/5">#</th>
                  <th className="p-3 border-r border-white/5">Nome da Tarefa</th>
                  <th className="p-3 border-r border-white/5">Categoria</th>
                  <th className="p-3 border-r border-white/5">Tipo</th>
                  <th className="p-3 border-r border-white/5">Classe</th>
                  <th className="p-3 border-r border-white/5">Localidade</th>
                  <th className="p-3 border-r border-white/5">Recorrência</th>
                  <th className="p-3 border-r border-white/5 text-center">Status</th>
                  <th className="p-3 border-r border-white/5 text-center">Duração Est.</th>
                  <th className="p-3 border-r border-white/5 text-center">Quant. Feita</th>
                  <th className="p-3 border-r border-white/5">Subtarefas (Progresso)</th>
                  <th className="p-3 border-r border-white/5">Propriedades Ganhas</th>
                  <th className="p-3 border-r border-white/5">Inércia Atual</th>
                  <th className="p-3 border-r border-white/5">Notas</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filtered.map((t, idx) => {
                  const status = STATUS_META[t.status];
                  const type = TYPE_META[t.taskType];
                  const cls = CLASS_META[t.taskClass];
                  const doneSubtasks = t.subtasks.filter(s => s.done).length;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-white/5 transition-colors ${t.status === 'concluido' ? 'opacity-60 bg-emerald-950/10' : ''}`}
                    >
                      <td className="p-3 text-center border-r border-white/5 font-mono text-[10px] opacity-40">
                        {idx + 1}
                      </td>

                      <td className="p-3 border-r border-white/5 font-bold text-white max-w-[200px] truncate">
                        <span className={t.status === 'concluido' ? 'line-through text-white/40' : ''}>{t.name}</span>
                      </td>

                      <td className="p-3 border-r border-white/5">
                        {t.category ? (
                          <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 text-[10px] font-bold">
                            📦 {t.category}
                          </span>
                        ) : <span className="opacity-20">--</span>}
                      </td>

                      <td className="p-3 border-r border-white/5">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${type.bg} ${type.color}`}>
                          {type.icon} {type.label}
                        </span>
                      </td>

                      <td className="p-3 border-r border-white/5">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black ${cls.bg} ${cls.color}`}>
                          {cls.label}
                        </span>
                      </td>

                      <td className="p-3 border-r border-white/5">
                        {t.locality ? (
                          <span className="text-[11px] text-slate-300">📍 {t.locality}</span>
                        ) : <span className="opacity-20">--</span>}
                      </td>

                      <td className="p-3 border-r border-white/5 text-[11px] text-slate-300">
                        {t.recurrenceMode === 'exata' ? (
                          <span>📅 Exata ({t.recurrenceExactTime || 'Fixa'})</span>
                        ) : t.recurrenceMode === 'flexivel' ? (
                          <span>🔄 Flexível (A cada {t.recurrenceFlexHours}h)</span>
                        ) : (
                          <span className="opacity-40">1x Única</span>
                        )}
                      </td>

                      <td className="p-3 border-r border-white/5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${status.bg}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>

                      <td className="p-3 border-r border-white/5 text-center font-mono opacity-80">
                        {t.estimatedMinutes}m
                      </td>

                      <td className="p-3 border-r border-white/5 text-center font-mono font-bold">
                        {t.timesCompleted}
                      </td>

                      <td className="p-3 border-r border-white/5">
                        {t.subtasks.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-blue-400">
                              {doneSubtasks}/{t.subtasks.length}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {doneSubtasks === t.subtasks.length ? '✅ (Tudo Feito)' : `(${t.subtasks.map(s => s.title).join(', ')})`}
                            </span>
                          </div>
                        ) : <span className="opacity-20">--</span>}
                      </td>

                      <td className="p-3 border-r border-white/5 text-amber-300 font-medium max-w-[180px] truncate">
                        {t.rewards ? `+${t.rewards}` : <span className="opacity-20">--</span>}
                      </td>

                      <td className="p-3 border-r border-white/5 font-mono text-orange-300">
                        <InertiaClock lastCompletedAt={t.lastCompletedAt} />
                      </td>

                      <td className="p-3 border-r border-white/5 opacity-60 italic max-w-[150px] truncate">
                        {t.notes || '--'}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => completeTask(t.id)}
                            title={t.status === 'concluido' ? 'Reabrir' : 'Concluir'}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs transition-all ${
                              t.status === 'concluido' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 hover:border-emerald-400 hover:text-emerald-400'
                            }`}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => { setEditingTask(t); setShowForm(true); }}
                            title="Editar"
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs hover:border-blue-400 hover:text-blue-400 transition-all"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteTask(t.id)}
                            title="Excluir"
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs hover:border-rose-400 hover:text-rose-400 transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* 📊 SESSÃO DE CARDS / FEED DE TAREFAS (Grade ou Feed Vertical Rola) */
          <div className={cardsLayout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col space-y-4 max-w-3xl mx-auto"}>
            {filtered.map(t => {
              const status = STATUS_META[t.status];
              const type = TYPE_META[t.taskType];
              const cls = CLASS_META[t.taskClass];

              return (
                <div key={t.id} className={`bg-[#1d2332] border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all ${t.isPeriodicallyActive ? 'border-amber-500/50 shadow-amber-500/10 bg-gradient-to-b from-amber-500/5 to-[#1d2332]' : 'border-white/10 hover:border-blue-500/40'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.isPeriodicallyActive && (
                        <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black tracking-wider animate-pulse flex items-center gap-1">
                          ⚡ ATIVAÇÃO PERIÓDICA
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-md border text-[10px] font-black ${cls.bg} ${cls.color}`}>
                        {cls.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${type.bg} ${type.color}`}>
                        {type.icon} {type.label}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${status.bg}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>

                  <div>
                    <h3 className={`text-lg font-bold text-white ${t.status === 'concluido' ? 'line-through text-white/40' : ''}`}>
                      {t.name}
                    </h3>
                    <div className="flex flex-wrap gap-3 items-center mt-2 text-xs text-white/60">
                      {t.category && <span>📦 <strong className="text-pink-300">{t.category}</strong></span>}
                      {t.locality && <span>📍 <strong className="text-slate-200">{t.locality}</strong></span>}
                      <span>⏱️ Est: {t.estimatedMinutes}m</span>
                      {t.reminderMinutes && <span className="text-amber-300">🔔 IA Reminder: a cada {t.reminderMinutes}m</span>}
                    </div>
                    {t.startTime && (
                      <p className="text-[10px] text-blue-300 mt-1 font-mono">
                        🗓️ Início: {new Date(t.startTime).toLocaleString('pt-BR')} 
                        {t.endTime && ` → Término: ${new Date(t.endTime).toLocaleString('pt-BR')}`}
                      </p>
                    )}
                  </div>

                  {t.subtasks.length > 0 && (
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Subtarefas ({t.subtasks.filter(s => s.done).length}/{t.subtasks.length})</p>
                      <div className="space-y-1">
                        {t.subtasks.map(s => (
                          <div key={s.id} className="flex items-center gap-2 text-xs">
                            <span className={s.done ? 'text-emerald-400' : 'text-white/30'}>{s.done ? '✓' : '•'}</span>
                            <span className={s.done ? 'line-through text-white/40' : 'text-white/80'}>{s.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {t.rewards && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-semibold flex items-center gap-2">
                      <span>🏆 Recompensa:</span>
                      <span>+{t.rewards}</span>
                    </div>
                  )}

                  {t.notes && (
                    <p className="text-xs text-white/50 italic bg-white/5 p-3 rounded-xl">"{t.notes}"</p>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs text-white/50">
                    <span className="font-mono text-orange-300">Inércia: <InertiaClock lastCompletedAt={t.lastCompletedAt} /></span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => completeTask(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          t.status === 'concluido' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                        }`}
                      >
                        {t.status === 'concluido' ? '✓ Feito' : 'Concluir'}
                      </button>
                      <button onClick={() => { setEditingTask(t); setShowForm(true); }} className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10">✏️</button>
                      <button onClick={() => deleteTask(t.id)} className="px-2.5 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-lg border border-rose-500/20">🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <TaskFormModal
          initial={editingTask}
          allTasks={tasks}
          onSave={upsert}
          onClose={() => { setShowForm(false); setEditingTask(undefined); }}
        />
      )}
    </div>
  );
};
