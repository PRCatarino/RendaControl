'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'

type Cliente = { id: string; nome: string }
type Servico = {
  id: string
  descricao: string
  valor: number
  data_realizacao: string
  forma_pagamento: string
  status: string
  materiais_custo: number
  cliente_id: string | null
  clientes: { nome: string } | null
}

const FORMAS = ['PIX', 'Dinheiro', 'Cartão Crédito', 'Cartão Débito', 'Transferência', 'Boleto']
const STATUS_OPTS = ['pendente', 'pago', 'atrasado']

export default function ServicosPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [loading, setLoading] = useState(false)

  // form
  const [clienteId, setClienteId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [forma, setForma] = useState('PIX')
  const [status, setStatus] = useState('pendente')
  const [materiais, setMateriais] = useState('')
  const lucroEstimado = parseFloat(valor || '0') - parseFloat(materiais || '0')

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from('clientes').select('id, nome').eq('user_id', user.id).order('nome'),
      supabase
        .from('servicos')
        .select('*, clientes(nome)')
        .eq('user_id', user.id)
        .order('data_realizacao', { ascending: false }),
    ])

    setClientes(c ?? [])
    setServicos((s ?? []) as Servico[])
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  function limpar() {
    setClienteId(''); setDescricao(''); setValor(''); setData(new Date().toISOString().split('T')[0])
    setForma('PIX'); setStatus('pendente'); setMateriais('')
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('servicos').insert({
      user_id: user.id,
      cliente_id: clienteId || null,
      descricao,
      valor: parseFloat(valor),
      data_realizacao: data,
      forma_pagamento: forma,
      status,
      materiais_custo: parseFloat(materiais || '0'),
    })

    await loadData()
    limpar()
    setLoading(false)
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    await supabase.from('servicos').update({ status: novoStatus }).eq('id', id)
    await loadData()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este serviço?')) return
    await supabase.from('servicos').delete().eq('id', id)
    await loadData()
  }

  const filtrados = filtroStatus === 'todos'
    ? servicos
    : servicos.filter((s) => s.status === filtroStatus)

  const noMes = servicos.filter((s) => {
    const d = new Date(s.data_realizacao)
    const agora = new Date()
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
  })
  const receitaMes = noMes.filter((s) => s.status === 'pago').reduce((acc, s) => acc + s.valor, 0)
  const ticketMedio = noMes.length > 0 ? noMes.reduce((acc, s) => acc + s.valor, 0) / noMes.length : 0
  const pagos = noMes.filter((s) => s.status === 'pago').length
  const taxaPagamento = noMes.length > 0 ? Math.round((pagos / noMes.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
        <p className="text-gray-500 text-sm mt-0.5">Registre e acompanhe os serviços prestados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Serviços no Mês</p>
          <p className="text-3xl font-bold text-gray-900">{noMes.length}</p>
          <p className="text-xs text-gray-400 mt-1">{noMes.filter((s) => s.status === 'pendente').length} em andamento</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Receita Gerada</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(receitaMes)}</p>
          <p className="text-xs text-gray-400 mt-1">este mês</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ticket Médio</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(ticketMedio)}</p>
          <p className="text-xs text-gray-400 mt-1">por serviço</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Taxa de Pagamento</p>
          <p className="text-3xl font-bold text-gray-900">{taxaPagamento}%</p>
          <p className="text-xs text-gray-400 mt-1">{pagos} de {noMes.length} pagos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider mb-4">
            Registrar Novo Serviço
          </h2>
          <form onSubmit={registrar} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente *</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição *</label>
              <input
                type="text"
                placeholder="Ex: Design logo, Site institucional..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor (R$) *</label>
                <input
                  type="number"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data de Realização</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Forma de Pagamento</label>
                <select
                  value={forma}
                  onChange={(e) => setForma(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                >
                  {FORMAS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status do Pagamento</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                >
                  {STATUS_OPTS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Materiais Utilizados (custo R$)
              </label>
              <input
                type="number"
                placeholder="Item — valor gasto (opcional)"
                value={materiais}
                onChange={(e) => setMateriais(e.target.value)}
                min="0"
                step="0.01"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Lucro Líquido Estimado
              </label>
              <input
                readOnly
                value={lucroEstimado > 0 ? formatCurrency(lucroEstimado) : '—'}
                className="mt-1 w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Registrando...' : 'Registrar'}
              </button>
              <button
                type="button"
                onClick={limpar}
                className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Serviços Registrados</h2>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-400"
            >
              <option value="todos">Todos os status</option>
              {STATUS_OPTS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-5 py-2.5 text-left">Descrição</th>
                <th className="px-5 py-2.5 text-left">Cliente</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
                <th className="px-5 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3 text-gray-800 font-medium">{s.descricao}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{s.clientes?.nome ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">{formatCurrency(s.valor)}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <StatusBadge status={s.status} />
                      <div className="hidden group-hover:flex gap-1">
                        {STATUS_OPTS.filter((o) => o !== s.status).map((o) => (
                          <button
                            key={o}
                            onClick={() => atualizarStatus(s.id, o)}
                            className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
                            title={`Marcar como ${o}`}
                          >
                            →{o.slice(0, 3)}
                          </button>
                        ))}
                        <button
                          onClick={() => excluir(s.id)}
                          className="text-xs text-red-400 hover:text-red-600 cursor-pointer ml-1"
                          title="Excluir"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">
                    Nenhum serviço encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
