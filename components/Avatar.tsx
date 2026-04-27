const COLORS = [
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-purple-200 text-purple-800',
  'bg-orange-200 text-orange-800',
  'bg-pink-200 text-pink-800',
  'bg-teal-200 text-teal-800',
]

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function colorFor(name: string) {
  const idx = name.charCodeAt(0) % COLORS.length
  return COLORS[idx]
}

export default function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <span className={`${s} ${colorFor(name)} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {initials(name)}
    </span>
  )
}
