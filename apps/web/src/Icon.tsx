export type IconName = 'copy' | 'check' | 'external' | 'speaker' | 'muted' | 'quote' | 'pick' | 'card' | 'paid' | 'refused' | 'skip' | 'plan' | 'done' | 'failed' | 'sun' | 'moon'
const paths: Record<IconName, string> = {
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
  moon: 'M21 13a9 9 0 1 1-10-10 8 8 0 0 0 10 10z',
  copy: 'M8 8h12v12H8z M4 15V4h11', check: 'm5 12 4 4L19 6', external: 'M14 4h6v6 M20 4 10 14 M10 4H4v16h16v-6',
  speaker: 'M11 4 5 9H2v6h3l6 5z M15 8c3 2 3 6 0 8 M18 4c6 4 6 12 0 16',
  muted: 'M11 4 5 9H2v6h3l6 5z M16 9l6 6 M22 9l-6 6', quote: 'M3 5h18v14H3z M7 9h10 M7 14h5',
  pick: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z m10 3 2 2 5-6', card: 'M3 5h18v14H3z M3 10h18 M7 15h4',
  paid: 'M4 4h16v16H4z m3 8 3 3 7-7', refused: 'M5 5l14 14 M19 5 5 19', skip: 'm5 5 10 7-10 7z M19 5v14',
  plan: 'M4 6h3 M11 6h9 M4 12h3 M11 12h9 M4 18h3 M11 18h9', done: 'm4 12 5 5L20 5', failed: 'M12 3 2 21h20z M12 9v5 M12 17v1',
}
export function Icon({ name }: { name: IconName }) {
  return <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>
}
