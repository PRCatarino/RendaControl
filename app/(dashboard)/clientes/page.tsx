'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/Avatar'
import StatusBadge from '@/components/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, X } from 'lucide-react'

type Cliente = {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  endereco: string | null
  status: string
  created_at: string
}

type Servico = {
  id: string
  descricao: string
  valor: number
  data_realizacao: string
  status: string
}

const STATUS_OPTIONS = ['ativo', 'inadimplente', 'novo', 'inativo']

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<Cliente | null>(null)
  const [historico, setHistorico] = useState<Servico[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // form
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [endereco, setEndereco] = useState('')
  const [statusForm, setStatusForm] = useState('ativo')
  const [editando, setEditando] = useState<Cliente | null>(null)

  const loadClientes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setClientes(data ?? [])
  }, [supabase])

  const loadHistorico = useCallback(async (clienteId: string) => {
    const { data } = await supabase
      .from('servicos')
      .select('id, descricao, valor, data_realizacao, status')
      .eq('cliente_id', clienteId)
      .order('data_realizacao', { ascending: false })
      .limit(10)
    setHistorico(data ?? [])
  }, [supabase])

  useEffect(() => { loadClientes() }, [loadClientes])

  useEffect(() => {
    if (selecionado) loadHistorico(selecionado.id)
  }, [selecionado, loadHistorico])

  function abrirForm(cliente?: Cliente) {
    setEditando(cliente ?? null)
    setNome(cliente?.nome ?? '')
    setTelefone(cliente?.telefone ?? '')
    setEmail(cliente?.email ?? '')
    setEndereco(cliente?.endereco ?? '')
    setStatusForm(cliente?.status ?? 'ativo')
    setShowForm(true)
  }

  function fecharForm() {
    setShowForm(false)
    setEditando(null)
    setNome(''); setTelefone(''); setEmail(''); setEndereco(''); setStatusForm('ativo')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = { nome, telefone, email, endereco, status: statusForm, user_id: user.id }

    if (editando) {
      await supabase.from('clientes').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('clientes').insert(payload)
    }

    await loadClientes()
    fecharForm()
    setLoading(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    if (selecionado?.id === id) setSelecionado(null)
    await loadClientes()
  }

  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const ativos = clientes.filter((c) => c.status === 'ativo').length
  const receitas = historico.reduce((acc, s) => acc + (s.status === 'pago' ? s.valor : 0), 0)
  const receitaMedia = clientes.length > 0
    ? clientes.length // placeholder — would need aggregate query
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gerencie sua carteira de clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total de Clientes</p>
          <p className="text-3xl font-bold text-gray-900">{clientes.length}</p>
          <p className="text-xs text-gray-400 mt-1">cadastrados</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Clientes Ativos</p>
          <p className="text-3xl font-bold text-gray-900">{ativos}</p>
          <p className="text-xs text-gray-400 mt-1">
            {clientes.length > 0 ? Math.round((ativos / clientes.length) * 100) : 0}% da base
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Receita Média</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(receitas)}</p>
          <p className="text-xs text-gray-400 mt-1">do cliente selecionado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Lista de Clientes</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 w-40"
                />
              </div>
              <button
                onClick={() => abrirForm()}
                className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                + Novo
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-5 py-2.5 text-left">Nome</th>
                <th className="px-5 py-2.5 text-left">Telefone</th>
                <th className="px-5 py-2.5 text-center">Serviços</th>
                <th className="px-5 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelecionado(c)}
                  className={`cursor-pointer transition-colors ${
                    selecionado?.id === c.id ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={c.nome} />
                      <span className="text-gray-800 font-medium">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{c.telefone ?? '—'}</td>
                  <td className="px-5 py-3 text-center text-gray-500">—</td>
                  <td className="px-5 py-3 text-center">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Painel direito */}
        <div className="space-y-4">
          {showForm && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">
                  {editando ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h3>
                <button onClick={fecharForm} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={salvar} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do cliente"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefone</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-0000"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail</label>
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Endereço</label>
                  <input
                    type="text"
                    placeholder="Rua, número, cidade"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                  <select
                    value={statusForm}
                    onChange={(e) => setStatusForm(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={fecharForm}
                    className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {selecionado && !showForm && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={selecionado.nome} size="md" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{selecionado.nome}</h3>
                    <p className="text-xs text-gray-400">{selecionado.email ?? selecionado.telefone ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirForm(selecionado)}
                    className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => excluir(selecionado.id)}
                    className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Histórico — {selecionado.nome.split(' ')[0]}
                </p>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {historico.map((s) => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-800 font-medium">{s.descricao}</p>
                      <p className="text-xs text-gray-400">{formatDate(s.data_realizacao)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{formatCurrency(s.valor)}</p>
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
                {historico.length === 0 && (
                  <p className="px-5 py-6 text-center text-gray-400 text-sm">
                    Nenhum serviço registrado para este cliente.
                  </p>
                )}
              </div>
            </div>
          )}

          {!selecionado && !showForm && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
              Selecione um cliente para ver o histórico ou clique em{' '}
              <button onClick={() => abrirForm()} className="text-green-600 hover:underline cursor-pointer">
                + Novo
              </button>{' '}
              para cadastrar.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
