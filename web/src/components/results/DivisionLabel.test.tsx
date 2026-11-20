import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../../locales/en.json';
import ja from '../../locales/ja.json';
import ko from '../../locales/ko.json';
import pt from '../../locales/pt.json';
import tl from '../../locales/tl.json';
import zh from '../../locales/zh.json';
import zhHant from '../../locales/zh-Hant.json';
import DivisionLabel from './DivisionLabel';

afterEach(cleanup);
it.each(Object.entries({ en, ja, ko, pt, tl, zh, 'zh-Hant': zhHant }))(
  'renders all division parts in %s while preserving the raw title',
  async (language, resource) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      resources: { [language]: { translation: resource } },
      interpolation: { escapeValue: false },
    });
    const raw = '[GI] FEMALE BLACK ADULT 18 HEAVY';
    const expected = [
      resource.officialRankings.values.female,
      resource.officialRankings.values.black,
      resource.officialRankings.values.adultAge.replace('{{age}}', '18'),
      resource.watch.weight.heavy,
    ].join(' · ');
    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <DivisionLabel name={raw} />
      </I18nextProvider>
    );
    expect(screen.getByText(expected).closest('[title]')?.getAttribute('title')).toBe(raw);
    rerender(
      <I18nextProvider i18n={i18n}>
        <DivisionLabel name="[NOGI] Male Gray Kid 6 Open Weight" />
      </I18nextProvider>
    );
    expect(
      screen.getByText(
        [
          resource.officialRankings.values.male,
          resource.officialRankings.values.gray,
          resource.officialRankings.values.kidAge.replace('{{age}}', '6'),
          resource.watch.weight.openWeight,
        ].join(' · ')
      )
    ).toBeTruthy();
    rerender(
      <I18nextProvider i18n={i18n}>
        <DivisionLabel name="[GI] Future Unrecognized Division" />
      </I18nextProvider>
    );
    expect(
      screen
        .getByText('[GI] Future Unrecognized Division')
        .closest('[title]')
        ?.getAttribute('title')
    ).toBe('[GI] Future Unrecognized Division');
  }
);
