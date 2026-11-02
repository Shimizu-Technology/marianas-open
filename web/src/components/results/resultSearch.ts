/** Names may arrive in either source order; every name token must match. */
export function matchesResultSearch(
  query: string,
  name: string,
  academy: string | null,
  division: string
): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  const tokens = normalized.split(/\s+/);
  const athlete = name.toLocaleLowerCase();
  return (
    tokens.every((token) => athlete.includes(token)) ||
    (academy || '').toLocaleLowerCase().includes(normalized) ||
    division.toLocaleLowerCase().includes(normalized)
  );
}
