import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Users, Globe, Trophy, Calendar, MapPin, Mail, Phone } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import ImageWithShimmer from '../components/ImageWithShimmer';

const timeline = [
  { year: '2007', key: 'timeline2007' },
  { year: '2015', key: 'timeline2015' },
  { year: '2019', key: 'timeline2019' },
  { year: '2023', key: 'timeline2023' },
  { year: '2025', key: 'timeline2025' },
  { year: '2026', key: 'timeline2026' },
];

export default function AboutPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const stats = [
    { value: t('stats.competitors'), label: t('stats.competitorsLabel'), icon: Users },
    { value: t('stats.countries'), label: t('stats.countriesLabel'), icon: Globe },
    { value: t('stats.prizePpool'), label: t('stats.prizePoolLabel'), icon: Trophy },
    { value: t('stats.since'), label: t('stats.sinceLabel'), icon: Calendar },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithShimmer
            src="/images/venue-crowd.webp"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-navy-900/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-navy-900/50" />
        </div>
        <div className="relative z-10 text-center px-4">
          <motion.h1
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {t('about.heroTitle')}
          </motion.h1>
          <motion.p
            className="text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {t('about.heroSubtitle')}
          </motion.p>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 -mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.1}>
                <div className="bg-surface border border-white/5 rounded-lg p-6 text-center">
                  <stat.icon size={20} className="text-gold-500 mx-auto mb-3" />
                  <div className="text-2xl sm:text-3xl font-heading font-bold text-gold-500">
                    {stat.value}
                  </div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mt-1">
                    {stat.label}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-8 text-gold-500">
              {t('about.storyTitle')}
            </h2>
          </ScrollReveal>
          <div className="space-y-6 text-text-secondary leading-relaxed text-base sm:text-lg">
            <ScrollReveal delay={0.1}>
              <p>{t('about.p1')}</p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <p>{t('about.p2')}</p>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p>{t('about.p3')}</p>
            </ScrollReveal>
            <ScrollReveal delay={0.25}>
              <p>{t('about.p4')}</p>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p>{t('about.p5')}</p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Image Break */}
      <section className="relative h-64 sm:h-80 overflow-hidden">
        <ImageWithShimmer
          src="/images/action-match-2.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-navy-900/40" />
      </section>

      {/* Timeline */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-12 text-center">
              {t('about.timelineTitle')}
            </h2>
          </ScrollReveal>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gold-500/20 -translate-x-1/2" />

            <div className="space-y-12">
              {timeline.map((item, i) => (
                <ScrollReveal key={item.year} delay={i * 0.1}>
                  <div className={`relative flex items-start gap-6 sm:gap-12 ${
                    i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  }`}>
                    {/* Dot */}
                    <div className="absolute left-4 sm:left-1/2 w-3 h-3 bg-gold-500 rounded-full -translate-x-1/2 mt-1.5 ring-4 ring-navy-900" />

                    {/* Content */}
                    <div className={`ml-10 sm:ml-0 sm:w-1/2 ${i % 2 === 0 ? 'sm:text-right sm:pr-12' : 'sm:text-left sm:pl-12'}`}>
                      <span className="text-gold-500 font-heading font-bold text-lg">{item.year}</span>
                      <p className="text-text-secondary text-sm mt-1">
                        {t(`about.${item.key}`)}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 sm:py-28 bg-surface border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-4">
              {t('about.contactTitle')}
            </h2>
            <p className="text-text-secondary mb-8 max-w-xl mx-auto">
              {t('about.contactDesc')}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a
                href="mailto:steveshimizu@outlook.com"
                className="flex items-center gap-2 text-text-secondary hover:text-gold-500 transition-colors"
              >
                <Mail size={18} />
                steveshimizu@outlook.com
              </a>
              <span className="hidden sm:block text-white/10">|</span>
              <div className="flex items-center gap-2 text-text-secondary">
                <Phone size={18} />
                (671) 777-9044
              </div>
              <span className="hidden sm:block text-white/10">|</span>
              <div className="flex items-center gap-2 text-text-secondary">
                <MapPin size={18} />
                Guam, USA
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
