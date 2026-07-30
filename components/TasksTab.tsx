import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Reminder, PartnerProfile, UserProfile } from '../types';

// ─── TASK TYPES ───────────────────────────────────────────────────────────────

export type TaskStatus =
  | 'em_aberto' | 'pendente' | 'concluido' | 'concluido_fora'
  | 'adiado' | 'nao_concluido' | 'falhou';

export type TaskPriority = 'A' | 'B' | 'C' | 'D';
export type TaskType = 'manutencao' | 'normal' | 'organizacao' | 'infra' | 'intervalo';
export type RecurrenceMode = 'exata' | 'flexivel';

export interface Subtask { id: string; title: string; done: boolean; }
export interface GainedProperty { name: string; value: string; }

export interface Task {
  id: string;
  name: string;
  category: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  recurrenceMode: RecurrenceMode;
  recurrenceValue: string;
  nextExecution: string;       // datetime-local value or ISO
  estimatedDuration: number;   // minutes
  timesCompleted: number;
  location: string;
  subtasks: Subtask[];
  gainedProperties: GainedProperty[];
  notes: string;
  lastCompletedAt: string | null;
  createdAt: string;
  // Links to calendar
  reminderId: string | null;   // Supabase reminders.id linked to this task
}

// ─── META MAPS ────────────────────────────────────────────────────────────────

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; emoji: string }> = {
  em_aberto:      { label: 'Em Aberto',              color: 'text-sky-400',    bg: 'bg-sky-500/15 border-sky-500/30',     emoji: '🔵' },
  pendente:       { label: 'Pendente',               color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30', emoji: '⏳' },
  concluido:      { label: 'Concluído',              color: 'text-emerald-400',bg: 'bg-emerald-500/15 border-emerald-500/30', emoji: '✅' },
  concluido_fora: { label: 'Concluído Fora do Prazo',color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', emoji: '🕐' },
  adiado:         { label: 'Adiado',                 color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30', emoji: '📌' },
  nao_concluido:  { label: 'Não Concluído',          color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30',     emoji: '❌' },
  falhou:         { label: 'Falhou',                 color: 'text-rose-400',   bg: 'bg-rose-500/15 border-rose-500/30',   emoji: '💥' },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  A: { label: 'Classe A', color: 'text-red-400',    bg: 'bg-red-500/20 border-red-500/40' },
  B: { label: 'Classe B', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40' },
  C: { label: 'Classe C', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40' },
  D: { label: 'Classe D', color: 'text-slate-400',  bg: 'bg-slate-500/20 border-slate-500/40' },
};

const TYPE_META: Record<TaskType, { label: string; emoji: string }> = {
  manutencao:  { label: 'Manutenção',  emoji: '🔧' },
  normal:      { label: 'Normal',      emoji: '📋' },
  organizacao: { label: 'Organização', emoji: '🗂️' },
  infra:       { label: 'Infra',       emoji: '🏗️' },
  intervalo:   { label: 'Intervalo',   emoji: '☕' },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const STORAGE_KEY = 'warmconn_tasks_v3';
const loadTasks = (): Task[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveTasks = (tasks: Task[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

const emptyTask = (): Task => ({
  id: uid(), name: '', category: '', status: 'em_aberto', priority: 'B',
  type: 'normal', recurrenceMode: 'flexivel', recurrenceValue: '', nextExecution: '',
  estimatedDuration: 15, timesCompleted: 0, location: '', subtasks: [],
  gainedProperties: [], notes: '', lastCompletedAt: null,
  createdAt: new Date().toISOString(), reminderId: null,
});

const formatInertia = (lastCompletedAt: string | null, createdAt: string): string => {
  const base = lastCompletedAt ? new Date(lastCompletedAt) : new Date(createdAt);
  const diffH = Math.floor((Date.now() - base.getTime()) / 3600000);
  const diffM = Math.floor(((Date.now() - base.getTime()) % 3600000) / 60000);
  if (diffH >= 24) return `${Math.floor(diffH / 24)}d ${diffH % 24}h`;
  if (diffH >= 1)  return `${diffH}h ${diffM}m`;
  return `${diffM}m`;
};

const formatDuration = (m: number) =>
  !m ? '--' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ''}`;

// ─── FIELD GROUP HELPER ───────────────────────────────────────────────────────

const FieldGroup: React.FC<{ label: string; isDark: boolean; children: React.ReactNode }> = ({ label, isDark, children }) => (
  <div>
    <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ml-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{label}</label>
    {children}
  </div>
);

const SectionHeader: React.FC<{ letter: string; title: string; isDark: boolean }> = ({ letter, title, isDark }) => (
  <div className="flex items-center gap-3 mt-2">
    <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">{letter}</div>
    <span className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{title}</span>
    <div className={`flex-1 h-px ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
  </div>
);

// ─── TASK FORM MODAL ─────────────────────────────────────────────────────────

interface TaskFormProps {
  task: Task;
  onChange: (t: Task) => void;
  onSave: () => void;
  onClose: () => void;
  isDark: boolean;
  hasLinkedReminder: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onChange, onSave, onClose, isDark, hasLinkedReminder }) => {
  const set = (partial: Partial<Task>) => onChange({ ...task, ...partial });

  const addSubtask = () => {
    if (task.subtasks.length >= 5) return;
    set({ subtasks: [...task.subtasks, { id: uid(), title: '', done: false }] });
  };
  const updateSubtask = (id: string, title: string) =>
    set({ subtasks: task.subtasks.map(s => s.id === id ? { ...s, title } : s) });
  const removeSubtask = (id: string) =>
    set({ subtasks: task.subtasks.filter(s => s.id !== id) });
  const addGain = () =>
    set({ gainedProperties: [...task.gainedProperties, { name: '', value: '' }] });
  const updateGain = (i: number, key: 'name' | 'value', val: string) =>
    set({ gainedProperties: task.gainedProperties.map((g, idx) => idx === i ? { ...g, [key]: val } : g) });
  const removeGain = (i: number) =>
    set({ gainedProperties: task.gainedProperties.filter((_, idx) => idx !== i) });

  const card = isDark ? 'bg-[#0e1117] border-white/5' : 'bg-white border-slate-100';
  const inp  = isDark
    ? 'bg-[#1a1d26] border-white/10 text-white placeholder-white/20 focus:border-blue-500/60'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(16px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border shadow-2xl p-8 ${card}`}
        style={{ scrollbarWidth: 'thin' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {task.name || '✨ Nova Tarefa'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Planilha de Execução</p>
              {hasLinkedReminder && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  📅 Vinculada ao Calendário
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all hover:scale-110 ${isDark ? 'border-white/10 hover:bg-white/5 text-white/60' : 'border-slate-200 hover:bg-slate-100 text-slate-500'}`}>✕</button>
        </div>

        <div className="space-y-6">
          {/* ── A: Core Data ── */}
          <SectionHeader letter="A" title="Dados Principais" isDark={isDark} />

          <FieldGroup label="Nome da Tarefa" isDark={isDark}>
            <input type="text" value={task.name} onChange={e => set({ name: e.target.value })}
              placeholder="Ex: Limpar a pia do banheiro"
              className={`w-full px-5 py-4 rounded-2xl border text-sm font-semibold transition-all outline-none ${inp}`} />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Categoria" isDark={isDark}>
              <input type="text" value={task.category} onChange={e => set({ category: e.target.value })}
                placeholder="Ex: Casa, Saúde, Trabalho"
                className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all outline-none ${inp}`} />
            </FieldGroup>
            <FieldGroup label="Localidade" isDark={isDark}>
              <input type="text" value={task.location} onChange={e => set({ location: e.target.value })}
                placeholder="Ex: Banheiro, PC, Cozinha"
                className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all outline-none ${inp}`} />
            </FieldGroup>
          </div>

          {/* Status */}
          <FieldGroup label="Status Atual" isDark={isDark}>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_META) as TaskStatus[]).map(s => {
                const m = STATUS_META[s];
                const active = task.status === s;
                return (
                  <button key={s} onClick={() => set({ status: s })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${active ? m.bg + ' ' + m.color : isDark ? 'border-white/5 text-white/30 hover:border-white/20' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                    <span>{m.emoji}</span> {m.label}
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          {/* Priority + Type */}
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Classe / Prioridade" isDark={isDark}>
              <div className="flex gap-2">
                {(['A', 'B', 'C', 'D'] as TaskPriority[]).map(p => {
                  const m = PRIORITY_META[p];
                  const active = task.priority === p;
                  return (
                    <button key={p} onClick={() => set({ priority: p })}
                      className={`flex-1 py-3 rounded-xl border text-xs font-black transition-all ${active ? m.bg + ' ' + m.color : isDark ? 'border-white/5 text-white/20 hover:text-white/60' : 'border-slate-100 text-slate-300 hover:text-slate-600'}`}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </FieldGroup>
            <FieldGroup label="Tipo de Tarefa" isDark={isDark}>
              <select value={task.type} onChange={e => set({ type: e.target.value as TaskType })}
                className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all outline-none ${inp}`}>
                {(Object.keys(TYPE_META) as TaskType[]).map(t => (
                  <option key={t} value={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</option>
                ))}
              </select>
            </FieldGroup>
          </div>

          {/* ── B: Time & Frequency ── */}
          <SectionHeader letter="B" title="Tempo, Frequência e Métricas" isDark={isDark} />

          <FieldGroup label="Modo de Recorrência" isDark={isDark}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(['exata', 'flexivel'] as RecurrenceMode[]).map(r => (
                <button key={r} onClick={() => set({ recurrenceMode: r })}
                  className={`py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${task.recurrenceMode === r ? 'bg-blue-600 border-blue-600 text-white' : isDark ? 'border-white/10 text-white/30 hover:border-white/30' : 'border-slate-200 text-slate-400 hover:border-slate-400'}`}>
                  {r === 'exata' ? '📅 Exata' : '🔄 Flexível'}
                </button>
              ))}
            </div>
            <input type="text" value={task.recurrenceValue} onChange={e => set({ recurrenceValue: e.target.value })}
              placeholder={task.recurrenceMode === 'exata' ? 'Ex: Toda segunda-feira às 14:00' : 'Ex: A cada 24 horas'}
              className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all outline-none ${inp}`} />
          </FieldGroup>

          {/* Calendar Integration notice */}
          <div className={`rounded-2xl border p-4 flex items-start gap-3 ${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
            <span className="text-xl mt-0.5">📅</span>
            <div>
              <p className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Integrado ao Calendário</p>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                Ao definir a <strong>Próxima Execução</strong>, um lembrete é criado automaticamente na sua Agenda. Quando o horário chegar, a IA será alertada durante a ligação para te avisar em voz alta.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Próxima Execução (→ Agenda)" isDark={isDark}>
              <input type="datetime-local" value={task.nextExecution} onChange={e => set({ nextExecution: e.target.value })}
                className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all outline-none ${inp}`} />
            </FieldGroup>
            <FieldGroup label="Duração Estimada (min)" isDark={isDark}>
              <input type="number" min={1} value={task.estimatedDuration} onChange={e => set({ estimatedDuration: Number(e.target.value) })}
                className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all outline-none ${inp}`} />
            </FieldGroup>
          </div>

          {/* ── C: Context, Subtasks, Rewards ── */}
          <SectionHeader letter="C" title="Contexto, Subtarefas e Recompensas" isDark={isDark} />

          <FieldGroup label={`Subtarefas (${task.subtasks.length}/5)`} isDark={isDark}>
            <div className="space-y-2">
              {task.subtasks.map((st, i) => (
                <div key={st.id} className="flex items-center gap-2">
                  <span className={`text-xs font-black w-5 text-center ${isDark ? 'text-white/30' : 'text-slate-300'}`}>{i + 1}</span>
                  <input type="text" value={st.title} onChange={e => updateSubtask(st.id, e.target.value)}
                    placeholder={`Subpasso ${i + 1}...`}
                    className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all outline-none ${inp}`} />
                  <button onClick={() => removeSubtask(st.id)} className="text-red-400 hover:text-red-300 opacity-60 hover:opacity-100">✕</button>
                </div>
              ))}
              {task.subtasks.length < 5 && (
                <button onClick={addSubtask}
                  className={`w-full py-2.5 rounded-xl border border-dashed text-xs font-bold transition-all ${isDark ? 'border-white/10 text-white/30 hover:border-blue-500/50 hover:text-blue-400' : 'border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}>
                  + Adicionar Subpasso
                </button>
              )}
            </div>
          </FieldGroup>

          <FieldGroup label="Propriedades Ganhas (Recompensas)" isDark={isDark}>
            <div className="space-y-2">
              {task.gainedProperties.map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={g.name} onChange={e => updateGain(i, 'name', e.target.value)}
                    placeholder="Atributo (ex: Força)"
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all outline-none ${inp}`} />
                  <span className={`text-xs ${isDark ? 'text-white/20' : 'text-slate-300'}`}>+</span>
                  <input type="text" value={g.value} onChange={e => updateGain(i, 'value', e.target.value)}
                    placeholder="Valor"
                    className={`w-20 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all outline-none ${inp}`} />
                  <button onClick={() => removeGain(i)} className="text-red-400 hover:text-red-300 opacity-60 hover:opacity-100">✕</button>
                </div>
              ))}
              <button onClick={addGain}
                className={`w-full py-2.5 rounded-xl border border-dashed text-xs font-bold transition-all ${isDark ? 'border-white/10 text-white/30 hover:border-emerald-500/50 hover:text-emerald-400' : 'border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600'}`}>
                + Adicionar Ganho
              </button>
            </div>
          </FieldGroup>

          <FieldGroup label="Notas e Observações" isDark={isDark}>
            <textarea value={task.notes} onChange={e => set({ notes: e.target.value })}
              rows={3} placeholder="Anotações rápidas sobre essa tarefa..."
              className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-medium resize-none transition-all outline-none ${inp}`} />
          </FieldGroup>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-8">
          <button onClick={onClose}
            className={`flex-1 py-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] ${isDark ? 'border-white/10 text-white/40 hover:border-white/30' : 'border-slate-200 text-slate-400 hover:border-slate-400'}`}>
            Cancelar
          </button>
          <button onClick={onSave} disabled={!task.name.trim()}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none">
            💾 Salvar + Agendar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── STATS BAR ────────────────────────────────────────────────────────────────

const StatsBar: React.FC<{ tasks: Task[]; isDark: boolean }> = ({ tasks, isDark }) => {
  const card = isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-100 shadow-sm';
  const stats = [
    { label: 'Total',      value: tasks.length,                                            emoji: '📋', color: 'text-blue-400' },
    { label: 'Em Aberto',  value: tasks.filter(t => t.status === 'em_aberto').length,      emoji: '🔵', color: 'text-sky-400' },
    { label: 'Pendentes',  value: tasks.filter(t => t.status === 'pendente').length,       emoji: '⏳', color: 'text-amber-400' },
    { label: 'Concluídas', value: tasks.filter(t => t.status === 'concluido').length,      emoji: '✅', color: 'text-emerald-400' },
    { label: 'Na Agenda',  value: tasks.filter(t => !!t.reminderId).length,                emoji: '📅', color: 'text-indigo-400' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className={`rounded-2xl border p-4 flex flex-col gap-1 ${card}`}>
          <span className="text-xl">{s.emoji}</span>
          <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{s.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── TASK ROW ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: TaskStatus) => void;
  isDark: boolean;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, index, onEdit, onDelete, onStatusChange, isDark }) => {
  const s = STATUS_META[task.status];
  const p = PRIORITY_META[task.priority];
  const t = TYPE_META[task.type];
  const subtasksDone = task.subtasks.filter(sub => sub.done).length;
  const td = isDark ? 'border-white/5 text-white/80' : 'border-slate-100 text-slate-700';
  const bdr = isDark ? 'border-white/5' : 'border-slate-100';

  return (
    <tr className={`group border-b ${isDark ? 'border-white/5 hover:bg-white/[0.025]' : 'border-slate-50 hover:bg-slate-50/80'} transition-colors`}>
      <td className={`px-3 py-3 text-center text-[10px] font-black border-r ${bdr} ${isDark ? 'text-white/20' : 'text-slate-300'}`}>{index + 1}</td>
      <td className={`px-4 py-3 border-r ${td} min-w-[130px]`}>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold truncate max-w-[150px]">{task.name || <em className="opacity-30">Sem nome</em>}</span>
            {task.reminderId && <span title="Vinculada ao Calendário" className="text-[10px] flex-shrink-0">📅</span>}
          </div>
          {task.location && <span className={`text-[9px] font-semibold ${isDark ? 'text-white/30' : 'text-slate-400'}`}>📍 {task.location}</span>}
        </div>
      </td>
      <td className={`px-4 py-3 border-r ${td}`}>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>{task.category || '--'}</span>
      </td>
      <td className={`px-3 py-3 border-r ${td}`}>
        <span className="text-[10px] font-bold whitespace-nowrap">{t.emoji} {t.label}</span>
      </td>
      <td className={`px-3 py-3 border-r ${td}`}>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${p.bg} ${p.color}`}>{p.label}</span>
      </td>
      <td className={`px-3 py-3 border-r ${td}`}>
        <div className="flex flex-col gap-0.5 min-w-[100px]">
          <span className={`text-[9px] font-black ${task.recurrenceMode === 'exata' ? 'text-blue-400' : 'text-purple-400'}`}>
            {task.recurrenceMode === 'exata' ? '📅 Exata' : '🔄 Flexível'}
          </span>
          <span className={`text-[9px] truncate max-w-[120px] ${isDark ? 'text-white/35' : 'text-slate-400'}`}>{task.recurrenceValue || '--'}</span>
        </div>
      </td>
      <td className={`px-3 py-3 border-r ${td}`}>
        <span className={`text-[10px] font-semibold whitespace-nowrap ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          {task.nextExecution
            ? new Date(task.nextExecution).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : '--'}
        </span>
      </td>
      <td className={`px-3 py-3 border-r ${td}`}>
        <select value={task.status} onChange={e => onStatusChange(e.target.value as TaskStatus)}
          className={`text-[9px] font-black px-2 py-1.5 rounded-xl border cursor-pointer outline-none transition-all ${s.bg} ${s.color}`}
          style={{ minWidth: '88px', background: 'transparent' }}>
          {(Object.keys(STATUS_META) as TaskStatus[]).map(st => (
            <option key={st} value={st} className="bg-slate-900 text-white">{STATUS_META[st].emoji} {STATUS_META[st].label}</option>
          ))}
        </select>
      </td>
      <td className={`px-3 py-3 border-r ${td} text-center`}>
        <span className={`text-[10px] font-semibold ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{formatDuration(task.estimatedDuration)}</span>
      </td>
      <td className={`px-3 py-3 border-r ${td} text-center`}>
        <span className={`text-[11px] font-black ${task.timesCompleted > 0 ? 'text-emerald-400' : isDark ? 'text-white/20' : 'text-slate-300'}`}>{task.timesCompleted}</span>
      </td>
      <td className={`px-3 py-3 border-r ${td}`}>
        {task.subtasks.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            <span className={`text-[10px] font-black ${subtasksDone === task.subtasks.length ? 'text-emerald-400' : isDark ? 'text-white/60' : 'text-slate-600'}`}>
              {subtasksDone}/{task.subtasks.length}
            </span>
            <div className={`w-12 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(subtasksDone / task.subtasks.length) * 100}%` }} />
            </div>
          </div>
        ) : <span className={`text-[9px] ${isDark ? 'text-white/15' : 'text-slate-200'}`}>--</span>}
      </td>
      <td className={`px-3 py-3 border-r ${td}`}>
        {task.gainedProperties.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {task.gainedProperties.slice(0, 2).map((g, i) => (
              <span key={i} className="text-[9px] text-emerald-400 font-bold whitespace-nowrap">+{g.name} {g.value}</span>
            ))}
          </div>
        ) : <span className={`text-[9px] ${isDark ? 'text-white/15' : 'text-slate-200'}`}>--</span>}
      </td>
      <td className={`px-3 py-3 border-r ${td}`}>
        <span className={`text-[9px] font-bold whitespace-nowrap ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>
          {formatInertia(task.lastCompletedAt, task.createdAt)} sem fazer
        </span>
      </td>
      <td className={`px-3 py-3 ${td}`}>
        <span className={`text-[9px] truncate max-w-[90px] block ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{task.notes || '--'}</span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="w-7 h-7 rounded-xl bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 flex items-center justify-center text-xs transition-all">✏️</button>
          <button onClick={onDelete} className="w-7 h-7 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center text-xs transition-all">🗑️</button>
        </div>
      </td>
    </tr>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface TasksTabProps {
  isDark: boolean;
  user: any;
  profile: PartnerProfile;
}

export const TasksTab: React.FC<TasksTabProps> = ({ isDark, user, profile }) => {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'table' | 'stats'>('table');
  const [isSaving, setIsSaving] = useState(false);
  const [ticker, setTicker] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Inertia ticker every minute
  useEffect(() => {
    const iv = setInterval(() => setTicker(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  // Persist tasks
  useEffect(() => { saveTasks(tasks); }, [tasks]);

  // Toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Calendar Integration: sync reminder from Supabase ──────────────────────

  /** Creates or updates a Supabase reminder linked to this task */
  const upsertReminder = useCallback(async (task: Task): Promise<string | null> => {
    if (!user || !task.nextExecution) return null;

    const reminderTitle = `📋 ${task.name}${task.category ? ` [${task.category}]` : ''}`;
    const triggerAt = new Date(task.nextExecution).toISOString();

    if (task.reminderId) {
      // Update existing
      await supabase.from('reminders').update({
        title: reminderTitle,
        trigger_at: triggerAt,
      }).eq('id', task.reminderId);
      return task.reminderId;
    } else {
      // Insert new
      const { data, error } = await supabase.from('reminders').insert({
        owner_id: user.id,
        title: reminderTitle,
        trigger_at: triggerAt,
        is_completed: false,
      }).select('id').single();
      if (error) { console.error('Reminder insert error:', error); return null; }
      return data?.id ?? null;
    }
  }, [user]);

  /** Deletes the linked Supabase reminder */
  const deleteLinkedReminder = useCallback(async (reminderId: string) => {
    if (!user || !reminderId) return;
    await supabase.from('reminders').delete().eq('id', reminderId);
  }, [user]);

  // ── AI Integration: when task's reminder is fired, AI speaks ──────────────
  // The CallScreen listens for 'reminder-triggered' window events.
  // When a linked reminder fires (from App.tsx scheduler), CallScreen already handles it.
  // Here we also listen so we can mark the task as triggered in real-time.
  useEffect(() => {
    const handler = (e: any) => {
      const title = e.detail?.title as string | undefined;
      if (!title) return;
      // Try to match tasks whose linked reminder title contains the task name
      setTasks(prev => prev.map(t => {
        if (t.reminderId && title.includes(t.name)) {
          return {
            ...t,
            status: t.status === 'em_aberto' ? 'pendente' : t.status,
          };
        }
        return t;
      }));
    };
    window.addEventListener('reminder-triggered', handler);
    return () => window.removeEventListener('reminder-triggered', handler);
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openNew = () => { setEditingTask(emptyTask()); setShowForm(true); };
  const openEdit = (task: Task) => { setEditingTask({ ...task }); setShowForm(true); };

  const saveTask = async () => {
    if (!editingTask) return;
    setIsSaving(true);

    let reminderId = editingTask.reminderId;

    // Sync to Supabase calendar if nextExecution is set
    if (editingTask.nextExecution && user) {
      reminderId = await upsertReminder(editingTask);
      showToast(`📅 Lembrete "${editingTask.name}" adicionado à Agenda!`);
    } else if (!editingTask.nextExecution && editingTask.reminderId) {
      // User cleared the date: remove reminder
      await deleteLinkedReminder(editingTask.reminderId);
      reminderId = null;
      showToast('📅 Lembrete removido da Agenda.');
    }

    const finalTask = { ...editingTask, reminderId };

    setTasks(prev => {
      const exists = prev.find(t => t.id === finalTask.id);
      return exists ? prev.map(t => t.id === finalTask.id ? finalTask : t) : [...prev, finalTask];
    });

    setIsSaving(false);
    setShowForm(false);
    setEditingTask(null);
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Excluir esta tarefa?')) return;
    const task = tasks.find(t => t.id === id);
    if (task?.reminderId) await deleteLinkedReminder(task.reminderId);
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast('🗑️ Tarefa excluída.');
  };

  const changeStatus = (id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updates: Partial<Task> = { status };
      if (status === 'concluido' || status === 'concluido_fora') {
        updates.timesCompleted = t.timesCompleted + 1;
        updates.lastCompletedAt = new Date().toISOString();
        if (status === 'concluido') showToast(`✅ "${t.name}" concluída! +${t.gainedProperties.map(g => g.name).join(', ')}`);
      }
      return { ...t, ...updates };
    }));
  };

  // ── SUBTASK TOGGLE in table ────────────────────────────────────────────────
  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s) };
    }));
  };

  // ── FILTERS ───────────────────────────────────────────────────────────────

  const categories = Array.from(new Set(tasks.map(t => t.category).filter(Boolean)));

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // ── STYLES ────────────────────────────────────────────────────────────────

  const bg   = isDark ? 'bg-[#0b0c10] text-white' : 'bg-[#f9f9fb] text-slate-900';
  const card = isDark ? 'bg-[#0e1117] border-white/5' : 'bg-white border-slate-100 shadow-sm';
  const inp  = isDark
    ? 'bg-[#1a1d26] border-white/10 text-white placeholder-white/20 focus:border-blue-500/50'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400';
  const th   = isDark ? 'bg-[#0e1117] text-white/30 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100';

  return (
    <div className={`min-h-screen p-4 md:p-8 ${bg}`}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[300] animate-in slide-in-from-right-4 fade-in duration-300">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${isDark ? 'bg-[#0e1117] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            {toast}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-3xl md:text-4xl font-black tracking-tighter uppercase italic ${isDark ? 'text-white' : 'text-slate-900'}`}>
            📋 Planilha de <span className="text-blue-500">Tarefas</span>
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
              {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
            </p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
              📅 Integrado à Agenda · 🤖 IA Avisará
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex rounded-2xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {(['table', 'stats'] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${activeView === v ? 'bg-blue-600 text-white' : isDark ? 'text-white/30 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'}`}>
                {v === 'table' ? '📊 Tabela' : '📈 Stats'}
              </button>
            ))}
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/25 hover:scale-[1.03] active:scale-95 transition-all">
            ✨ Nova Tarefa
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar tasks={tasks} isDark={isDark} />

      {/* Filters */}
      <div className={`rounded-2xl border p-4 mb-4 flex flex-wrap gap-3 items-center ${card}`}>
        <div className="flex items-center gap-2 flex-1 min-w-[160px]">
          <span className={isDark ? 'text-white/30' : 'text-slate-300'}>🔍</span>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefa..."
            className={`flex-1 bg-transparent outline-none text-sm font-semibold ${isDark ? 'text-white placeholder-white/20' : 'text-slate-900 placeholder-slate-300'}`} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className={`px-3 py-2 rounded-xl border text-[10px] font-black outline-none ${inp}`}>
          <option value="all">Todos os Status</option>
          {(Object.keys(STATUS_META) as TaskStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_META[s].emoji} {STATUS_META[s].label}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
          className={`px-3 py-2 rounded-xl border text-[10px] font-black outline-none ${inp}`}>
          <option value="all">Todos os Tipos</option>
          {(Object.keys(TYPE_META) as TaskType[]).map(t => (
            <option key={t} value={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</option>
          ))}
        </select>
        {categories.length > 0 && (
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-[10px] font-black outline-none ${inp}`}>
            <option value="">Todas Categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(filterStatus !== 'all' || filterType !== 'all' || filterCategory || searchQuery) && (
          <button onClick={() => { setFilterStatus('all'); setFilterType('all'); setFilterCategory(''); setSearchQuery(''); }}
            className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${isDark ? 'bg-white/5 text-white/40 hover:text-white/70' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Table or Stats */}
      {activeView === 'table' ? (
        filtered.length === 0 ? (
          <div className={`rounded-3xl border p-16 flex flex-col items-center gap-4 ${card}`}>
            <span className="text-5xl">📋</span>
            <p className={`text-lg font-black uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-slate-300'}`}>
              {tasks.length === 0 ? 'Nenhuma tarefa ainda' : 'Nenhuma tarefa encontrada'}
            </p>
            {tasks.length === 0 && (
              <button onClick={openNew} className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">
                ✨ Criar Primeira Tarefa
              </button>
            )}
          </div>
        ) : (
          <div className={`rounded-3xl border overflow-hidden ${card}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ minWidth: '1080px' }}>
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    {['ID', 'NOME DA TAREFA', 'CATEGORIA', 'TIPO', 'CLASSE', 'RECORRÊNCIA', 'PRÓX. EXEC.', 'STATUS', 'DUR. EST.', 'QUANT. FEITA', 'SUBTAREFAS', 'PROP. GANHAS', 'INÉRCIA ATUAL', 'NOTAS', ''].map(h => (
                      <th key={h} className={`px-3 py-3.5 text-[8px] font-black uppercase tracking-[0.15em] border-b border-r last:border-r-0 whitespace-nowrap ${th}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task, i) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      index={i}
                      onEdit={() => openEdit(task)}
                      onDelete={() => deleteTask(task.id)}
                      onStatusChange={s => changeStatus(task.id, s)}
                      isDark={isDark}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* ── Stats View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Category */}
          <div className={`rounded-3xl border p-6 ${card}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Por Categoria</h3>
            {categories.length === 0
              ? <p className={`text-xs ${isDark ? 'text-white/20' : 'text-slate-300'}`}>Nenhuma categoria cadastrada</p>
              : categories.map(cat => {
                const catTasks = tasks.filter(t => t.category === cat);
                const catDone  = catTasks.filter(t => t.status === 'concluido').length;
                return (
                  <div key={cat} className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-bold w-28 truncate ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{cat}</span>
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(catDone / catTasks.length) * 100}%` }} />
                    </div>
                    <span className={`text-[10px] font-black w-12 text-right ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{catDone}/{catTasks.length}</span>
                  </div>
                );
              })}
          </div>

          {/* By Type */}
          <div className={`rounded-3xl border p-6 ${card}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Por Tipo</h3>
            {(Object.keys(TYPE_META) as TaskType[]).map(type => {
              const count = tasks.filter(t => t.type === type).length;
              const done  = tasks.filter(t => t.type === type && t.status === 'concluido').length;
              return (
                <div key={type} className="flex items-center gap-3 mb-3">
                  <span className="text-sm w-6">{TYPE_META[type].emoji}</span>
                  <span className={`text-xs font-bold w-24 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{TYPE_META[type].label}</span>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: count > 0 ? `${(done / count) * 100}%` : '0%' }} />
                  </div>
                  <span className={`text-[10px] font-black w-6 text-right ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* By Priority */}
          <div className={`rounded-3xl border p-6 ${card}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Por Prioridade</h3>
            {(['A', 'B', 'C', 'D'] as TaskPriority[]).map(prio => {
              const count = tasks.filter(t => t.priority === prio).length;
              const pm = PRIORITY_META[prio];
              return (
                <div key={prio} className="flex items-center gap-3 mb-3">
                  <span className={`text-[10px] font-black w-16 ${pm.color}`}>{pm.label}</span>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <div className={`h-full rounded-full ${prio === 'A' ? 'bg-red-500' : prio === 'B' ? 'bg-orange-500' : prio === 'C' ? 'bg-yellow-500' : 'bg-slate-500'}`}
                      style={{ width: tasks.length > 0 ? `${(count / tasks.length) * 100}%` : '0%' }} />
                  </div>
                  <span className={`text-[10px] font-black w-6 text-right ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Top Inertia */}
          <div className={`rounded-3xl border p-6 ${card}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>⚠️ Maior Inércia (Negligenciadas)</h3>
            {tasks.length === 0
              ? <p className={`text-xs ${isDark ? 'text-white/20' : 'text-slate-300'}`}>Nenhuma tarefa</p>
              : tasks.slice().sort((a, b) => {
                const aBase = new Date(a.lastCompletedAt ?? a.createdAt).getTime();
                const bBase = new Date(b.lastCompletedAt ?? b.createdAt).getTime();
                return aBase - bBase;
              }).slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${PRIORITY_META[t.priority].bg} ${PRIORITY_META[t.priority].color}`}>{t.priority}</span>
                    <span className={`text-xs font-bold truncate max-w-[130px] ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{t.name}</span>
                  </div>
                  <span className="text-[9px] font-black text-amber-400 flex-shrink-0">
                    {formatInertia(t.lastCompletedAt, t.createdAt)} sem fazer
                  </span>
                </div>
              ))}
          </div>

          {/* Calendar Sync Summary */}
          <div className={`rounded-3xl border p-6 md:col-span-2 ${card}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>📅 Agenda & IA – Próximas Tarefas Agendadas</h3>
            {tasks.filter(t => t.nextExecution && t.reminderId).length === 0
              ? (
                <p className={`text-xs ${isDark ? 'text-white/20' : 'text-slate-300'}`}>
                  Nenhuma tarefa vinculada à Agenda ainda. Defina uma <strong>Próxima Execução</strong> ao criar uma tarefa.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tasks.filter(t => t.nextExecution && t.reminderId)
                    .sort((a, b) => new Date(a.nextExecution).getTime() - new Date(b.nextExecution).getTime())
                    .slice(0, 6)
                    .map(t => (
                      <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                        <span className="text-xl">{TYPE_META[t.type].emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{t.name}</p>
                          <p className={`text-[9px] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                            🕐 {new Date(t.nextExecution).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="text-[9px] font-black text-emerald-400">📅 IA vai avisar</span>
                      </div>
                    ))}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Task Form */}
      {showForm && editingTask && (
        <TaskForm
          task={editingTask}
          onChange={setEditingTask}
          onSave={saveTask}
          onClose={() => { setShowForm(false); setEditingTask(null); }}
          isDark={isDark}
          hasLinkedReminder={!!editingTask.reminderId}
        />
      )}

      {/* Loading overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className={`px-8 py-6 rounded-3xl border ${isDark ? 'bg-[#0e1117] border-white/10' : 'bg-white border-slate-200'} shadow-2xl flex items-center gap-4`}>
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Salvando e sincronizando agenda...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksTab;
