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

export function getRegistrationLinks(event: RegistrationUrlFields | null | undefined): RegistrationLinks {
  const gi = event?.registration_url_gi?.trim() || '';
  const nogi = event?.registration_url_nogi?.trim() || '';
  const legacy = event?.registration_url?.trim() || '';

  return {
    gi,
    nogi,
    legacy,
    hasDirect: !!(gi || nogi),
    hasAny: !!(gi || nogi || legacy),
  };
}
