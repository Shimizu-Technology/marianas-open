import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { serializeStructuredData } from './structuredData'
import SEO from '../components/SEO'

it('escapes hostile JSON-LD without changing its contents', () => {
  const value = { name: '</script><script>alert("x")</script>&\u2028\u2029', nested: { text: 'a > b' } }
  const json = serializeStructuredData(value)
  expect(json).not.toMatch(/[<>&\u2028\u2029]/)
  expect(JSON.parse(json)).toEqual(value)
})

it('uses escaped JSON-LD in the actual SEO script', () => {
  const html = renderToStaticMarkup(<HelmetProvider><MemoryRouter><SEO structuredData={[{ name: '</script><script>bad()</script>' }]} /></MemoryRouter></HelmetProvider>)
  expect((html.match(/<script/g) || []).length).toBe(1)
  expect(html).toContain('\\u003c/script\\u003e')
})

const locales = import.meta.glob('../locales/*.json', { eager: true, import: 'default' }) as Record<string, Record<string, Record<string, string>>>
it('has current rules and retry messages in all seven locales', () => {
  const en = locales['../locales/en.json']
  for (const locale of ['en', 'ja', 'ko', 'pt', 'tl', 'zh', 'zh-Hant']) {
    const strings = locales[`../locales/${locale}.json`]
    for (const key of ['rulebookLabel', 'rulebookCopy', 'opensExternally', 'contactNote', 'officialSourceLinkText', 'secondarySourceLinkText']) {
      expect(typeof strings.rules[key]).toBe('string')
      expect(strings.rules[key]).not.toMatch(/PDF/)
      if (locale !== 'en') expect(strings.rules[key]).not.toBe(en.rules[key])
    }
    for (const key of ['loadErrorTitle', 'loadErrorMessage', 'retry']) {
      expect(strings.eventDetail[key].length).toBeGreaterThan(0)
      if (locale !== 'en') expect(strings.eventDetail[key]).not.toBe(en.eventDetail[key])
    }
  }
})
