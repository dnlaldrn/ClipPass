import type { CatalogItem } from '@clippass/shared'
import { filterLibrary, gaugePercent, gaugeScale, groupStudios } from './catalog'

const asset = (id: string, price: string, overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  id, price, title: id, type: 'music', artistId: 'lowtide', artist: 'Lowtide Loops',
  address: 'GLOWTIDE', tags: ['chill'], ...overrides,
})

test('library combines lane and case-insensitive title or tag search', () => {
  const assets = [asset('Night Drift', '2200000'), asset('Rain', '800000', { type: 'broll', tags: ['city'] })]
  expect(filterLibrary(assets, 'music', ' NIGHT ', 'asc').map(row => row.id)).toEqual(['Night Drift'])
  expect(filterLibrary(assets, 'all', 'CITY', 'asc').map(row => row.id)).toEqual(['Rain'])
  expect(filterLibrary(assets, 'music', 'city', 'asc')).toEqual([])
  expect(filterLibrary(assets, 'all', '   ', 'asc')).toHaveLength(2)
})

test('price sorting stays exact beyond safe integers and leaves the catalog untouched', () => {
  const assets = [asset('higher', '9007199254740993'), asset('lower', '9007199254740992')]
  expect(filterLibrary(assets, 'all', '', 'asc').map(row => row.id)).toEqual(['lower', 'higher'])
  expect(filterLibrary(assets, 'all', '', 'desc').map(row => row.id)).toEqual(['higher', 'lower'])
  expect(assets.map(row => row.id)).toEqual(['higher', 'lower'])
})

test('equal prices sort consistently by title in either direction', () => {
  const assets = [asset('Zulu', '1'), asset('Alpha', '1')]
  expect(filterLibrary(assets, 'all', '', 'asc').map(row => row.id)).toEqual(['Alpha', 'Zulu'])
  expect(filterLibrary(assets, 'all', '', 'desc').map(row => row.id)).toEqual(['Alpha', 'Zulu'])
})

test('gauge retains the card limit when empty and positions an over-limit price', () => {
  const scale = gaugeScale([asset('exclusive', '20000000')], '10000000')
  expect(gaugePercent('10000000', scale)).toBe(50)
  expect(gaugePercent('20000000', scale)).toBe(100)
  expect(gaugePercent('30000000', scale)).toBe(100)
  expect(gaugeScale([], '10000000')).toBe(10000000n)
  expect(gaugePercent('0', gaugeScale([], '0'))).toBe(0)
})

test('studios join pending balances by id, retain empty studios, and sort asset prices', () => {
  const catalog = [asset('high', '10'), asset('low', '2'), asset('missing', '3', { artistId: 'fern', artist: 'Foley Fern' })]
  const studios = groupStudios(catalog, { escrow: '0', artists: [
    { id: 'lowtide', name: 'Lowtide Loops', address: 'GLOWTIDE', pending: '900000' },
    { id: 'kestrel', name: 'Kestrel Studio', address: 'GKESTREL', pending: '0' },
  ] })
  expect(studios.map(studio => studio.name)).toEqual(['Foley Fern', 'Kestrel Studio', 'Lowtide Loops'])
  expect(studios[0].pending).toBeNull()
  expect(studios[1].assets).toEqual([])
  expect(studios[2].pending).toBe('900000')
  expect(studios[2].assets.map(row => row.id)).toEqual(['low', 'high'])
  expect(catalog.map(row => row.id)).toEqual(['high', 'low', 'missing'])
})
