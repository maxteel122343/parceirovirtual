import React, { useState, useEffect, useRef } from 'react';

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
  em_aberto:      { label: 'Em Aberto',            color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: '🔵' },
  pendente:       { label: 'Pendente',              color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: '⏳' },
  concluido:      { label: 'Concluído',             color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  icon: '✅' },
  concluido_fora: { label: 'Concluído Fora do Prazo', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: '⚠️' },
  adiado:         { label: 'Adiado',                color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: '⏭️' },
  nao_concluido:  { label: 'Não Concluído',         color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',    icon: '❌' },
  falhou:         { label: 'Falhou',                color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20', icon: '💀' },
};

const TYPE_META: Record<TaskType, { label: string; icon: string; color: string }> = {
  manutencao:  { label: 'Manutenção',  icon: '🔧', color: 'text-amber-400' },
  normal:      { label: 'Normal',      icon: '📝', color: 'text-blue-400' },
  organizacao: { label: 'Organização', icon: '📦', color: 'text-teal-400' },
  infra:       { label: 'Infra',       icon: '🏗️', color: 'text-indigo-400' },
  intervalo:   { label: 'Intervalo',   icon: '🎮', color: 'text-pink-400' },
};

const CLASS_META: Record<TaskClass, { label: string; color: string; bg: string }> = {
  A: { label: 'Classe A', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  B: { label: 'Classe B', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  C: { label: 'Classe C', color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20' },
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Helper ───────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10);

const elapsedSince = (isoDate?: string): string => {
  if (!isoDate) return '—';
  const diff = Date.now() - new Date(isoDate).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
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
  estimatedMinutes: 30,
  lastCompletedAt: undefined,
  locality: '',
  subtasks: [],
  rewards: '',
  notes: '',
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${className}`}>
    {children}
  </span>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1.5">{children}</p>
);

// ─── Inertia Clock ────────────────────────────────────────────────────────────

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

  const sectionBtnCls = (s: typeof activeSection) =>
    `px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
      activeSection === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'opacity-40 hover:opacity-70'
    }`;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-[#12131a] border border-white/8 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-white/5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black tracking-tighter text-white">
                {initial ? '✏️ Editar Tarefa' : '➕ Nova Tarefa'}
              </h2>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mt-1">Sistema de Gestão de Tarefas</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">✕</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['main', 'time', 'context', 'metrics'] as const).map(s => (
              <button key={s} onClick={() => setActiveSection(s)} className={sectionBtnCls(s)}>
                {s === 'main' ? '📋 Principal' : s === 'time' ? '⏱️ Tempo' : s === 'context' ? '📍 Contexto' : '📊 Métricas'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

          {activeSection === 'main' && (
            <>
              {/* Name */}
              <div>
                <FieldLabel>Nome da Tarefa *</FieldLabel>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Ex: Limpar a pia"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 transition-all"
                />
              </div>

              {/* Category + Locality */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Categoria</FieldLabel>
                  <input
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    placeholder="Ex: Saúde, Casa, Trabalho"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 transition-all"
                  />
                </div>
                <div>
                  <FieldLabel>Localidade</FieldLabel>
                  <input
                    value={form.locality}
                    onChange={e => set('locality', e.target.value)}
                    placeholder="Ex: Banheiro, PC, Cozinha"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <FieldLabel>Status</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(STATUS_META) as [TaskStatus, typeof STATUS_META[TaskStatus]][]).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => set('status', key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        form.status === key ? `${meta.bg} ${meta.color} font-black border-current` : 'bg-white/3 border-white/5 opacity-40 hover:opacity-70'
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span className="text-[10px] font-bold truncate">{meta.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Class */}
              <div>
                <FieldLabel>Classe / Prioridade</FieldLabel>
                <div className="flex gap-3">
                  {(['A', 'B', 'C'] as TaskClass[]).map(c => (
                    <button
                      key={c}
                      onClick={() => set('taskClass', c)}
                      className={`flex-1 py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${
                        form.taskClass === c ? `${CLASS_META[c].bg} ${CLASS_META[c].color}` : 'bg-white/3 border-white/5 opacity-40 hover:opacity-70 text-white'
                      }`}
                    >
                      {CLASS_META[c].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task Type */}
              <div>
                <FieldLabel>Tipo de Tarefa</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(TYPE_META) as [TaskType, typeof TYPE_META[TaskType]][]).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => set('taskType', key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                        form.taskType === key ? `bg-indigo-600/20 border-indigo-500/40 text-indigo-300` : 'bg-white/3 border-white/5 text-white/40 hover:text-white/70'
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
              {/* Recurrence Mode */}
              <div>
                <FieldLabel>Modo de Recorrência</FieldLabel>
                <div className="flex gap-3">
                  {([['unica', '1x Única'], ['exata', '📅 Exata'], ['flexivel', '🔄 Flexível']] as [RecurrenceMode, string][]).map(([m, label]) => (
                    <button
                      key={m}
                      onClick={() => set('recurrenceMode', m)}
                      className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${
                        form.recurrenceMode === m ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-white/3 border-white/5 text-white/40 hover:text-white/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exata */}
              {form.recurrenceMode === 'exata' && (
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Horário Fixo</FieldLabel>
                    <input
                      type="time"
                      value={form.recurrenceExactTime || ''}
                      onChange={e => set('recurrenceExactTime', e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-all"
                    />
                  </div>
                  <div>
                    <FieldLabel>Dias da Semana</FieldLabel>
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
                              active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-white/40'
                            }`}
                          >{d}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Flexivel */}
              {form.recurrenceMode === 'flexivel' && (
                <div>
                  <FieldLabel>A cada quantas horas?</FieldLabel>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min={1}
                      value={form.recurrenceFlexHours || 24}
                      onChange={e => set('recurrenceFlexHours', Number(e.target.value))}
                      className="w-28 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-all"
                    />
                    <span className="text-white/40 text-sm">horas</span>
                  </div>
                  <p className="text-[10px] text-white/30 mt-2">Alerta dispara quando o tempo desde a última execução atingir esse limite.</p>
                </div>
              )}

              {/* Estimated time */}
              <div>
                <FieldLabel>Duração Estimada (minutos)</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={form.estimatedMinutes}
                  onChange={e => set('estimatedMinutes', Number(e.target.value))}
                  className="w-36 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-all"
                />
              </div>
            </>
          )}

          {activeSection === 'context' && (
            <>
              {/* Subtasks */}
              <div>
                <FieldLabel>Subtasks ({form.subtasks.length}/5)</FieldLabel>
                <div className="space-y-2 mb-3">
                  {form.subtasks.map(s => (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl">
                      <button onClick={() => toggleSubtask(s.id)} className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${s.done ? 'bg-green-500 border-green-400' : 'bg-white/10 border-white/20'}`}>
                        {s.done && <span className="text-[10px] text-white">✓</span>}
                      </button>
                      <span className={`flex-1 text-sm ${s.done ? 'line-through opacity-30' : 'text-white/80'}`}>{s.title}</span>
                      <button onClick={() => removeSubtask(s.id)} className="text-white/20 hover:text-red-400 transition-all text-xs">✕</button>
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
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 transition-all"
                    />
                    <button onClick={addSubtask} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-black transition-all">+</button>
                  </div>
                )}
              </div>

              {/* Rewards */}
              <div>
                <FieldLabel>Propriedades Ganhas / Recompensas</FieldLabel>
                <input
                  value={form.rewards}
                  onChange={e => set('rewards', e.target.value)}
                  placeholder="Ex: Força +1, Alimento em estoque, Produtividade +2..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <FieldLabel>Notas e Observações</FieldLabel>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={4}
                  placeholder="Anotações livres sobre esta tarefa..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 transition-all resize-none"
                />
              </div>
            </>
          )}

          {activeSection === 'metrics' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/8 rounded-2xl p-4 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Vezes Concluída</p>
                  <p className="text-3xl font-black text-white">{form.timesCompleted}</p>
                </div>
                <div className="bg-white/5 border border-white/8 rounded-2xl p-4 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Duração Estimada</p>
                  <p className="text-3xl font-black text-white">{form.estimatedMinutes}<span className="text-sm text-white/30">min</span></p>
                </div>
              </div>

              {/* Inertia */}
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-2">⏱️ Cronômetro de Inércia</p>
                <p className="text-2xl font-black text-orange-300">
                  <InertiaClock lastCompletedAt={form.lastCompletedAt} />
                </p>
                <p className="text-[10px] text-orange-300/40 mt-1">Tempo desde a última execução</p>
              </div>

              {/* Last completed */}
              <div>
                <FieldLabel>Última Conclusão (manual)</FieldLabel>
                <input
                  type="datetime-local"
                  value={form.lastCompletedAt ? new Date(form.lastCompletedAt).toISOString().slice(0, 16) : ''}
                  onChange={e => set('lastCompletedAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-all"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-white/10 text-white/40 hover:text-white hover:border-white/20 text-[10px] font-black uppercase tracking-widest transition-all">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!form.name.trim()}
            className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all"
          >
            {initial ? 'Salvar Alterações' : 'Criar Tarefa'} ✨
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onComplete }) => {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_META[task.status];
  const type = TYPE_META[task.taskType];
  const cls = CLASS_META[task.taskClass];

  return (
    <div className={`bg-[#12131a] border rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30 ${task.status === 'concluido' ? 'border-white/5 opacity-60' : 'border-white/8'}`}>
      {/* Main row */}
      <div className="px-5 py-4 flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onComplete(task.id)}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            task.status === 'concluido' ? 'bg-green-500 border-green-400' : 'bg-white/5 border-white/20 hover:border-indigo-400'
          }`}
        >
          {task.status === 'concluido' && <span className="text-[10px] text-white font-black">✓</span>}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-2">
            <span className={`text-sm font-bold ${task.status === 'concluido' ? 'line-through text-white/30' : 'text-white'}`}>
              {task.name}
            </span>
            <Badge className={cls.bg + ' ' + cls.color}>{task.taskClass}</Badge>
            <Badge className={status.bg + ' ' + status.color}>{status.icon} {status.label}</Badge>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-[10px] font-bold ${type.color}`}>{type.icon} {type.label}</span>
            {task.category && <span className="text-[10px] text-white/30 font-medium"># {task.category}</span>}
            {task.locality && <span className="text-[10px] text-white/30 font-medium">📍 {task.locality}</span>}
            {task.recurrenceMode !== 'unica' && (
              <span className="text-[10px] text-indigo-400/70 font-bold">
                {task.recurrenceMode === 'exata' ? `📅 ${task.recurrenceExactTime || ''}` : `🔄 ${task.recurrenceFlexHours}h`}
              </span>
            )}
          </div>

          {/* Subtask progress */}
          {task.subtasks.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${(task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-white/30 font-bold">
                {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all text-xs">
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={() => onEdit(task)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-indigo-400 hover:bg-white/10 transition-all text-xs">✏️</button>
          <button onClick={() => onDelete(task.id)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs">🗑️</button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Inércia</p>
            <p className="text-sm font-bold text-orange-400"><InertiaClock lastCompletedAt={task.lastCompletedAt} /></p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Concluída</p>
            <p className="text-sm font-bold text-white">{task.timesCompleted}×</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Duração Estimada</p>
            <p className="text-sm font-bold text-white">{task.estimatedMinutes} min</p>
          </div>
          {task.rewards && (
            <div className="col-span-2 md:col-span-1">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Recompensas</p>
              <p className="text-[11px] text-yellow-400 font-bold">🏆 {task.rewards}</p>
            </div>
          )}
          {task.notes && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Notas</p>
              <p className="text-[11px] text-white/50 leading-relaxed">{task.notes}</p>
            </div>
          )}
          {task.subtasks.length > 0 && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-2">Subtasks</p>
              <div className="space-y-1.5">
                {task.subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className={`text-[10px] ${s.done ? 'text-green-400' : 'text-white/30'}`}>{s.done ? '✅' : '⬜'}</span>
                    <span className={`text-[11px] ${s.done ? 'line-through text-white/30' : 'text-white/60'}`}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main TasksTab ─────────────────────────────────────────────────────────────

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

export const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('created');
  const [search, setSearch] = useState('');

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

  // Summary stats
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'concluido').length;
  const open = tasks.filter(t => t.status === 'em_aberto').length;
  const failed = tasks.filter(t => t.status === 'falhou' || t.status === 'nao_concluido').length;

  return (
    <div className="flex flex-col h-full bg-[#0b0c10] text-white">
      {/* Top bar */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tighter">📋 Tarefas</h1>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Gestão de Produtividade</p>
          </div>
          <button
            onClick={() => { setEditingTask(undefined); setShowForm(true); }}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
          >
            + Nova Tarefa
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total', val: total, color: 'text-white' },
            { label: 'Em Aberto', val: open, color: 'text-blue-400' },
            { label: 'Concluídas', val: done, color: 'text-green-400' },
            { label: 'Falhas', val: failed, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar tarefa..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 transition-all"
          />
          <div className="flex gap-2 flex-wrap">
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as FilterStatus)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white/60 focus:outline-none focus:border-indigo-500/60 transition-all"
            >
              <option value="all">Todos Status</option>
              {(Object.entries(STATUS_META) as [TaskStatus, any][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {/* Category filter */}
            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white/60 focus:outline-none focus:border-indigo-500/60 transition-all"
              >
                <option value="">Todas Categorias</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* Type filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as TaskType | 'all')}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white/60 focus:outline-none focus:border-indigo-500/60 transition-all"
            >
              <option value="all">Todos Tipos</option>
              {(Object.entries(TYPE_META) as [TaskType, any][]).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as SortMode)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white/60 focus:outline-none focus:border-indigo-500/60 transition-all ml-auto"
            >
              <option value="created">↕ Mais Recente</option>
              <option value="class">↕ Classe A→C</option>
              <option value="status">↕ Status</option>
              <option value="category">↕ Categoria</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 opacity-20">
            <span className="text-6xl mb-4">📋</span>
            <p className="text-sm font-black uppercase tracking-widest">Nenhuma tarefa encontrada</p>
            <p className="text-[10px] mt-1">Clique em "+ Nova Tarefa" para começar</p>
          </div>
        )}
        {filtered.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={t => { setEditingTask(t); setShowForm(true); }}
            onDelete={deleteTask}
            onComplete={completeTask}
          />
        ))}
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
