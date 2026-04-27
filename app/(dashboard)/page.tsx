import { createClient } from '@/lib/supabase/server'
import { formatCurrency, mesAtual, primeiroNome, saudacao } from '@/lib/utils'
import Avatar from '@/components/Avatar'
import StatusBadge from '@/components/StatusBadge'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, servicosRes, despesasRes] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', user!.id).single(),
    supabase
      .from('servicos')
      .select('*, clientes(nome)')
      .eq('user_id', user!.id)
      .gte('data_realizacao', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      .order('created_at', { ascending: false }),
    supabase
      .from('despesas')
      .select('valor')
      .eq('user_id', user!.id)
      .gte('data', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
  ])

  const nome = profileRes.data?.nome ?? user!.email ?? 'usuário'
  const servicos = servicosRes.data ?? []
  const despesas = despesasRes.data ?? []

  const receita = servicos.filter((s) => s.status === 'pago').reduce((acc, s) => acc + s.valor, 0)
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0)
  const lucroLiquido = receita - totalDespesas
  const margem = receita > 0 ? Math.round((lucroLiquido / receita) * 100) : 0
  const pendentes = servicos.filter((s) => s.status === 'pendente' || s.status === 'atrasado')
  const cobrancasPendentes = pendentes.reduce((acc, s) => acc + s.valor, 0)
  const clientesAtraso = servicos.filter((s) => s.status === 'atrasado').length

  const recentes = servicos.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {saudacao()}, {primeiroNome(nome)} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Resumo financeiro — {mesAtual().charAt(0).toUpperCase() + mesAtual().slice(1)}
          </p>
        </div>
        <a
          href="/servicos"
          className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Novo serviço
        </a>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Despesas</p>
          <p className="text-3xl font-bold text-red-500">{formatCurrency(totalDespesas)}</p>
          <p className="text-xs text-gray-400 mt-1">{despesas.length} lançamentos</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Lucro Líquido</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(lucroLiquido)}</p>
          <p className="text-xs text-gray-400 mt-1">Margem {margem}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cobranças Pendentes</p>
          <p className="text-3xl font-bold text-amber-500">{formatCurrency(cobrancasPendentes)}</p>
          <p className="text-xs text-gray-400 mt-1">{clientesAtraso} cliente{clientesAtraso !== 1 ? 's' : ''} em atraso</p>
        </div>
      </div>

      {/* Serviços Recentes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Serviços Recentes</h2>
        </div>
        {recentes.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-400 text-sm">
            Nenhum serviço registrado este mês.{' '}
            <a href="/servicos" className="text-green-600 hover:underline">Registrar agora</a>
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-3 text-left">Cliente</th>
                <th className="px-6 py-3 text-left">Serviço</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentes.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={(s.clientes as { nome: string } | null)?.nome ?? '?'} />
                      <span className="text-gray-800">{(s.clientes as { nome: string } | null)?.nome ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{s.descricao}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-800">{formatCurrency(s.valor)}</td>
                  <td className="px-6 py-3 text-center">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Atividade Recente */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Atividade Recente</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {servicos.slice(0, 4).map((s) => {
            const clienteNome = (s.clientes as { nome: string } | null)?.nome ?? 'cliente'
            const msg =
              s.status === 'pago'
                ? `Pagamento recebido de ${clienteNome} — ${formatCurrency(s.valor)}`
                : s.status === 'atrasado'
                ? `Cobrança atrasada: ${clienteNome} — ${formatCurrency(s.valor)}`
                : `Novo serviço registrado para ${clienteNome}`

            const emoji = s.status === 'pago' ? '💰' : s.status === 'atrasado' ? '⚠️' : '📋'

            return (
              <div key={s.id} className="px-6 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span>{emoji}</span>
                  <span className="text-gray-700">{msg}</span>
                </div>
                <span className="text-gray-400 text-xs shrink-0">
                  {new Date(s.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )
          })}
          {servicos.length === 0 && (
            <p className="px-6 py-6 text-center text-gray-400 text-sm">Nenhuma atividade recente.</p>
          )}
        </div>
      </div>
    </div>
  )
}
