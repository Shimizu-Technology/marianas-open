export function getDateLocale(lang: string) {
  const map: Record<string, string> = {
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
    tl: 'fil-PH',
    pt: 'pt-BR',
  };
  return map[lang] || 'en-US';
}

export function parseDateLocalSafe(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(value);
}
