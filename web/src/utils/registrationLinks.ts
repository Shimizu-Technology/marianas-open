export interface RegistrationUrlFields {
  registration_url?: string | null;
  registration_url_gi?: string | null;
  registration_url_nogi?: string | null;
}

export interface RegistrationLinks {
  gi: string;
  nogi: string;
  legacy: string;
  hasDirect: boolean;
  hasAny: boolean;
}

export function normalizeAsjjfRegistrationUrl(url: string | null | undefined): string {
  return url?.trim().replace(/\/main\/eventNotice\/(?=\d)/ig, '/main/eventInfo/') || '';
}

export function getRegistrationLinks(event: RegistrationUrlFields | null | undefined): RegistrationLinks {
  const gi = normalizeAsjjfRegistrationUrl(event?.registration_url_gi);
  const nogi = normalizeAsjjfRegistrationUrl(event?.registration_url_nogi);
  const legacy = normalizeAsjjfRegistrationUrl(event?.registration_url);

  return {
    gi,
    nogi,
    legacy,
    hasDirect: !!(gi || nogi),
    hasAny: !!(gi || nogi || legacy),
  };
}
