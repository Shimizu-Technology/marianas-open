import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Award, Building2, Users, MapPin, Globe, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import type { AcademyDetail } from '../services/api';
import SEO from '../components/SEO';

const BELT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  white:  { bg: 'bg-white/90',     text: 'text-gray-900', ring: 'ring-white/30' },
  blue:   { bg: 'bg-blue-600',     text: 'text-white',    ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-600',   text: 'text-white',    ring: 'ring-purple-500/30' },
  brown:  { bg: 'bg-amber-800',    text: 'text-white',    ring: 'ring-amber-700/30' },
  black:  { bg: 'bg-gray-900',     text: 'text-white',    ring: 'ring-gray-700/30' },
};

function BeltBadge({ rank }: { rank: string }) {
  const s = BELT_STYLES[rank] || BELT_STYLES.white;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.bg} ${s.text} ring-1 ${s.ring}`}>
      {rank}
    </span>
  );
}

function CountryFlag({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      className="w-5 h-3.5 object-cover rounded-sm inline-block"
    />
  );
}

export default function AcademyPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [academy, setAcademy] = useState<AcademyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) { setLoading(false); setError('No academy specified'); return; }
    setLoading(true);
    api.getAcademy(slug)
      .then(setAcademy)
      .catch(() => setError('Academy not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-dark pt-24 pb-16">
        <SEO
          title={academy ? `${academy.name} — Team Profile` : 'Team Profile'}
          description={academy ? `Team profile and athlete roster for ${academy.name} at Marianas Open events.` : 'Academy team profile.'}
          path={slug ? `/teams/${slug}` : '/teams'}
          noindex
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-20 text-text-muted">{error}</div>
          )}

          {academy && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="bg-surface border border-white/5 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  {academy.logo_url ? (
                    <img src={academy.logo_url} alt={academy.name}
                      className="w-16 h-16 object-contain rounded-lg shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 size={28} className="text-white/10" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {academy.country_code && <CountryFlag code={academy.country_code} />}
                      <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                        {academy.name}
                      </h1>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary mt-1">
                      {academy.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-text-muted" />
                          {academy.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-text-muted" />
                        {academy.athletes.length} athlete{academy.athletes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {academy.description && (
                  <p className="text-sm text-text-secondary leading-relaxed mt-4">{academy.description}</p>
                )}

                {(academy.website_url || academy.instagram_url || academy.facebook_url) && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                    {academy.website_url && (
                      <a href={academy.website_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors">
                        <Globe size={14} /> Website <ExternalLink size={12} />
                      </a>
                    )}
                    {academy.instagram_url && (
                      <a href={academy.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors">
                        Instagram
                      </a>
                    )}
                    {academy.facebook_url && (
                      <a href={academy.facebook_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors">
                        Facebook
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <StatCard icon={<Trophy size={20} className="text-gold-500" />} label="Total Points" value={academy.total_points} />
                <StatCard icon={<Medal size={20} className="text-yellow-400" />} label="Gold" value={academy.gold} />
                <StatCard icon={<Medal size={20} className="text-gray-300" />} label="Silver" value={academy.silver} />
                <StatCard icon={<Award size={20} className="text-amber-500" />} label="Bronze" value={academy.bronze} />
                <StatCard icon={<Users size={20} className="text-blue-400" />} label="Athletes" value={academy.athletes.length} />
              </div>

              {academy.athletes.length > 0 && (
                <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">Athletes</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.03]">
                    {academy.athletes.map((athlete, i) => (
                      <motion.div
                        key={athlete.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Link
                          to={`/competitors/${athlete.id}`}
                          className="flex items-center gap-3 p-4 bg-surface hover:bg-white/[0.03] transition-colors"
                        >
                          {athlete.photo_url ? (
                            <img src={athlete.photo_url} alt={athlete.full_name}
                              className="w-10 h-10 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-white/20">
                                {athlete.first_name[0]}{athlete.last_name[0]}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {athlete.country_code && <CountryFlag code={athlete.country_code} />}
                              <span className="text-sm font-medium text-text-primary truncate">{athlete.full_name}</span>
                              {athlete.belt_rank && <BeltBadge rank={athlete.belt_rank} />}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                              <span className="text-gold font-mono font-semibold">{athlete.total_points} pts</span>
                              {athlete.gold > 0 && <span className="text-yellow-400">{athlete.gold}G</span>}
                              {athlete.silver > 0 && <span className="text-gray-300">{athlete.silver}S</span>}
                              {athlete.bronze > 0 && <span className="text-orange-400">{athlete.bronze}B</span>}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-surface border border-white/5 rounded-xl p-4 flex flex-col items-center gap-1">
      {icon}
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
