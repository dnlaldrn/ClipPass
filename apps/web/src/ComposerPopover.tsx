import { useEffect, useId, useRef, type ReactNode } from 'react'

export function ComposerPopover({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dismiss = () => {
      if (panel.current?.matches(':popover-open')) panel.current.hidePopover()
    }
    window.addEventListener('scroll', dismiss, { passive: true })
    window.addEventListener('resize', dismiss)
    return () => {
      window.removeEventListener('scroll', dismiss)
      window.removeEventListener('resize', dismiss)
    }
  }, [])

  return <>
    <button type="button" className="composer-trigger" {...{ popovertarget: id }} onClick={event => {
      const content = panel.current
      if (!content) return
      const rect = event.currentTarget.getBoundingClientRect()
      const width = Math.min(304, document.documentElement.clientWidth - 24)
      const above = rect.top > 200
      content.style.width = `${width}px`
      content.style.maxHeight = `${Math.max(0, above ? rect.top - 20 : window.innerHeight - rect.bottom - 20)}px`
      content.style.left = `${Math.max(12, Math.min(rect.left, document.documentElement.clientWidth - width - 12))}px`
      content.style.top = `${above ? rect.top - 8 : rect.bottom + 8}px`
      content.style.transform = above ? 'translateY(-100%)' : ''
    }}>{label}</button>
    <div id={id} ref={panel} className="composer-popover" {...{ popover: 'auto' }}>{children}</div>
  </>
}
