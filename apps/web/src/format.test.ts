import type { AssetType, DecisionAction } from '@clippass/shared'
import { accountLink as sharedAccountLink } from '@clippass/shared'
import { accountLink, laneStates, xlm } from './format'

test('account links match the shared stellar.expert links', () => {
  expect(accountLink('GABC')).toBe(sharedAccountLink('GABC'))
})

test('formats stroop strings as exact XLM', () => {
  expect(xlm('1000000')).toBe('0.1')
  expect(xlm('20000000')).toBe('2')
  expect(xlm('193400000')).toBe('19.34')
  expect(xlm('1')).toBe('0.0000001')
  expect(xlm('0')).toBe('0')
})

test('laneStates counts paid assets per lane', () => {
  const t = (action: DecisionAction, assetType: AssetType) => ({ at: '', action, assetType, reason: '' })
  expect(laneStates([t('refused', 'exclusive'), t('paid', 'broll'), t('failed', 'broll'), t('paid', 'broll'), t('skip', 'sfx')]))
    .toEqual({ exclusive: { action: 'refused', count: 0 }, broll: { action: 'paid', count: 2 }, sfx: { action: 'skip', count: 0 } })
})
