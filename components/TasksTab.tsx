import React, { useState, useEffect } from 'react';

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

interface Task {
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

const blankTask = (): Omit<Task, 'id' | 'createdAt'> => ({
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
});

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

// ─── Task Form Modal ──────────────────────────────────────────────────────────

interface TaskFormProps {
  initial?: Task;
  onSave: (task: Task) => void;
  onClose: () => void;
}

const TaskFormModal: React.FC<TaskFormProps> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState<Omit<Task, 'id' | 'createdAt'>>(
    initial ? { ...initial } : blankTask()
  );
  const [subtaskInput, setSubtaskInput] = useState('');
  const [activeSection, setActiveSection] = useState<'main' | 'time' | 'context' | 'metrics'>('main');

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

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
      <div className="w-full max-w-2xl bg-[#131722] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black tracking-tighter text-white">
                {initial ? '✏️ Editar Tarefa na Planilha' : '➕ Nova Tarefa para Planilha'}
              </h2>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Planilha Geral de Tarefas</p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {activeSection === 'main' && (
            <>
              <div>
                <FieldLabel>Nome da Tarefa *</FieldLabel>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Ex: Treino de Musculação, Limpar Pia Banheiro..."
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
              <div>
                <FieldLabel>Modo de Recorrência</FieldLabel>
                <div className="flex gap-3">
                  {([['unica', '1x Única'], ['exata', '📅 Exata'], ['flexivel', '🔄 Flexível']] as [RecurrenceMode, string][]).map(([m, label]) => (
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
                    <FieldLabel>Horário Exato</FieldLabel>
                    <input
                      type="time"
                      value={form.recurrenceExactTime || ''}
                      onChange={e => set('recurrenceExactTime', e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all"
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
                      className="w-28 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all"
                    />
                    <span className="text-white/50 text-sm">horas (Ex: A cada 24h)</span>
                  </div>
                </div>
              )}

              <div>
                <FieldLabel>Duração Estimada (minutos)</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={form.estimatedMinutes}
                  onChange={e => set('estimatedMinutes', Number(e.target.value))}
                  className="w-36 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all"
                />
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
                      placeholder="Adicionar subpasso (Ex: Supino, Agachamento, Jogar Lixo...)"
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
                  placeholder="Ex: +Força Muscular, +Alimento Armazenado, Item Limpeza..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-all"
                />
              </div>

              <div>
                <FieldLabel>Notas / Observações</FieldLabel>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={4}
                  placeholder="Foco no Supino, Usar desinfetante..."
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
            {initial ? 'Atualizar Tarefa' : 'Salvar na Planilha'} ✨
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tasks_v1';

const loadTasks = (): Task[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

const saveTasks = (tasks: Task[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

type FilterStatus = 'all' | TaskStatus;
type SortMode = 'created' | 'class' | 'status' | 'category';

// ─── Main TasksTab Component ──────────────────────────────────────────────────

export const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('created');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => { saveTasks(tasks); }, [tasks]);

  const upsert = (task: Task) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = task; return next; }
      return [task, ...prev];
    });
  };

  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const completeTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const now = new Date().toISOString();
      if (t.status === 'concluido') return { ...t, status: 'em_aberto' as TaskStatus };
      return { ...t, status: 'concluido' as TaskStatus, timesCompleted: t.timesCompleted + 1, lastCompletedAt: now };
    }));
  };

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))];

  const filtered = tasks
    .filter(t => filterStatus === 'all' || t.status === filterStatus)
    .filter(t => !filterCategory || t.category === filterCategory)
    .filter(t => filterType === 'all' || t.taskType === filterType)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === 'class') return ['A', 'B', 'C'].indexOf(a.taskClass) - ['A', 'B', 'C'].indexOf(b.taskClass);
      if (sortMode === 'status') return a.status.localeCompare(b.status);
      if (sortMode === 'category') return (a.category || '').localeCompare(b.category || '');
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'concluido').length;
  const open = tasks.filter(t => t.status === 'em_aberto' || t.status === 'pendente').length;
  const failed = tasks.filter(t => t.status === 'falhou' || t.status === 'nao_concluido').length;

  return (
    <div className="flex flex-col h-full bg-[#181d29] text-white font-sans overflow-hidden border border-white/10 rounded-[2rem] shadow-2xl">
      {/* Header Bar / Controls */}
      <div className="px-6 pt-6 pb-4 bg-[#1f2636] border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl shadow-lg">📋</div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase">PLANILHA GERAL DE TAREFAS</h1>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Visão Geral Completa de Produtividade</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle View */}
            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white shadow' : 'opacity-40 hover:opacity-100'}`}
              >
                📊 Tabela
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'cards' ? 'bg-blue-600 text-white shadow' : 'opacity-40 hover:opacity-100'}`}
              >
                🎴 Cards
              </button>
            </div>

            <button
              onClick={() => { setEditingTask(undefined); setShowForm(true); }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
            >
              + Nova Tarefa
            </button>
          </div>
        </div>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total', val: total, color: 'text-white' },
            { label: 'Em Aberto', val: open, color: 'text-blue-400' },
            { label: 'Concluídas', val: done, color: 'text-emerald-400' },
            { label: 'Falhas', val: failed, color: 'text-rose-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar por nome ou categoria..."
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 transition-all"
          />

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white/80 focus:outline-none transition-all"
          >
            <option value="all" className="bg-[#1f2636]">Todos Status</option>
            {(Object.entries(STATUS_META) as [TaskStatus, any][]).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#1f2636]">{v.label}</option>
            ))}
          </select>

          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white/80 focus:outline-none transition-all"
            >
              <option value="" className="bg-[#1f2636]">Todas Categorias</option>
              {categories.map(c => <option key={c} value={c} className="bg-[#1f2636]">{c}</option>)}
            </select>
          )}

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as TaskType | 'all')}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white/80 focus:outline-none transition-all"
          >
            <option value="all" className="bg-[#1f2636]">Todos Tipos</option>
            {(Object.entries(TYPE_META) as [TaskType, any][]).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#1f2636]">{v.icon} {v.label}</option>
            ))}
          </select>

          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white/80 focus:outline-none transition-all ml-auto"
          >
            <option value="created" className="bg-[#1f2636]">↕ Mais Recente</option>
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
            <p className="text-[10px] mt-1">Clique em "+ Nova Tarefa" ou peça à IA durante a chamada para adicionar!</p>
          </div>
        ) : viewMode === 'table' ? (
          /* 📊 PLANILHA GERAL DE TAREFAS (DATAGRID TABLE) */
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
                      {/* ID / Checkbox */}
                      <td className="p-3 text-center border-r border-white/5 font-mono text-[10px] opacity-40">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="p-3 border-r border-white/5 font-bold text-white max-w-[200px] truncate">
                        <span className={t.status === 'concluido' ? 'line-through text-white/40' : ''}>{t.name}</span>
                      </td>

                      {/* Categoria */}
                      <td className="p-3 border-r border-white/5">
                        {t.category ? (
                          <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 text-[10px] font-bold">
                            📦 {t.category}
                          </span>
                        ) : <span className="opacity-20">--</span>}
                      </td>

                      {/* Tipo */}
                      <td className="p-3 border-r border-white/5">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${type.bg} ${type.color}`}>
                          {type.icon} {type.label}
                        </span>
                      </td>

                      {/* Classe */}
                      <td className="p-3 border-r border-white/5">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black ${cls.bg} ${cls.color}`}>
                          {cls.label}
                        </span>
                      </td>

                      {/* Localidade */}
                      <td className="p-3 border-r border-white/5">
                        {t.locality ? (
                          <span className="text-[11px] text-slate-300">📍 {t.locality}</span>
                        ) : <span className="opacity-20">--</span>}
                      </td>

                      {/* Recorrência */}
                      <td className="p-3 border-r border-white/5 text-[11px] text-slate-300">
                        {t.recurrenceMode === 'exata' ? (
                          <span>📅 Exata ({t.recurrenceExactTime || 'Fixa'})</span>
                        ) : t.recurrenceMode === 'flexivel' ? (
                          <span>🔄 Flexível (A cada {t.recurrenceFlexHours}h)</span>
                        ) : (
                          <span className="opacity-40">1x Única</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 border-r border-white/5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${status.bg}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>

                      {/* Duração Est. */}
                      <td className="p-3 border-r border-white/5 text-center font-mono opacity-80">
                        {t.estimatedMinutes}m
                      </td>

                      {/* Quant. Feita */}
                      <td className="p-3 border-r border-white/5 text-center font-mono font-bold">
                        {t.timesCompleted}
                      </td>

                      {/* Subtarefas / Progresso */}
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

                      {/* Propriedades Ganhas */}
                      <td className="p-3 border-r border-white/5 text-amber-300 font-medium max-w-[180px] truncate">
                        {t.rewards ? `+${t.rewards}` : <span className="opacity-20">--</span>}
                      </td>

                      {/* Inércia Atual */}
                      <td className="p-3 border-r border-white/5 font-mono text-orange-300">
                        <InertiaClock lastCompletedAt={t.lastCompletedAt} />
                      </td>

                      {/* Notas */}
                      <td className="p-3 border-r border-white/5 opacity-60 italic max-w-[150px] truncate">
                        {t.notes || '--'}
                      </td>

                      {/* Ações */}
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
          /* 🎴 VISUALIZAÇÃO EM CARDS */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => {
              const status = STATUS_META[t.status];
              const type = TYPE_META[t.taskType];
              const cls = CLASS_META[t.taskClass];

              return (
                <div key={t.id} className="bg-[#1d2332] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${cls.bg} ${cls.color}`}>
                      {cls.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black ${status.bg}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>

                  <div>
                    <h3 className={`text-base font-bold text-white ${t.status === 'concluido' ? 'line-through text-white/40' : ''}`}>
                      {t.name}
                    </h3>
                    <div className="flex gap-2 items-center mt-1 text-[10px] text-white/50">
                      <span>{type.icon} {type.label}</span>
                      {t.category && <span>• 📦 {t.category}</span>}
                      {t.locality && <span>• 📍 {t.locality}</span>}
                    </div>
                  </div>

                  {t.rewards && (
                    <p className="text-[10px] text-amber-300 font-semibold">🏆 Recompensa: +{t.rewards}</p>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px] text-white/40">
                    <span>Inércia: <InertiaClock lastCompletedAt={t.lastCompletedAt} /></span>
                    <div className="flex gap-1">
                      <button onClick={() => completeTask(t.id)} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/40">✓ Feito</button>
                      <button onClick={() => { setEditingTask(t); setShowForm(true); }} className="px-2 py-1 bg-white/5 rounded hover:bg-white/10">✏️</button>
                      <button onClick={() => deleteTask(t.id)} className="px-2 py-1 bg-rose-500/20 text-rose-300 rounded hover:bg-rose-500/40">🗑️</button>
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
          onSave={upsert}
          onClose={() => { setShowForm(false); setEditingTask(undefined); }}
        />
      )}
    </div>
  );
};
