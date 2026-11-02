import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  X,
  Download,
  Share2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTranslatedField } from '../hooks/useTranslatedField';
import { getDateLocale, parseDateLocalSafe } from '../utils/dateLocale';
import { isGeneratedImageName } from '../utils/gallery';
import LoadingSpinner from '../components/LoadingSpinner';
import ImageWithShimmer from '../components/ImageWithShimmer';
import SEO from '../components/SEO';
import { api } from '../services/api';
import type { EventGalleryImage } from '../services/api';
import { useEvents } from '../hooks/useApi';
import { resolveMediaUrl } from '../utils/images';

import { Button, Chip } from '../components/ui';
import { publicPhotoLabel, sharePhoto, downloadPhoto } from './EventGalleryActions';

const PER_PAGE = 24;
const EAGER_IMAGE_COUNT = 4;
const HIGH_PRIORITY_IMAGE_COUNT = 3;
const LARGE_PRELOAD_COUNT = 8;

function preloadImage(url: string | null | undefined) {
  if (!url) return;
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
}

export default function EventGalleryPage() {
  const { slug = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { tf } = useTranslatedField();
  const [searchParams] = useSearchParams();
  const requestedPhotoId = searchParams.get('photo');
  const dialogRef = useRef<HTMLDivElement>(null);
  const { events, loading: eventsLoading } = useEvents();
  const event = useMemo(
    () => events.find((candidate) => candidate.slug === slug) || null,
    [events, slug]
  );
  const [images, setImages] = useState<EventGalleryImage[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState(PER_PAGE);
  const [actionStatus, setActionStatus] = useState('');
  const [manualShareUrl, setManualShareUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadInitialGallery = async () => {
      try {
        setError('');
        const perPage = requestedPhotoId ? 96 : PER_PAGE;
        const galleryResult = await api.getEventGallery(slug, { page: 1, per_page: perPage });
        const loaded = [...galleryResult.gallery_images];
        let loadedPage = 1;
        // The public API is paginated. Resolve links beyond the first album page too.
        while (
          requestedPhotoId &&
          !loaded.some((image) => String(image.id) === requestedPhotoId) &&
          loaded.length < galleryResult.total
        ) {
          if (cancelled) return;
          const next = await api.getEventGallery(slug, { page: ++loadedPage, per_page: perPage });
          if (!next.gallery_images.length) break;
          loaded.push(...next.gallery_images);
        }
        if (cancelled) return;

        setImages(loaded);
        setPageSize(perPage);
        setCategories(galleryResult.categories || []);
        setActiveCategory('');
        setTotal(galleryResult.total);
        setPage(loadedPage);
        const requestedIndex = loaded.findIndex((image) => String(image.id) === requestedPhotoId);
        setActiveIndex(requestedIndex >= 0 ? requestedIndex : null);
      } catch {
        if (!cancelled) {
          setImages([]);
          setCategories([]);
          setActiveCategory('');
          setTotal(0);
          setPage(1);
          setError('season.galleryError');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadInitialGallery();

    return () => {
      cancelled = true;
    };
  }, [slug, requestedPhotoId]);

  const canLoadMore = images.length < total;
  const visibleCategories = categories.filter((category) => category.count > 0);
  const activeImage = activeIndex === null ? null : images[activeIndex];
  const activeSrc = activeImage
    ? resolveMediaUrl(activeImage.large_url || activeImage.thumbnail_url)
    : null;
  const activeLabel = activeImage ? publicPhotoLabel(activeImage) : '';

  const structuredData = useMemo(() => {
    if (!event) return undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: `${event.name} — ${t('season.gallery')}`,
      about: event.name,
      image: images
        .slice(0, 12)
        .map((image) => {
          const src = image.thumbnail_url;
          return resolveMediaUrl(src);
        })
        .filter(Boolean),
    };
  }, [event, images, t]);

  const loadMore = async () => {
    if (!canLoadMore || loadingMore) return;
    setLoadingMore(true);
    try {
      setError('');
      const nextPage = page + 1;
      const params: Record<string, string | number> = { page: nextPage, per_page: pageSize };
      if (activeCategory) params.category = activeCategory;
      const res = await api.getEventGallery(slug, params);
      setImages((current) => [...current, ...res.gallery_images]);
      setCategories(res.categories || []);
      setTotal(res.total);
      setPage(nextPage);
    } catch {
      setError('season.galleryMoreError');
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
      const params: Record<string, string | number> = { page: 1, per_page: pageSize };
      if (category) params.category = category;
      const res = await api.getEventGallery(slug, params);
      setImages(res.gallery_images);
      setCategories(res.categories || []);
      setTotal(res.total);
      setPage(1);
    } catch {
      setActiveCategory(previousCategory);
      setError('season.galleryError');
    } finally {
      setLoadingMore(false);
    }
  };

  const moveLightbox = useCallback(
    (direction: -1 | 1) => {
      setActiveIndex((current) => {
        if (current === null) return current;
        return Math.min(images.length - 1, Math.max(0, current + direction));
      });
    },
    [images.length]
  );

  const openLightbox = (index: number) => {
    setActiveIndex(index);

    const image = images[index];
    if (!image) return;
    preloadImage(resolveMediaUrl(image.large_url || image.thumbnail_url));
  };

  useEffect(() => {
    images.slice(0, LARGE_PRELOAD_COUNT).forEach((image) => {
      preloadImage(resolveMediaUrl(image.large_url || image.thumbnail_url));
    });
  }, [images]);

  useEffect(() => {
    if (activeIndex === null) return;

    [activeIndex - 1, activeIndex + 1].forEach((preloadIndex) => {
      const image = images[preloadIndex];
      if (!image) return;
      preloadImage(resolveMediaUrl(image.large_url || image.thumbnail_url));
    });
  }, [activeIndex, images]);

  useEffect(() => {
    if (activeIndex === null) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveIndex(null);
        const url = new URL(window.location.href);
        url.searchParams.delete('photo');
        window.history.replaceState(window.history.state, '', url);
      } else if (event.key === 'ArrowLeft') {
        moveLightbox(-1);
      } else if (event.key === 'ArrowRight') {
        moveLightbox(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, moveLightbox]);

  const lightboxOpen = activeIndex !== null && !loading && !eventsLoading;
  useEffect(() => {
    if (!lightboxOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>('button')?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog) return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)')
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', trapFocus);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!activeImage || loading) return;
    const url = new URL(window.location.href);
    url.searchParams.set('photo', String(activeImage.id));
    window.history.replaceState(window.history.state, '', url);
    setActionStatus('');
    setManualShareUrl('');
  }, [activeImage, loading]);

  const closeLightbox = () => {
    setActiveIndex(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('photo');
    window.history.replaceState(window.history.state, '', url);
  };
  const photoUrl = activeImage
    ? new URL(`/events/${slug}/gallery?photo=${activeImage.id}`, window.location.origin).href
    : '';
  const handleShare = async () => {
    try {
      const outcome = await sharePhoto(photoUrl, event?.name || 'Marianas Open');
      if (outcome !== 'cancelled')
        setActionStatus(outcome === 'copied' ? 'galleryActions.copied' : 'galleryActions.shared');
    } catch {
      setManualShareUrl(photoUrl);
      setActionStatus('galleryActions.copyManually');
    }
  };
  const handleDownload = async () => {
    const src = resolveMediaUrl(activeImage?.image_url) || activeSrc;
    if (!src || !activeImage) return;
    setDownloading(true);
    setActionStatus('');
    try {
      await downloadPhoto(
        src,
        `${slug}-${activeImage.id}.${({ 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/heic': 'heic' } as Record<string, string>)[activeImage.content_type || ''] || 'jpg'}`
      );
      setActionStatus('galleryActions.downloaded');
    } catch {
      setActionStatus('galleryActions.downloadError');
    } finally {
      setDownloading(false);
    }
  };

  if (loading || eventsLoading) {
    return (
      <div className="min-h-svh pt-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-svh pt-32 px-4 text-center">
        <div className="text-text-muted">{t('season.galleryNotFound')}</div>
        <Link
          to="/events/past"
          className="inline-flex min-h-11 items-center gap-2 mt-6 text-gold hover:text-gold-400"
        >
          <ArrowLeft size={14} /> {t('season.backToPast')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-svh pt-20">
      <SEO
        title={t('season.galleryTitle', { event: tf(event, 'name') })}
        description={t('season.galleryDescription', { event: tf(event, 'name') })}
        path={`/events/${event.slug}/gallery`}
        image={resolveMediaUrl(images[0]?.thumbnail_url) || event.hero_image_url || undefined}
        structuredData={structuredData ? [structuredData] : undefined}
      />

      <section className="relative py-12 sm:py-16 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Link
            to={`/events/${event.slug}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-text-muted hover:text-gold transition-colors mb-8"
          >
            <ArrowLeft size={14} /> {t('season.backToEvent')}
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <Chip className="mb-5">
                <ImageIcon size={13} /> {t('season.officialGallery')}
              </Chip>
              <h1 className="max-w-6xl break-words font-heading text-3xl sm:text-5xl font-semibold leading-tight text-text-primary">
                {tf(event, 'name')}
              </h1>
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-text-secondary">
                <span className="inline-flex min-h-11 items-center gap-2">
                  <Calendar size={14} className="text-gold-500" />{' '}
                  {event.date
                    ? parseDateLocalSafe(event.date).toLocaleDateString(
                        getDateLocale(i18n.language),
                        { year: 'numeric', month: 'long', day: 'numeric' }
                      )
                    : t('event.date')}
                </span>
                <span className="inline-flex min-h-11 items-center gap-2">
                  <MapPin size={14} className="text-gold-500" /> {tf(event, 'city')},{' '}
                  {tf(event, 'country')}
                </span>
              </div>
            </div>
            <div className="text-sm text-text-muted">
              {t('season.photoCount', { count: total })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {error && (
            <div className="mb-5 border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {t(error)}
            </div>
          )}
          {visibleCategories.length > 0 && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between gap-4 text-xs text-text-muted">
                <span>{activeCategory || t('season.allPhotos')}</span>
                <span>{t('season.photoCount', { count: total })}</span>
              </div>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                <button
                  onClick={() => void loadCategory('')}
                  aria-pressed={activeCategory === ''}
                  disabled={loadingMore}
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-heading transition-colors disabled:opacity-60 ${activeCategory === '' ? 'border-gold bg-gold text-navy-950' : 'border-white/10 text-text-secondary hover:border-gold/40 hover:text-gold'}`}
                >
                  {t('season.all')}
                </button>
                {visibleCategories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => void loadCategory(category.name)}
                    aria-pressed={activeCategory === category.name}
                    disabled={loadingMore}
                    className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-heading transition-colors disabled:opacity-60 ${activeCategory === category.name ? 'border-gold bg-gold text-navy-950' : 'border-white/10 text-text-secondary hover:border-gold/40 hover:text-gold'}`}
                  >
                    {category.name} <span className="opacity-70">({category.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {images.length === 0 ? (
            <div className="py-24 text-center text-text-muted">{t('season.noPhotos')}</div>
          ) : (
            <>
              <div aria-busy={loadingMore} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                {images.map((image, index) => {
                  const src = resolveMediaUrl(image.thumbnail_url);
                  const canOpen = Boolean(resolveMediaUrl(image.large_url || image.thumbnail_url));
                  const label = publicPhotoLabel(image);
                  return (
                    <button
                      key={image.id}
                      aria-label={t('season.openPhoto', { number: index + 1 })}
                      onMouseEnter={() =>
                        preloadImage(resolveMediaUrl(image.large_url || image.thumbnail_url))
                      }
                      onFocus={() =>
                        preloadImage(resolveMediaUrl(image.large_url || image.thumbnail_url))
                      }
                      onClick={() => {
                        if (canOpen) openLightbox(index);
                      }}
                      disabled={!canOpen || loadingMore}
                      className="group relative aspect-[4/3] overflow-hidden border border-white/5 bg-white/[0.02] text-left disabled:cursor-default"
                    >
                      {src ? (
                        <ImageWithShimmer
                          src={src}
                          alt={
                            image.alt_text && !isGeneratedImageName(image.alt_text)
                              ? image.alt_text
                              : publicPhotoLabel(image) || tf(event, 'name')
                          }
                          loading={index < EAGER_IMAGE_COUNT ? 'eager' : 'lazy'}
                          decoding="async"
                          fetchPriority={index < HIGH_PRIORITY_IMAGE_COUNT ? 'high' : 'auto'}
                          sizes="(min-width: 1280px) 296px, (min-width: 640px) 33vw, 50vw"
                          lazyRootMargin="1200px 0px"
                          className="w-full h-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]"
                          placeholderClassName="flex items-center justify-center"
                          placeholderContent={
                            <ImageIcon className="w-6 h-6 text-gold-400/25" aria-hidden="true" />
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-navy-900">
                          <ImageIcon className="w-6 h-6 text-gold-400/25" aria-hidden="true" />
                        </div>
                      )}
                      {label && (
                        <div className="absolute inset-x-0 bottom-0 bg-navy-950/90 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="text-sm text-text-secondary break-words">{label}</div>
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
                    className="inline-flex min-h-11 items-center gap-2 px-5 py-2.5 bg-gold text-navy-900 font-heading font-semibold text-sm uppercase tracking-wider hover:bg-gold-400 disabled:opacity-60"
                  >
                    {loadingMore && <LoaderInline />}
                    {t('season.loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {activeImage && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('season.gallery')}
          className="fixed inset-0 z-[80] bg-black/95 p-4 sm:p-6"
        >
          <button
            onClick={closeLightbox}
            className="absolute right-3 top-3 z-20 min-h-11 min-w-11 p-2 text-white/70 hover:text-white sm:right-4 sm:top-4"
            aria-label={t('season.closePhoto')}
          >
            <X size={24} />
          </button>
          <button
            disabled={activeIndex === 0}
            onClick={() => moveLightbox(-1)}
            className="absolute left-2 top-1/2 z-20 min-h-11 min-w-11 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20 sm:left-6"
            aria-label={t('season.previousPhoto')}
          >
            <ChevronLeft size={32} />
          </button>
          <div className="mx-auto flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-7xl flex-col items-center justify-center gap-3 pb-2 pt-12 sm:h-[calc(100dvh-3rem)] sm:w-[calc(100vw-3rem)]">
            {activeSrc ? (
              <img
                src={activeSrc}
                alt={
                  activeImage.alt_text && !isGeneratedImageName(activeImage.alt_text)
                    ? activeImage.alt_text
                    : activeLabel || tf(event, 'name')
                }
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="block min-h-0 max-h-full max-w-full flex-1 object-contain"
              />
            ) : (
              <div className="flex min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 border border-white/10 bg-navy-900 text-text-muted">
                <ImageIcon className="h-8 w-8 text-gold-400/30" />
                <span className="text-sm">{t('season.photoProcessing')}</span>
              </div>
            )}
            {activeLabel && (
              <div className="shrink-0 px-4 text-center text-sm text-white/80">{activeLabel}</div>
            )}
            <div className="flex shrink-0 flex-wrap justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => void handleDownload()}
                disabled={downloading || !activeSrc}
              >
                <Download size={18} aria-hidden="true" />
                {t(downloading ? 'galleryActions.downloading' : 'galleryActions.download')}
              </Button>
              <Button variant="secondary" onClick={() => void handleShare()}>
                <Share2 size={18} aria-hidden="true" />
                {t('galleryActions.share')}
              </Button>
            </div>
            <div role="status" className="max-w-lg shrink-0 text-center text-sm text-white/80">
              {actionStatus && t(actionStatus)}
            </div>
            {manualShareUrl && (
              <input
                readOnly
                aria-label={t('galleryActions.photoLink')}
                value={manualShareUrl}
                onFocus={(e) => e.target.select()}
                className="min-h-11 w-full max-w-lg shrink-0 rounded-lg bg-surface px-3 text-base text-white"
              />
            )}
          </div>
          <button
            disabled={activeIndex === images.length - 1}
            onClick={() => moveLightbox(1)}
            className="absolute right-2 top-1/2 z-20 min-h-11 min-w-11 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20 sm:right-6"
            aria-label={t('season.nextPhoto')}
          >
            <ChevronRight size={32} />
          </button>
        </div>
      )}
    </div>
  );
}

function LoaderInline() {
  return (
    <span className="w-3.5 h-3.5 border-2 border-navy-900/40 border-t-navy-900 rounded-full animate-spin" />
  );
}
