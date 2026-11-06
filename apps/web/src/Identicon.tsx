/** FNV-1a address hash, mirrored across a five-square grid. */
export function Identicon({ address }: { address: string }) {
  let hash = 2166136261
  for (const c of address) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619)
  return <svg className="identicon" viewBox="0 0 5 5" width="30" height="30" aria-hidden="true" focusable="false">
    <path fill="var(--frame)" d="M0 0h5v5H0z" />
    {Array.from({ length: 25 }, (_, i) => {
      const x = i % 5, y = Math.floor(i / 5), bit = y * 3 + Math.min(x, 4 - x)
      return (hash >>> bit) & 1 ? <rect key={i} x={x} y={y} width="1" height="1" fill={bit % 2 ? 'var(--acetate)' : 'var(--print)'} /> : null
    })}
  </svg>
}
