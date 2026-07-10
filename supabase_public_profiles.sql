-- SQL para liberar a leitura da tabela de profiles para a Galeria Global funcionar
-- Rode isso no SQL Editor do Supabase

-- Permite que qualquer pessoa (mesmo deslogada) possa ler a tabela de perfis
CREATE POLICY "Permitir leitura publica dos perfis" 
ON public.profiles FOR SELECT 
USING (true);

-- Atualiza cache do PostgREST
NOTIFY pgrst, 'reload schema';
