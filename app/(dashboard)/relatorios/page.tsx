'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

type MesData = {
  mes: string
  receita: number
  despesas: number
  lucro: number
  servicos: number
}

type ClienteData = {
  nome: string
  total: number
  servicos: number
}

export default function RelatoriosPage() {
  const supabase = createClient()
  const [meses, setMeses] = useState<MesData[]>([])
  const [clientes, setClientes] = useState<ClienteData[]>([])
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: servicos }, { data: despesas }] = await Promise.all([
      supabase
        .from('servicos')
        .select('valor, data_realizacao, status, clientes(nome)')
        .eq('user_id', user.id)
        .gte('data_realizacao', `${anoFiltro}-01-01`)
        .lte('data_realizacao', `${anoFiltro}-12-31`),
      supabase
        .from('despesas')
        .select('valor, data')
        .eq('user_id', user.id)
        .gte('data', `${anoFiltro}-01-01`)
        .lte('data', `${anoFiltro}-12-31`),
    ])

    // Agrupar por mês
    const mesMap: Record<string, MesData> = {}
    for (let m = 1; m <= 12; m++) {
      const key = `${anoFiltro}-${String(m).padStart(2, '0')}`
      mesMap[key] = { mes: key, receita: 0, despesas: 0, lucro: 0, servicos: 0 }
    }

    for (const s of servicos ?? []) {
      const key = s.data_realizacao.slice(0, 7)
      if (mesMap[key]) {
        if (s.status === 'pago') mesMap[key].receita += s.valor
        mesMap[key].servicos += 1
      }
    }

    for (const d of despesas ?? []) {
      const key = d.data.slice(0, 7)
      if (mesMap[key]) mesMap[key].despesas += d.valor
    }

    for (const m of Object.values(mesMap)) {
      m.lucro = m.receita - m.despesas
    }

    setMeses(Object.values(mesMap))

    // Top clientes
    const clienteMap: Record<string, ClienteData> = {}
    for (const s of servicos ?? []) {
      const nome = (s.clientes as unknown as { nome: string } | null)?.nome
      if (!nome) continue
      if (!clienteMap[nome]) clienteMap[nome] = { nome, total: 0, servicos: 0 }
      if (s.status === 'pago') clienteMap[nome].total += s.valor
      clienteMap[nome].servicos += 1
    }

    setClientes(
      Object.values(clienteMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
    )
    setLoading(false)
  }, [supabase, anoFiltro])

  useEffect(() => { loadData() }, [loadData])

  const totalReceita = meses.reduce((acc, m) => acc + m.receita, 0)
  const totalDespesas = meses.reduce((acc, m) => acc + m.despesas, 0)
  const totalLucro = totalReceita - totalDespesas
  const margem = totalReceita > 0 ? Math.round((totalLucro / totalReceita) * 100) : 0
  const maxReceita = Math.max(...meses.map((m) => m.receita), 1)

  const anos = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2]

  const MESES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 text-sm mt-0.5">Visão anual do seu negócio</p>
        </div>
        <select
          value={anoFiltro}
          onChange={(e) => setAnoFiltro(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
        >
          {anos.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>

      {/* Resumo anual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Receita Total</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceita)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Despesas</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDespesas)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Lucro Líquido</p>
          <p className={`text-2xl font-bold ${totalLucro >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(totalLucro)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Margem Média</p>
          <p className="text-2xl font-bold text-gray-900">{margem}%</p>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider mb-6">
          Receita por Mês — {anoFiltro}
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Carregando...</div>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {meses.map((m, i) => {
              const height = maxReceita > 0 ? (m.receita / maxReceita) * 100 : 0
              return (
                <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">
                    {m.receita > 0 ? formatCurrency(m.receita).replace('R$ ', '') : ''}
                  </span>
                  <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                    <div
                      className={`w-full rounded-t-sm transition-all ${m.receita > 0 ? 'bg-green-400' : 'bg-gray-100'}`}
                      style={{ height: `${Math.max(height, m.receita > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{MESES_LABELS[i]}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela mensal */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Resumo Mensal</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-5 py-2.5 text-left">Mês</th>
                <th className="px-5 py-2.5 text-right">Receita</th>
                <th className="px-5 py-2.5 text-right">Despesas</th>
                <th className="px-5 py-2.5 text-right">Lucro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {meses.filter((m) => m.receita > 0 || m.despesas > 0).map((m, i) => (
                <tr key={m.mes} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-800 font-medium">
                    {MESES_LABELS[parseInt(m.mes.split('-')[1]) - 1]}
                  </td>
                  <td className="px-5 py-3 text-right text-green-600 font-semibold">{formatCurrency(m.receita)}</td>
                  <td className="px-5 py-3 text-right text-red-500">{formatCurrency(m.despesas)}</td>
                  <td className={`px-5 py-3 text-right font-bold ${m.lucro >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatCurrency(m.lucro)}
                  </td>
                </tr>
              ))}
              {meses.every((m) => m.receita === 0 && m.despesas === 0) && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">
                  Nenhum dado para {anoFiltro}.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top clientes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Top Clientes</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {clientes.map((c, i) => (
              <div key={c.nome} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-gray-800 font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-gray-400">{c.servicos} serviço{c.servicos !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span className="font-bold text-green-600 text-sm">{formatCurrency(c.total)}</span>
              </div>
            ))}
            {clientes.length === 0 && (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">Sem dados para este período.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
