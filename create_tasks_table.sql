-- ============================================================
-- EXECUTE ESTE SQL NO SUPABASE DASHBOARD
-- Menu: SQL Editor > New Query > Cole e Execute
-- URL: https://supabase.com/dashboard/project/hmgsktcgjvohyesrucli/sql
-- ============================================================

-- 1. Criar tabela dedicada para tarefas
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,              -- identificador do usuario (pode ser email ou id)
  task_name   TEXT NOT NULL,              -- nome unico da tarefa por usuario
  task_data   JSONB NOT NULL,             -- dados completos da tarefa em JSON
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, task_name)             -- garante unicidade por usuario+nome
);

-- 2. Habilitar RLS
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

-- 3. Politica: qualquer um pode SELECT (necessario para sync entre dispositivos)
CREATE POLICY "Allow public select" ON public.user_tasks
  FOR SELECT USING (true);

-- 4. Politica: qualquer um pode INSERT (sem autenticacao obrigatoria)
CREATE POLICY "Allow public insert" ON public.user_tasks
  FOR INSERT WITH CHECK (true);

-- 5. Politica: qualquer um pode UPDATE
CREATE POLICY "Allow public update" ON public.user_tasks
  FOR UPDATE USING (true) WITH CHECK (true);

-- 6. Politica: qualquer um pode DELETE
CREATE POLICY "Allow public delete" ON public.user_tasks
  FOR DELETE USING (true);

-- 7. Habilitar realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_tasks;

-- 8. Verificar que a tabela foi criada corretamente
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_tasks' AND table_schema = 'public';
