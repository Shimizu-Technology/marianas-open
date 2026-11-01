import { describe, expect, it } from 'vitest'
import { countryFlagUrl } from './countryFlag'
import { ISO_COUNTRY_CODES } from './isoCountryCodes'

describe('countryFlagUrl', () => {
  it('supports all 249 ISO alpha-2 and alpha-3 pairs without a network lookup', () => {
    expect(Object.keys(ISO_COUNTRY_CODES)).toHaveLength(249)
    expect(new Set(Object.values(ISO_COUNTRY_CODES)).size).toBe(249)
    for (const [alpha2, alpha3] of Object.entries(ISO_COUNTRY_CODES)) {
      const expected = `https://flagcdn.com/w40/${alpha2.toLowerCase()}.png`
      expect(countryFlagUrl(alpha2)).toBe(expected)
      expect(countryFlagUrl(alpha3)).toBe(expected)
      expect(countryFlagUrl(` ${alpha3.toLowerCase()} `)).toBe(expected)
    }
  })
  it.each([['TAI', 'tw'], ['TPE', 'tw'], ['GUM', 'gu'], ['MNP', 'mp'], ['HKG', 'hk'], ['MAC', 'mo'], ['KOS', 'xk'], ['XK', 'xk']])('resolves ASJJF / territory code %s', (code, alpha2) => {
    expect(countryFlagUrl(code)).toBe(`https://flagcdn.com/w40/${alpha2}.png`)
  })
  it.each([null, undefined, '', '  ', 'ZZ', 'ZZZ', 'USA.png', '../US', 'UK', 'US?x=1'])('rejects unknown or malformed code %s', code => {
    expect(countryFlagUrl(code)).toBeNull()
  })
})
