import { ISO_COUNTRY_CODES } from './isoCountryCodes'

const countryCodes = new Map<string, string>()
for (const [alpha2, alpha3] of Object.entries(ISO_COUNTRY_CODES)) {
  countryCodes.set(alpha2, alpha2)
  countryCodes.set(alpha3, alpha2)
}
// ASJJF country labels, plus Kosovo's widely used flag code.
for (const [code, alpha2] of Object.entries({ TAI: 'TW', TPE: 'TW', KOS: 'XK', XKX: 'XK', XK: 'XK' })) {
  countryCodes.set(code, alpha2)
}

export function countryFlagUrl(code?: string | null): string | null {
  const alpha2 = countryCodes.get(code?.trim().toUpperCase() ?? '')
  return alpha2 ? `https://flagcdn.com/w40/${alpha2.toLowerCase()}.png` : null
}
