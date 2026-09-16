import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  Car,
  Dumbbell,
  Hotel,
  MapPin,
  Store,
  Ticket,
  Waves,
  Wifi,
} from 'lucide-react';
import ScrollReveal from './ScrollReveal';

export const HOTEL_TANO_URL = 'https://www.hoteltano.com';
export const HOTEL_TANO_DISCOUNT_CODE = 'tanosports';

const amenities = [
  { key: 'swimming', icon: Waves },
  { key: 'fitness', icon: Dumbbell },
  { key: 'convenienceStore', icon: Store },
  { key: 'wifi', icon: Wifi },
  { key: 'parking', icon: Car },
] as const;

export default function HotelPartnerSection() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="hotel-partner-heading"
      className="relative overflow-hidden border-y border-white/5 bg-navy-800 py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-40 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-gold-500/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <ScrollReveal className="lg:col-span-7">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 border border-gold-500/30 bg-gold-500/5 px-3 py-1.5 text-xs font-heading font-semibold uppercase tracking-[0.18em] text-gold-400">
                <Hotel aria-hidden="true" size={15} />
                {t('home.hotelPartner.eyebrow')}
              </div>

              <h2
                id="hotel-partner-heading"
                className="max-w-xl text-4xl font-heading font-black uppercase leading-[0.95] tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
              >
                {t('home.hotelPartner.title')}
              </h2>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
                {t('home.hotelPartner.description')}
              </p>

              <div className="mt-10 border-l border-gold-500/40 pl-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-heading font-semibold uppercase tracking-[0.2em] text-gold-400">
                  <MapPin aria-hidden="true" size={15} />
                  {t('home.hotelPartner.addressLabel')}
                </div>
                <address className="not-italic text-sm leading-relaxed text-text-primary sm:text-base">
                  {t('home.hotelPartner.address')}
                </address>
              </div>

              <div className="mt-10">
                <p className="mb-4 text-xs font-heading font-semibold uppercase tracking-[0.2em] text-text-muted">
                  {t('home.hotelPartner.amenitiesTitle')}
                </p>
                <ul className="grid grid-cols-2 gap-px overflow-hidden border border-white/5 bg-white/5 sm:grid-cols-5">
                  {amenities.map(({ key, icon: Icon }) => (
                    <li
                      key={key}
                      className="flex min-h-24 flex-col items-center justify-center gap-2 bg-navy-900/80 px-3 py-4 text-center last:col-span-2 sm:last:col-span-1"
                    >
                      <Icon aria-hidden="true" size={20} className="text-gold-500" strokeWidth={1.6} />
                      <span className="text-[11px] font-medium uppercase leading-tight tracking-wide text-text-secondary">
                        {t(`home.hotelPartner.amenities.${key}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal className="lg:col-span-5" delay={0.15} direction="left">
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-5 border border-gold-500/10" aria-hidden="true" />
              <div className="relative overflow-hidden bg-[#f4efe4] text-navy-900 shadow-2xl shadow-black/30">
                <div className="bg-black px-8 py-7">
                  <img
                    src="/images/logos/sponsors/hotel-tano-logo.jpg"
                    alt="Hotel Tano Guam"
                    className="mx-auto h-20 w-full object-cover object-center sm:h-24"
                  />
                </div>

                <div className="relative px-7 py-9 text-center sm:px-10 sm:py-11">
                  <span aria-hidden="true" className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-navy-800" />
                  <span aria-hidden="true" className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-navy-800" />

                  <div className="mb-4 inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-[0.18em] text-[#8d6b1f]">
                    <Ticket aria-hidden="true" size={16} />
                    {t('home.hotelPartner.discountLabel')}
                  </div>

                  <p className="text-sm text-navy-500">
                    {t('home.hotelPartner.discountInstruction')}
                  </p>
                  <p className="my-4 break-all font-heading text-4xl font-black tracking-tight text-[#b2292e] sm:text-5xl">
                    {HOTEL_TANO_DISCOUNT_CODE}
                  </p>

                  <div className="my-7 border-t border-dashed border-navy-900/20" />

                  <a
                    href={HOTEL_TANO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex min-h-12 w-full items-center justify-center gap-2 bg-navy-900 px-6 py-3 font-heading text-sm font-bold uppercase tracking-[0.14em] text-text-primary transition-all duration-200 hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4efe4]"
                  >
                    {t('home.hotelPartner.bookStay')}
                    <ArrowUpRight
                      aria-hidden="true"
                      size={17}
                      className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </a>
                  <p className="mt-3 text-xs leading-relaxed text-navy-500">
                    {t('home.hotelPartner.bookingNote')}
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
