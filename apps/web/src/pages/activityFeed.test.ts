import type { ActivityItem } from '@clippass/shared'
import { newestFirst, relativeTime } from './activityFeed'

test('activity sorts newest first without changing the response', () => {
  const rows: ActivityItem[] = [
    { id: 'old', at: '2026-11-06T12:00:00Z', kind: 'paid', amount: '300000' },
    { id: 'new', at: '2026-11-06T12:05:00Z', kind: 'refused', amount: '20000000' },
  ]
  expect(newestFirst(rows).map(row => row.id)).toEqual(['new', 'old'])
  expect(rows.map(row => row.id)).toEqual(['old', 'new'])
})

test('relative times cross minute, hour and day boundaries and tolerate clock skew', () => {
  const now = Date.parse('2026-11-07T12:00:00Z')
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString()
  expect(relativeTime(ago(59), now)).toBe('Just now')
  expect(relativeTime(ago(60), now)).toBe('1m ago')
  expect(relativeTime(ago(3599), now)).toBe('59m ago')
  expect(relativeTime(ago(3600), now)).toBe('1h ago')
  expect(relativeTime(ago(86400), now)).toBe('1d ago')
  expect(relativeTime(ago(-60), now)).toBe('Just now')
  expect(relativeTime('invalid', now)).toBe('—')
})
