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
