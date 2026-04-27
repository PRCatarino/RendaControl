import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RendaControl — Gestão financeira para autônomos e MEIs',
  description: 'Controle suas receitas, despesas, clientes e serviços em um só lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
