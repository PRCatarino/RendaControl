'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/servicos', label: 'Serviços' },
  { href: '/financeiro', label: 'Financeiro' },
  { href: '/relatorios', label: 'Relatórios' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav style={{ backgroundColor: '#1a2e1a' }} className="flex items-center px-6 h-14 gap-8">
      <Link href="/" className="flex items-center gap-0 shrink-0">
        <span className="text-white font-bold text-lg">Renda</span>
        <span className="text-green-400 font-bold text-lg">Control</span>
      </Link>

      <div className="flex items-center gap-6 flex-1">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                active
                  ? 'text-white border-b-2 border-white pb-0.5'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </div>

      <button
        onClick={handleLogout}
        className="text-xs font-semibold text-gray-300 bg-[#2a3e2a] hover:bg-[#3a4e3a] px-4 py-1.5 rounded transition-colors cursor-pointer"
      >
        LOGOUT
      </button>
    </nav>
  )
}
