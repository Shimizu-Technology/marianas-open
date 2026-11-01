// Script raw text must not contain HTML delimiters, even inside JSON strings.
export function serializeStructuredData(value: unknown): string {
  const escapes: Record<string, string> = {
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
  };
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => escapes[character]);
}
