import { useCallback, useEffect, useState } from 'react'

/** The loader must be stable (an imported function or a module-level function). */
export function usePageData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    void load().then(value => { if (alive) setData(value) })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [load, attempt])
  return { data, loading, error, retry }
}
