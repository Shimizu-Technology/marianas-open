import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, MapPin, Calendar, Trophy, Plane, Hotel, FileCheck, ExternalLink, Clock, Users } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

export default function EventDetailPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const scheduleItems = [
    { time: '7:00 AM', event: 'Doors Open / Weigh-ins' },
    { time: '8:00 AM', event: 'Kids & Juvenile Divisions' },
    { time: '10:00 AM', event: 'Adult White & Blue Belt' },
    { time: '1:00 PM', event: 'Adult Purple & Brown Belt' },
    { time: '4:00 PM', event: 'Black Belt Divisions' },
    { time: '6:00 PM', event: 'Black Belt Finals / Open Class' },
    { time: '8:00 PM', event: 'Awards Ceremony' },
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-800 via-navy-900 to-navy-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-gold-500)_0%,_transparent_60%)] opacity-[0.05]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-2 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className="fill-gold-500 text-gold-500" />
              ))}
              <span className="text-gold-400 text-sm font-heading ml-2 uppercase tracking-wider">
                {t('event.asjjfRank')}
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-black uppercase leading-[0.9] mb-6">
              <span className="text-text-primary">Marianas</span>
              <br />
              <span className="bg-gradient-to-r from-gold-500 to-gold-300 bg-clip-text text-transparent">
                Open 2026
              </span>
            </h1>

            <p className="text-xl text-text-secondary font-heading uppercase tracking-wider mb-8">
              {t('event.tagline')}
            </p>

            <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gold-500" />
                {t('event.date')}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gold-500" />
                {t('event.venue')}
              </div>
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-gold-500" />
                {t('event.prizePool')}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Info */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Schedule — spans 2 cols */}
            <ScrollReveal className="lg:col-span-2">
              <div className="bg-surface border border-white/5 p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <Clock size={20} className="text-gold-500" />
                  <h3 className="font-heading font-bold text-xl uppercase tracking-wider">
                    {t('event.schedule')}
                  </h3>
                </div>
                <p className="text-text-secondary text-sm mb-6">{t('event.scheduleDesc')}</p>
                <div className="space-y-0">
                  {scheduleItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0"
                    >
                      <span className="text-gold-500 font-heading font-bold text-sm w-24 shrink-0">
                        {item.time}
                      </span>
                      <span className="text-text-primary text-sm">{item.event}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Prize Pool */}
            <ScrollReveal delay={0.1}>
              <div className="bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/20 p-8 h-full">
                <Trophy size={24} className="text-gold-500 mb-4" />
                <div className="text-5xl font-heading font-black text-gold-500 mb-2">$50K</div>
                <div className="text-sm text-text-muted uppercase tracking-wider mb-6">Prize Pool</div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <span>Black Belt Open Class</span>
                    <span className="text-gold-400 font-semibold">$5,000</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Black Belt Divisions</span>
                    <span className="text-gold-400 font-semibold">$3,000</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Brown Belt Divisions</span>
                    <span className="text-gold-400 font-semibold">$1,500</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Team Trophy</span>
                    <span className="text-gold-400 font-semibold">$2,500</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Venue */}
            <ScrollReveal delay={0.15}>
              <div className="bg-surface border border-white/5 p-8 h-full">
                <MapPin size={24} className="text-gold-500 mb-4" />
                <h3 className="font-heading font-bold text-lg mb-2">{t('event.venue')}</h3>
                <p className="text-text-secondary text-sm mb-4">{t('event.location')}</p>
                <div className="bg-navy-900 border border-white/5 p-4 text-center">
                  <Users size={20} className="text-gold-500 mx-auto mb-2" />
                  <div className="text-sm text-text-secondary">6 Competition Mats</div>
                  <div className="text-sm text-text-secondary">5,000+ Capacity</div>
                </div>
              </div>
            </ScrollReveal>

            {/* How to Register */}
            <ScrollReveal delay={0.2} className="lg:col-span-2">
              <div className="bg-surface border border-white/5 p-8 h-full">
                <h3 className="font-heading font-bold text-xl uppercase tracking-wider mb-6">
                  {t('event.howToRegister')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { step: '01', title: t('event.step1'), desc: t('event.step1Desc'), icon: ExternalLink },
                    { step: '02', title: t('event.step2'), desc: t('event.step2Desc'), icon: FileCheck },
                    { step: '03', title: t('event.step3'), desc: t('event.step3Desc'), icon: Trophy },
                  ].map((s) => (
                    <div key={s.step} className="space-y-3">
                      <div className="text-gold-500 font-heading font-black text-3xl">{s.step}</div>
                      <h4 className="font-heading font-bold text-sm uppercase tracking-wider">{s.title}</h4>
                      <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <a
                    href="https://asjjf.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-400 transition-colors"
                  >
                    {t('home.registerNow')}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Travel Info */}
      <section className="py-20 sm:py-28 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-heading font-black uppercase mb-4">
                {t('event.travelTitle')}
              </h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                {t('event.travelDesc')}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Plane, title: t('event.flights'), desc: t('event.flightsDesc') },
              { icon: Hotel, title: t('event.hotels'), desc: t('event.hotelsDesc') },
              { icon: FileCheck, title: t('event.visa'), desc: t('event.visaDesc') },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="bg-navy-900 border border-white/5 p-8 h-full hover:border-gold-500/20 transition-colors duration-300">
                  <item.icon size={24} className="text-gold-500 mb-4" />
                  <h3 className="font-heading font-bold text-lg mb-3">{item.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Share */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h3 className="font-heading font-bold text-sm uppercase tracking-[0.3em] text-text-muted mb-6">
              {t('event.shareTitle')}
            </h3>
            <div className="flex items-center justify-center gap-4">
              {['Twitter', 'Facebook', 'LINE', 'KakaoTalk', 'WeChat'].map((platform) => (
                <button
                  key={platform}
                  className="px-4 py-2 border border-white/10 text-text-secondary text-sm hover:border-gold-500/30 hover:text-gold-500 transition-all duration-300"
                >
                  {platform}
                </button>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
