import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Image as ImageIcon, MapPin, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ImageWithShimmer from '../components/ImageWithShimmer';
import SEO from '../components/SEO';
import { api } from '../services/api';
import type { Event, EventGalleryImage } from '../services/api';
import { resolveMediaUrl } from '../utils/images';

const PER_PAGE = 24;
const EAGER_IMAGE_COUNT = 4;
const HIGH_PRIORITY_IMAGE_COUNT = 3;

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function EventGalleryPage() {
  const { slug = '' } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [images, setImages] = useState<EventGalleryImage[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadInitialGallery = async () => {
      try {
        setError('');
        const [eventResult, galleryResult] = await Promise.allSettled([
          api.getEvent(slug),
          api.getEventGallery(slug, { page: 1, per_page: PER_PAGE }),
        ]);
        if (eventResult.status === 'rejected') throw eventResult.reason;
        if (cancelled) return;
        setEvent(eventResult.value);

        if (galleryResult.status === 'fulfilled') {
          const galleryData = galleryResult.value;
          setImages(galleryData.gallery_images);
          setCategories(galleryData.categories || []);
          setActiveCategory('');
          setTotal(galleryData.total);
          setPage(1);
        } else {
          setImages([]);
          setCategories([]);
          setActiveCategory('');
          setTotal(0);
          setPage(1);
          setError('Photos could not be loaded. Please try again.');
        }
      } catch {
        if (!cancelled) setEvent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadInitialGallery();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const canLoadMore = images.length < total;
  const visibleCategories = categories.filter(category => category.count > 0);
  const activeImage = activeIndex === null ? null : images[activeIndex];
  const activeSrc = activeImage
    ? resolveMediaUrl(activeImage.large_url || activeImage.thumbnail_url)
    : null;

  const structuredData = useMemo(() => {
    if (!event) return undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: `${event.name} Photo Gallery`,
      about: event.name,
      image: images.slice(0, 12).map(image => {
        const src = image.thumbnail_url;
        return resolveMediaUrl(src);
      }).filter(Boolean),
    };
  }, [event, images]);

  const loadMore = async () => {
    if (!canLoadMore || loadingMore) return;
    setLoadingMore(true);
    try {
      setError('');
      const nextPage = page + 1;
      const params: Record<string, string | number> = { page: nextPage, per_page: PER_PAGE };
      if (activeCategory) params.category = activeCategory;
      const res = await api.getEventGallery(slug, params);
      setImages(current => [...current, ...res.gallery_images]);
      setCategories(res.categories || []);
      setTotal(res.total);
      setPage(nextPage);
    } catch {
      setError('More photos could not be loaded. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const loadCategory = async (category: string) => {
    if (category === activeCategory || loadingMore) return;
    const previousCategory = activeCategory;
    setActiveCategory(category);
    setLoadingMore(true);
    setActiveIndex(null);
    try {
      setError('');
      const params: Record<string, string | number> = { page: 1, per_page: PER_PAGE };
      if (category) params.category = category;
      const res = await api.getEventGallery(slug, params);
      setImages(res.gallery_images);
      setCategories(res.categories || []);
      setTotal(res.total);
      setPage(1);
    } catch {
      setActiveCategory(previousCategory);
      setError('Photos could not be loaded. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const moveLightbox = useCallback((direction: -1 | 1) => {
    setActiveIndex(current => {
      if (current === null) return current;
      return Math.min(images.length - 1, Math.max(0, current + direction));
    });
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveIndex(null);
      } else if (event.key === 'ArrowLeft') {
        moveLightbox(-1);
      } else if (event.key === 'ArrowRight') {
        moveLightbox(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, moveLightbox]);

  if (loading) {
    return <div className="min-h-screen pt-20"><LoadingSpinner /></div>;
  }

  if (!event) {
    return (
      <div className="min-h-screen pt-32 px-4 text-center">
        <div className="text-text-muted">Gallery not found.</div>
        <Link to="/events/past" className="inline-flex items-center gap-2 mt-6 text-gold hover:text-gold-400">
          <ArrowLeft size={14} /> Back to past events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <SEO
        title={`${event.name} Photos`}
        description={`Official photo gallery from ${event.name}.`}
        path={`/events/${event.slug}/gallery`}
        image={resolveMediaUrl(images[0]?.thumbnail_url) || event.hero_image_url || undefined}
        structuredData={structuredData ? [structuredData] : undefined}
      />

      <section className="relative py-12 sm:py-16 border-b border-white/5 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Link to={`/events/${event.slug}`} className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-gold transition-colors mb-8">
            <ArrowLeft size={14} /> Back to event
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-gold-500/20 bg-gold-500/5 text-gold-400 text-xs font-heading uppercase tracking-wider mb-5">
                <ImageIcon size={13} /> Official Gallery
              </div>
              <h1 className="max-w-6xl break-words font-heading text-4xl sm:text-6xl font-black uppercase leading-none text-text-primary">
                {event.name}
              </h1>
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-text-secondary">
                <span className="inline-flex items-center gap-2"><Calendar size={14} className="text-gold-500" /> {formatDate(event.date)}</span>
                <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-gold-500" /> {event.city}, {event.country}</span>
              </div>
            </div>
            <div className="text-sm text-text-muted">{total} photo{total === 1 ? '' : 's'}</div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {error && (
            <div className="mb-5 border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {visibleCategories.length > 0 && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between gap-4 text-xs text-text-muted">
                <span>{activeCategory || 'All photos'}</span>
                <span>{total} photo{total === 1 ? '' : 's'}</span>
              </div>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                <button
                  onClick={() => void loadCategory('')}
                  aria-pressed={activeCategory === ''}
                  disabled={loadingMore}
                  className={`shrink-0 whitespace-nowrap border px-3 py-1.5 text-xs font-heading uppercase tracking-wider transition-colors disabled:opacity-60 ${activeCategory === '' ? 'border-gold bg-gold text-navy-950' : 'border-white/10 text-text-secondary hover:border-gold/40 hover:text-gold'}`}
                >
                  All
                </button>
                {visibleCategories.map(category => (
                  <button
                    key={category.name}
                    onClick={() => void loadCategory(category.name)}
                    aria-pressed={activeCategory === category.name}
                    disabled={loadingMore}
                    className={`shrink-0 whitespace-nowrap border px-3 py-1.5 text-xs font-heading uppercase tracking-wider transition-colors disabled:opacity-60 ${activeCategory === category.name ? 'border-gold bg-gold text-navy-950' : 'border-white/10 text-text-secondary hover:border-gold/40 hover:text-gold'}`}
                  >
                    {category.name} <span className="opacity-70">({category.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {images.length === 0 ? (
            <div className="py-24 text-center text-text-muted">No photos have been published yet.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                {images.map((image, index) => {
                  const src = resolveMediaUrl(image.thumbnail_url);
                  const canOpen = Boolean(resolveMediaUrl(image.large_url || image.thumbnail_url));
                  return (
                    <button
                      key={image.id}
                      onClick={() => {
                        if (canOpen) setActiveIndex(index);
                      }}
                      disabled={!canOpen}
                      className="group relative aspect-[4/3] overflow-hidden border border-white/5 bg-white/[0.02] text-left disabled:cursor-default"
                    >
                      {src ? (
                        <ImageWithShimmer
                          src={src}
                          alt={image.alt_text || image.title || event.name}
                          loading={index < EAGER_IMAGE_COUNT ? 'eager' : 'lazy'}
                          decoding="async"
                          fetchPriority={index < HIGH_PRIORITY_IMAGE_COUNT ? 'high' : 'auto'}
                          sizes="(min-width: 1280px) 296px, (min-width: 640px) 33vw, 50vw"
                          lazyRootMargin="1200px 0px"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          placeholderClassName="flex items-center justify-center"
                          placeholderContent={<ImageIcon className="w-6 h-6 text-gold-400/25" aria-hidden="true" />}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-navy-900">
                          <ImageIcon className="w-6 h-6 text-gold-400/25" aria-hidden="true" />
                        </div>
                      )}
                      {(image.caption || image.title) && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/95 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="text-xs text-text-secondary truncate">{image.caption || image.title}</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {canLoadMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-navy-900 font-heading font-semibold text-sm uppercase tracking-wider hover:bg-gold-400 disabled:opacity-60"
                  >
                    {loadingMore && <LoaderInline />}
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {activeImage && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center px-4 py-12 sm:p-6">
          <button onClick={() => setActiveIndex(null)} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white" aria-label="Close gallery image">
            <X size={24} />
          </button>
          <button disabled={activeIndex === 0} onClick={() => moveLightbox(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20 sm:left-6" aria-label="Previous image">
            <ChevronLeft size={32} />
          </button>
          {activeSrc ? (
            <ImageWithShimmer
              src={activeSrc}
              alt={activeImage.alt_text || activeImage.title || event.name}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="max-h-[78vh] max-w-[92vw] object-contain sm:max-h-[84vh]"
              placeholderClassName="flex items-center justify-center"
              placeholderContent={<ImageIcon className="w-8 h-8 text-gold-400/25" aria-hidden="true" />}
            />
          ) : (
            <div className="flex h-64 w-full max-w-lg flex-col items-center justify-center gap-3 border border-white/10 bg-navy-900 text-text-muted">
              <ImageIcon className="h-8 w-8 text-gold-400/30" />
              <span className="text-sm">Photo preview is processing.</span>
            </div>
          )}
          <button disabled={activeIndex === images.length - 1} onClick={() => moveLightbox(1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20 sm:right-6" aria-label="Next image">
            <ChevronRight size={32} />
          </button>
          {(activeImage.caption || activeImage.title) && (
            <div className="absolute inset-x-0 bottom-0 p-5 text-center text-sm text-white/80 bg-gradient-to-t from-black/70 to-transparent">
              {activeImage.caption || activeImage.title}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoaderInline() {
  return <span className="w-3.5 h-3.5 border-2 border-navy-900/40 border-t-navy-900 rounded-full animate-spin" />;
}
