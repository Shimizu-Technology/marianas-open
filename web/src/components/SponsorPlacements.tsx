import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, X } from "lucide-react";
import type { Sponsor, SponsorPlacement } from "../services/api";
import { getSponsorLogo, resolveMediaUrl, normalizeExternalUrl } from "../utils/images";
import { sponsorVideo } from "../utils/sponsorVideo";
import { useTranslatedField } from "../hooks/useTranslatedField";

export function SponsorLogo({ sponsor, dark = true }: { sponsor: Sponsor; dark?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const legacy = !sponsor.logo_url ? getSponsorLogo(sponsor.name) : null;
  const darkLogo = dark
    ? resolveMediaUrl(sponsor.logo_dark_url) || (legacy?.includes("-white.") ? legacy : null)
    : null;
  const logo = darkLogo || getSponsorLogo(sponsor.name, sponsor.logo_url);
  return (
    <div
      className={`flex h-24 w-40 max-w-full items-center justify-center rounded-md p-4 ${darkLogo ? "bg-navy-900" : "bg-white text-navy-900"}`}
    >
      {logo && failed !== logo ? (
        <img src={logo} alt={sponsor.name} onError={() => setFailed(logo)} className="h-full w-full object-contain" />
      ) : (
        <span className="break-words text-center text-sm font-bold">{sponsor.name}</span>
      )}
    </div>
  );
}

function PlacementCard({ placement }: { placement: SponsorPlacement }) {
  const { t } = useTranslation();
  const { tf } = useTranslatedField();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const video = sponsorVideo(placement.video_url);
  const sponsor = placement.sponsor;
  useEffect(() => {
    if (playing) dialog.current?.showModal();
    else dialog.current?.close();
  }, [playing]);
  if (!sponsor) return null;
  const href = normalizeExternalUrl(placement.cta_url || sponsor.website_url);
  const close = () => {
    setPlaying(false);
    trigger.current?.focus();
  };
  const logo = <SponsorLogo sponsor={sponsor} />;
  return (
    <article className="flex max-w-full flex-col items-center gap-3 p-3 text-center">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-gold-400"
        >
          {logo}
        </a>
      ) : (
        logo
      )}
      {placement.headline && (
        <h3 className="max-w-xs break-words font-heading font-bold">{tf(placement, "headline")}</h3>
      )}
      {placement.blurb && (
        <p className="max-w-sm whitespace-pre-line break-words text-sm text-text-secondary">{tf(placement, "blurb")}</p>
      )}
      {href && placement.placement_type === "featured_bar" && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="p-2 text-sm text-gold-400 underline underline-offset-4"
        >
          {t("sponsorPlacements.learnMore")}
        </a>
      )}
      {video && (
        <button
          type="button"
          ref={trigger}
          onClick={() => setPlaying(true)}
          className="relative flex min-h-24 w-40 items-center justify-center overflow-hidden rounded-md border border-white/20 bg-navy-900 p-3 text-sm text-white"
          aria-label={t("sponsorPlacements.watchVideo", { name: sponsor.name })}
        >
          {video.thumbnail && (
            <img src={video.thumbnail} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <span className="relative flex items-center gap-2 rounded bg-black/80 px-3 py-2">
            <Play size={18} />
            {t("sponsorPlacements.video")}
          </span>
        </button>
      )}
      <dialog
        ref={dialog}
        onCancel={close}
        onClose={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        aria-label={t("sponsorPlacements.watchVideo", { name: sponsor.name })}
        className="m-auto w-[min(90vw,960px)] max-w-none border border-white/20 bg-navy-900 p-4 text-white backdrop:bg-black/80"
      >
        <button
          type="button"
          onClick={close}
          aria-label={t("sponsorPlacements.closeVideo")}
          className="mb-3 flex min-h-11 min-w-11 items-center justify-center"
        >
          <X />
        </button>
        {playing && video && (
          <iframe
            src={video.embed}
            title={t("sponsorPlacements.watchVideo", { name: sponsor.name })}
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full border-0"
          />
        )}
      </dialog>
    </article>
  );
}

export function FeaturedSponsorBar({ placements }: { placements: SponsorPlacement[] }) {
  const { t } = useTranslation();
  const items = placements.filter((p) => p.placement_type === "featured_bar");
  if (!items.length) return null;
  return (
    <section aria-label={t("sponsorPlacements.featured")} className="border-y border-gold-500/20 bg-surface px-4 py-8">
      <h2 className="mb-4 text-center font-heading text-sm font-semibold uppercase tracking-widest text-gold-400">
        {t("sponsorPlacements.featured")}
      </h2>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-5">
        {items.map((p, i) => (
          <PlacementCard key={p.id ?? i} placement={p} />
        ))}
      </div>
    </section>
  );
}

export function SponsorTiers({ placements, event = false }: { placements: SponsorPlacement[]; event?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-10">
      {(["presenting", "secondary", "official"] as const).map((tier) => {
        const items = placements.filter((p) =>
          event ? p.placement_type === "event" && p.display_tier === tier : p.placement_type === tier
        );
        if (!items.length) return null;
        return (
          <section key={tier} aria-label={t(`sponsorPlacements.${tier}`)}>
            <h2 className="mb-5 text-center font-heading text-xs font-semibold uppercase tracking-widest text-gold-400">
              {t(`sponsorPlacements.${tier}`)}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {items.map((p, i) => (
                <PlacementCard key={p.id ?? i} placement={p} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
