/**
 * Edge-print text: uppercase DotGothic16. The face gives "I" a full monospace cell, which reads as a gap
 * ("MUS IC"), so each I is set narrower; screen readers get the plain words from the hidden copy.
 */
export function Edge({ children }: { children: string }) {
  const parts = children.toUpperCase().split('I')
  return (
    <span className="edge">
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {parts.map((p, i) => (
          <span key={i}>{p}{i < parts.length - 1 && <span className="edge-i">I</span>}</span>
        ))}
      </span>
    </span>
  )
}
