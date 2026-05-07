import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Image as ImageIcon, MapPin, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ImageWithShimmer from '../components/ImageWithShimmer';
import SEO from '../components/SEO';
import { api } from '../services/api';
import type { Event, EventGalleryImage } from '../services/api';
import { resolveMediaUrl } from '../utils/images';

const PER_PAGE = 48;

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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.getEvent(slug),
      api.getEventGallery(slug, { page: 1, per_page: PER_PAGE }),
    ])
      .then(([eventData, galleryData]) => {
        if (cancelled) return;
        setEvent(eventData);
        setImages(galleryData.gallery_images);
        setTotal(galleryData.total);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setEvent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const canLoadMore = images.length < total;
  const activeImage = activeIndex === null ? null : images[activeIndex];
  const activeSrc = activeImage ? resolveMediaUrl(activeImage.large_url || activeImage.image_url) : null;

  const structuredData = useMemo(() => {
    if (!event) return undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: `${event.name} Photo Gallery`,
      about: event.name,
      image: images.slice(0, 12).map(image => resolveMediaUrl(image.thumbnail_url || image.image_url)).filter(Boolean),
    };
  }, [event, images]);

  const loadMore = async () => {
    if (!canLoadMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.getEventGallery(slug, { page: nextPage, per_page: PER_PAGE });
      setImages(current => [...current, ...res.gallery_images]);
      setTotal(res.total);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  const moveLightbox = (direction: -1 | 1) => {
    setActiveIndex(current => {
      if (current === null) return current;
      return Math.min(images.length - 1, Math.max(0, current + direction));
    });
  };

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
        image={resolveMediaUrl(images[0]?.thumbnail_url || images[0]?.image_url) || event.hero_image_url || undefined}
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
              <h1 className="font-heading text-4xl sm:text-6xl font-black uppercase leading-none text-text-primary">
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
          {images.length === 0 ? (
            <div className="py-24 text-center text-text-muted">No photos have been published yet.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {images.map((image, index) => {
                  const src = resolveMediaUrl(image.thumbnail_url || image.image_url);
                  return (
                    <button
                      key={image.id}
                      onClick={() => setActiveIndex(index)}
                      className="group relative aspect-[3/2] overflow-hidden border border-white/5 bg-white/[0.02] text-left"
                    >
                      {src && (
                        <ImageWithShimmer
                          src={src}
                          alt={image.alt_text || image.title || event.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
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

      {activeImage && activeSrc && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4">
          <button onClick={() => setActiveIndex(null)} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white" aria-label="Close gallery image">
            <X size={24} />
          </button>
          <button disabled={activeIndex === 0} onClick={() => moveLightbox(-1)} className="absolute left-3 sm:left-6 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label="Previous image">
            <ChevronLeft size={32} />
          </button>
          <img src={activeSrc} alt={activeImage.alt_text || activeImage.title || event.name} className="max-h-[82vh] max-w-[92vw] object-contain" />
          <button disabled={activeIndex === images.length - 1} onClick={() => moveLightbox(1)} className="absolute right-3 sm:right-6 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label="Next image">
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
