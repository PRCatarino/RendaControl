'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [tab, setTab] = useState<'entrar' | 'cadastrar'>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      if (tab === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } },
        })
        if (error) throw error
      }
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecuperar() {
    if (!email) { setErro('Digite seu e-mail para recuperar a senha'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/login`,
    })
    if (error) setErro(error.message)
    else setErro('E-mail de recuperação enviado!')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#1a2e1a' }}
    >
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center gap-12">
        {/* Left side */}
        <div className="flex-1 text-white">
          <div className="flex items-baseline gap-0 mb-2">
            <span className="text-3xl font-bold">Renda</span>
            <span className="text-3xl font-bold text-green-400">Control</span>
          </div>
          <p className="text-gray-300 mb-6 text-sm">Gestão financeira para autônomos e MEIs</p>
          <ul className="space-y-2.5 text-sm text-gray-200">
            {[
              'Controle de receitas e despesas',
              'Cadastro de clientes e serviços',
              'Relatórios financeiros por período',
              'Controle de pagamentos pendentes',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-[#243824] border border-[#2e4a2e] rounded-xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-1">Bem-vindo</h2>
          <p className="text-gray-400 text-sm mb-6">Acesse sua conta ou crie uma nova</p>

          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden mb-6 bg-[#1a2e1a]">
            {(['entrar', 'cadastrar'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setErro('') }}
                className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  tab === t
                    ? 'bg-green-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'entrar' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'cadastrar' && (
              <input
                type="text"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full bg-[#1a2e1a] border border-[#2e4a2e] text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
              />
            )}
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#1a2e1a] border border-[#2e4a2e] text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#1a2e1a] border border-[#2e4a2e] text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />

            {erro && (
              <p className={`text-xs ${erro.includes('enviado') ? 'text-green-400' : 'text-red-400'}`}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
            >
              {loading ? 'Aguarde...' : tab === 'entrar' ? 'Entrar na conta' : 'Criar conta'}
            </button>
          </form>

          {tab === 'entrar' && (
            <p className="text-center mt-4 text-sm text-gray-400">
              Esqueceu a senha?{' '}
              <button
                onClick={handleRecuperar}
                className="text-green-400 hover:underline cursor-pointer"
              >
                Recuperar
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
