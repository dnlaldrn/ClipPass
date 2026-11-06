import type { ReactNode } from 'react'

/** A grease-pencil ring drawn around a refusal. The mark stays, like the cross on the refused frame. */
export function PencilMark({ children }: { children: ReactNode }) {
  return (
    <span className="pencil">
      {children}
      <svg className="pencil-ring" viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {/* one loop that hugs the edges; the overshoot runs along the top, clear of the text */}
        <path d="M18 6 C 60 1, 104 3, 114 14 C 121 24, 112 37, 88 40 C 60 43, 22 42, 8 33 C -1 26, 4 12, 20 6 C 34 2, 52 3, 64 4" />
      </svg>
    </span>
  )
}
