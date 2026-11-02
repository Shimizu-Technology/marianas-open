export type Discipline = 'gi' | 'nogi' | 'unknown';
export type ParsedDivision = {
  raw: string;
  discipline: Discipline;
  label: string;
  gender: string | null;
  belt: string | null;
  age: string | null;
  weight: string | null;
};

export function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

/** Recognize ASJJF's published grammar only; never guess at unfamiliar divisions. */
export function parseDivisionName(raw: string): ParsedDivision {
  const prefix = raw.match(/^\s*\[(GI|NO-?GI)\]\s*/i);
  const discipline: Discipline = prefix
    ? prefix[1].toUpperCase() === 'GI'
      ? 'gi'
      : 'nogi'
    : 'unknown';
  const body = prefix ? raw.slice(prefix[0].length) : raw;
  const match = body
    .trim()
    .match(
      /^(MALE|FEMALE)\s+(WHITE|GREY|GRAY|YELLOW|ORANGE|GREEN|BLUE|PURPLE|BROWN|BLACK)\s+(ADULT\s+\d+|MASTER\s+\d+|JUVENILE\s+\d+(?:-\d+)?|KID\s+\d+(?:-\d+)?)\s+(ROOSTER|LIGHT\s+FEATHER|FEATHER|LIGHT|MIDDLE|MEDIUM\s+HEAVY|HEAVY|SUPER\s+HEAVY|ULTRA\s+HEAVY|OPEN\s+WEIGHT)$/i
    );
  if (!match)
    return { raw, discipline, label: raw, gender: null, belt: null, age: null, weight: null };
  const [gender, belt, age, weight] = match
    .slice(1)
    .map((value) => titleCase(value.replace(/\s+/g, ' ')));
  return {
    raw,
    discipline,
    label: `${gender} · ${belt} · ${age} · ${weight}`,
    gender,
    belt,
    age,
    weight,
  };
}
