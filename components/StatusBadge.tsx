type Status = 'pago' | 'pendente' | 'atrasado' | 'ativo' | 'inadimplente' | 'novo' | 'inativo'

const LABELS: Record<Status, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
  ativo: 'Ativo',
  inadimplente: 'Inadimplente',
  novo: 'Novo',
  inativo: 'Inativo',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge-${status as Status}`}>
      {LABELS[status as Status] ?? status}
    </span>
  )
}
