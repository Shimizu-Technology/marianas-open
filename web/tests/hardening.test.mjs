import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const server = await createServer({
  configFile: false,
  ssr: { noExternal: ['@clerk/clerk-react'] },
  server: { middlewareMode: true, watch: null },
  plugins: [{
    name: 'local-clerk-render-stub',
    enforce: 'pre',
    resolveId(id) { if (id === '@clerk/clerk-react') return '\0clerk-render-stub'; },
    load(id) {
      if (id === '\0clerk-render-stub') return `
        import React from 'react';
        export const SignIn = props => React.createElement('div', {className: 'bg-white text-slate-900 rounded-xl p-8 w-full', 'data-flow': 'sign-in', 'data-signup': String(props.withSignUp), 'data-footer': props.appearance.elements.footerAction.display}, React.createElement('h1', {className: 'text-xl font-bold mb-4'}, 'Sign in to admin'), React.createElement('label', null, 'Email address', React.createElement('input', {type:'email', className:'border rounded p-2 w-full my-3'})), React.createElement('button', {className:'bg-slate-900 text-white rounded p-3 w-full'}, 'Continue'), React.createElement('p', {className:'text-xs mt-4'}, 'Local Clerk render stub'));
        export const SignUp = props => React.createElement('div', {className:'bg-white text-slate-900 rounded-xl p-8 w-full', 'data-flow': 'invite-sign-up', 'data-redirect': props.forceRedirectUrl}, React.createElement('h1', {className:'text-xl font-bold mb-4'}, 'Accept your invitation'), React.createElement('p', null, 'Local Clerk invitation render stub'));
      `;
    },
  }],
});
after(() => server.close());
const { serializeStructuredData } = await server.ssrLoadModule('/src/lib/structuredData.ts');
const { default: AdminSignIn } = await server.ssrLoadModule('/src/components/auth/AdminSignIn.tsx');
const { default: SEO } = await server.ssrLoadModule('/src/components/SEO.tsx');

function login(path) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(AdminSignIn)));
}

test('JSON-LD roundtrips hostile event content without script or HTML delimiters', () => {
  const value = { name: '</script><script>alert("x")</script>&\u2028\u2029', nested: { text: 'a > b' } };
  const json = serializeStructuredData(value);
  assert.doesNotMatch(json, /[<>&\u2028\u2029]/);
  assert.deepEqual(JSON.parse(json), value);
});

test('SEO uses escaped JSON-LD in the actual script element', () => {
  const context = {};
  const html = renderToStaticMarkup(React.createElement(HelmetProvider, { context },
    React.createElement(MemoryRouter, null, React.createElement(SEO, { structuredData: [{ name: '</script><script>bad()</script>' }] }))));
  const scripts = context.helmet?.script.toString() || html;
  assert.equal((scripts.match(/<script/g) || []).length, 1);
  assert.ok(scripts.includes('\\u003c/script\\u003e'));
});

test('normal admin login hides signup and explains invitation access', () => {
  const html = login('/admin');
  assert.match(html, /data-flow="sign-in"/);
  assert.match(html, /data-signup="false"/);
  assert.match(html, /data-footer="none"/);
  assert.match(html, /Admin access is invite-only/);
});

test('ticket and signup status keep the invitation acceptance flow', () => {
  assert.match(login('/admin?__clerk_ticket=local-test-ticket&__clerk_status=sign_up'), /data-flow="invite-sign-up"/);
  for (const path of ['/admin?__clerk_status=sign_up', '/admin?__clerk_ticket=ticket', '/admin?__clerk_ticket=ticket&__clerk_status=sign_in']) {
    assert.match(login(path), /data-flow="sign-in"/);
  }
});

test('all seven rules locales have translated current rulebook copy', async () => {
  const en = JSON.parse(await readFile(new URL('../src/locales/en.json', import.meta.url))).rules;
  for (const locale of ['en', 'ja', 'ko', 'pt', 'tl', 'zh', 'zh-Hant']) {
    const rules = JSON.parse(await readFile(new URL(`../src/locales/${locale}.json`, import.meta.url))).rules;
    for (const key of ['rulebookLabel', 'rulebookCopy', 'opensExternally', 'contactNote', 'officialSourceLinkText', 'secondarySourceLinkText']) {
      assert.equal(typeof rules[key], 'string', `${locale}.${key}`);
      assert.doesNotMatch(rules[key], /PDF/);
      if (locale !== 'en') assert.notEqual(rules[key], en[key], `${locale}.${key}`);
    }
  }
});

for (const [name, path] of [['normal', '/admin'], ['invite', '/admin?__clerk_ticket=local-test&__clerk_status=sign_up']]) {
  await writeFile(`/tmp/marianas-w2-admin-${name}.html`, `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="http://127.0.0.1:5312/src/index.css"></head><body>${login(path)}</body></html>`);
}
