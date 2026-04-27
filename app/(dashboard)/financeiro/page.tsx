'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, X } from 'lucide-react'

type Servico = {
  id: string
  descricao: string
  valor: number
  data_realizacao: string
  status: string
  clientes: { nome: string } | null
}

type Despesa = {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: string
}

const CATEGORIAS = ['materiais', 'software', 'transporte', 'marketing', 'alimentação', 'outros']

export default function FinanceiroPage() {
  const supabase = createClient()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [filtroMes, setFiltroMes] = useState(() => new Date().toISOString().slice(0, 7))
  const [showFormDespesa, setShowFormDespesa] = useState(false)
  const [loading, setLoading] = useState(false)

  // form despesa
  const [descDespesa, setDescDespesa] = useState('')
  const [valorDespesa, setValorDespesa] = useState('')
  const [dataDespesa, setDataDespesa] = useState(new Date().toISOString().split('T')[0])
  const [categoriaDespesa, setCategoriaDespesa] = useState('outros')

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [inicio, fim] = [filtroMes + '-01', filtroMes + '-31']

    const [{ data: s }, { data: d }] = await Promise.all([
      supabase
        .from('servicos')
        .select('id, descricao, valor, data_realizacao, status, clientes(nome)')
        .eq('user_id', user.id)
        .gte('data_realizacao', inicio)
        .lte('data_realizacao', fim)
        .order('data_realizacao', { ascending: false }),
      supabase
        .from('despesas')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', inicio)
        .lte('data', fim)
        .order('data', { ascending: false }),
    ])

    setServicos((s ?? []) as unknown as Servico[])
    setDespesas(d ?? [])
  }, [supabase, filtroMes])

  useEffect(() => { loadData() }, [loadData])

  async function salvarDespesa(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('despesas').insert({
      user_id: user.id,
      descricao: descDespesa,
      valor: parseFloat(valorDespesa),
      data: dataDespesa,
      categoria: categoriaDespesa,
    })

    setDescDespesa(''); setValorDespesa(''); setCategoriaDespesa('outros')
    setDataDespesa(new Date().toISOString().split('T')[0])
    setShowFormDespesa(false)
    await loadData()
    setLoading(false)
  }

  async function excluirDespesa(id: string) {
    if (!confirm('Excluir esta despesa?')) return
    await supabase.from('despesas').delete().eq('id', id)
    await loadData()
  }

  const receita = servicos.filter((s) => s.status === 'pago').reduce((acc, s) => acc + s.valor, 0)
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0)
  const lucro = receita - totalDespesas
  const pendente = servicos.filter((s) => s.status !== 'pago').reduce((acc, s) => acc + s.valor, 0)

  // Meses disponíveis (últimos 12)
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-0.5">Controle de receitas e despesas</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {new Date(m + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowFormDespesa(true)}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Receita</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(receita)}</p>
          <p className="text-xs text-gray-400 mt-1">{servicos.filter((s) => s.status === 'pago').length} serviços pagos</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Despesas</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDespesas)}</p>
          <p className="text-xs text-gray-400 mt-1">{despesas.length} lançamentos</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Lucro Líquido</p>
          <p className={`text-2xl font-bold ${lucro >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(lucro)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            margem {receita > 0 ? Math.round((lucro / receita) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">A Receber</p>
          <p className="text-2xl font-bold text-amber-500">{formatCurrency(pendente)}</p>
          <p className="text-xs text-gray-400 mt-1">{servicos.filter((s) => s.status !== 'pago').length} pendentes</p>
        </div>
      </div>

      {/* Form despesa (modal inline) */}
      {showFormDespesa && (
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Nova Despesa</h3>
            <button onClick={() => setShowFormDespesa(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={salvarDespesa} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição *</label>
              <input
                type="text"
                value={descDespesa}
                onChange={(e) => setDescDespesa(e.target.value)}
                placeholder="Ex: Adobe CC, Gasolina..."
                required
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor (R$) *</label>
              <input
                type="number"
                value={valorDespesa}
                onChange={(e) => setValorDespesa(e.target.value)}
                placeholder="0,00"
                required
                min="0"
                step="0.01"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data *</label>
              <input
                type="date"
                value={dataDespesa}
                onChange={(e) => setDataDespesa(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</label>
              <select
                value={categoriaDespesa}
                onChange={(e) => setCategoriaDespesa(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              >
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => setShowFormDespesa(false)}
                className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Serviços do mês */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Serviços</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-5 py-2.5 text-left">Cliente</th>
                <th className="px-5 py-2.5 text-left">Serviço</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
                <th className="px-5 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {servicos.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-600 text-xs">{s.clientes?.nome ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-800">{s.descricao}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatCurrency(s.valor)}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
              {servicos.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">Sem serviços neste período.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Despesas do mês */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Despesas</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-5 py-2.5 text-left">Descrição</th>
                <th className="px-5 py-2.5 text-left">Data</th>
                <th className="px-5 py-2.5 text-left">Categoria</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {despesas.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3 text-gray-800">{d.descricao}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(d.data)}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs capitalize">{d.categoria}</td>
                  <td className="px-5 py-3 text-right font-semibold text-red-500">
                    <span className="flex items-center justify-end gap-2">
                      {formatCurrency(d.valor)}
                      <button
                        onClick={() => excluirDespesa(d.id)}
                        className="hidden group-hover:block text-red-400 hover:text-red-600 cursor-pointer"
                        title="Excluir"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {despesas.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">Sem despesas neste período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
