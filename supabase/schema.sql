-- RendaControl — Schema Supabase
-- Execute no SQL Editor do projeto Supabase

-- Perfis de usuário (extensão do auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê só o próprio perfil"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inadimplente', 'novo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia seus clientes"
  ON public.clientes FOR ALL
  USING (auth.uid() = user_id);

-- Serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
  data_realizacao DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT DEFAULT 'PIX',
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente', 'atrasado')),
  materiais_custo NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia seus serviços"
  ON public.servicos FOR ALL
  USING (auth.uid() = user_id);

-- Despesas
CREATE TABLE IF NOT EXISTS public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT DEFAULT 'outros',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia suas despesas"
  ON public.despesas FOR ALL
  USING (auth.uid() = user_id);

-- View: resumo financeiro do mês
CREATE OR REPLACE VIEW public.resumo_financeiro AS
SELECT
  s.user_id,
  DATE_TRUNC('month', s.data_realizacao) AS mes,
  SUM(s.valor) FILTER (WHERE s.status = 'pago') AS receita_total,
  SUM(s.valor) FILTER (WHERE s.status IN ('pendente', 'atrasado')) AS pendente_total,
  COUNT(*) FILTER (WHERE s.status = 'atrasado') AS clientes_atraso
FROM public.servicos s
GROUP BY s.user_id, DATE_TRUNC('month', s.data_realizacao);
