import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { api, type Sponsor, type SponsorFormData, type SponsorPlacement, type Event } from "../../services/api";
import { FeaturedSponsorBar, SponsorTiers, SponsorLogo } from "../../components/SponsorPlacements";
import { normalizeExternalUrl } from "../../utils/images";
import { useEditingParam } from "../../hooks/useEditingParam";

const inputClass =
  "mt-1 min-h-11 w-full rounded border border-white/20 bg-navy-900 px-3 py-2 text-base text-text-primary focus-visible:outline-2 focus-visible:outline-gold-400";
const buttonClass =
  "min-h-11 rounded border border-white/20 px-4 py-2 text-sm font-medium hover:border-gold-400 focus-visible:outline-2 focus-visible:outline-gold-400 disabled:opacity-40";
const empty: SponsorFormData = {
  name: "",
  tier: "official",
  website_url: "",
  sort_order: 0,
  sponsor_placements_attributes: [],
};
const newPlacement = (): SponsorPlacement => ({
  placement_type: "featured_bar",
  display_tier: "official",
  event_id: null,
  sort_order: 0,
  starts_on: null,
  ends_on: null,
  headline: "",
  blurb: "",
  cta_url: "",
  video_url: "",
});

function sponsorForm(sponsor: Sponsor): SponsorFormData {
  return {
    name: sponsor.name, tier: sponsor.tier, website_url: normalizeExternalUrl(sponsor.website_url) || sponsor.website_url || '', sort_order: sponsor.sort_order,
    sponsor_placements_attributes: sponsor.placements?.map(p => ({ ...p })) || [],
  }
}

export default function SponsorsAdmin() {
  const { t } = useTranslation();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [editing, setEditing] = useEditingParam();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<SponsorFormData>(empty);
  const [files, setFiles] = useState<{ light?: File; dark?: File }>({});
  const [previewUrls, setPreviewUrls] = useState<{ light?: string; dark?: string }>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [placementFilter, setPlacementFilter] = useState<SponsorPlacement["placement_type"]>("featured_bar");
  const initializedEditor = useRef<number | "new" | null>(null);
  const current = sponsors.find((s) => s.id === editing);
  const missingTarget = searchParams.has("edit") && editing !== "new" && !current;
  const editorOpen = editing !== null && !missingTarget;
  const placements = form.sponsor_placements_attributes || [];
  const load = async () => {
    const data = await api.admin.getSponsors();
    setSponsors(data.sponsors);
  };
  useEffect(() => {
    setLoading(true);
    setLoadFailed(false);
    setError("");
    Promise.all([api.admin.getSponsors(), api.admin.getEvents()])
      .then(([s, e]) => {
        setSponsors(s.sponsors);
        setEvents(e.events);
      })
      .catch((err) => { setError(err.message); setLoadFailed(true); })
      .finally(() => setLoading(false));
  }, [loadVersion]);
  useEffect(() => {
    if (editing === null) {
      initializedEditor.current = null;
      setFiles({});
      return;
    }
    if (initializedEditor.current === editing) return;
    if (editing === "new") setForm({ ...empty, sponsor_placements_attributes: [newPlacement()] });
    else if (current) setForm(sponsorForm(current));
    else return;
    initializedEditor.current = editing;
    setFiles({});
  }, [editing, current]);
  useEffect(() => {
    const urls = {
      light: files.light && URL.createObjectURL(files.light),
      dark: files.dark && URL.createObjectURL(files.dark),
    };
    setPreviewUrls(urls);
    return () =>
      Object.values(urls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
  }, [files]);
  const changePlacement = (index: number, update: Partial<SponsorPlacement>) =>
    setForm((f) => ({
      ...f,
      sponsor_placements_attributes: f.sponsor_placements_attributes?.map((p, i) =>
        i === index ? { ...p, ...update } : p
      ),
    }));
  const previewSponsor: Sponsor = {
    id: current?.id || 0,
    ...form,
    logo_url: previewUrls.light || current?.logo_url || null,
    logo_dark_url: previewUrls.dark || current?.logo_dark_url || null,
  };
  const preview = placements.filter((p) => !p._destroy).map((p) => ({ ...p, sponsor: previewSponsor }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = initializedEditor.current;
    const validTarget = !missingTarget && (editing === "new"
      ? id === "new" || (typeof id === "number" && sponsors.some(s => s.id === id))
      : typeof editing === "number" && id === editing && Boolean(current));
    if (saving || !validTarget) {
      if (!validTarget) setError(t("sponsorAdmin.notFound"));
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // The URL may still be transitioning when an upload fails. Use the saved
      // identity immediately so a fast retry cannot create another sponsor.
      const data = typeof id === 'number'
        ? await api.admin.updateSponsor(id, form)
        : await api.admin.createSponsor(form);
      // Keep the saved ID even if an upload fails, so retry cannot duplicate a sponsor.
      const pending = { ...files };
      initializedEditor.current = data.sponsor.id;
      setForm(sponsorForm(data.sponsor));
      setEditing(data.sponsor.id);
      setSponsors((items) => [...items.filter((s) => s.id !== data.sponsor.id), data.sponsor]);
      for (const variant of ["light", "dark"] as const) {
        if (pending[variant]) {
          await api.admin.uploadSponsorLogo(data.sponsor.id, pending[variant], variant);
          setFiles(selected => { const remaining = { ...selected }; delete remaining[variant]; return remaining; });
        }
      }
      await load();
      setFiles({});
      setSuccess(t("sponsorAdmin.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sponsorAdmin.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: number) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.admin.deleteSponsor(id);
      setSponsors(items => items.filter(sponsor => sponsor.id !== id));
      setConfirmDelete(null);
      if (editing === id) setEditing(null);
      setSuccess(t("sponsorAdmin.deleted"));
      // Deletion is already committed. A failed refresh must not undo its UI outcome.
      await load().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sponsorAdmin.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  const ordered = sponsors
    .flatMap((s) =>
      (s.placements || [])
        .filter((p) => p.placement_type === placementFilter)
        .map((p) => ({ sponsor: s, placement: p }))
    )
    .sort((a, b) => a.placement.sort_order - b.placement.sort_order || (a.placement.id || 0) - (b.placement.id || 0));
  const move = async (index: number, delta: number) => {
    const first = ordered[index],
      second = ordered[index + delta];
    if (!second) return;
    setSaving(true);
    setError("");
    try {
      // Set a stable dense sequence; each request writes the sponsor's audit trail.
      const reordered = [...ordered];
      [reordered[index], reordered[index + delta]] = [second, first];
      const bySponsor = new Map<number, SponsorPlacement[]>();
      reordered.forEach((item, i) => {
        if (item.placement.sort_order === i) return;
        bySponsor.set(item.sponsor.id, [
          ...(bySponsor.get(item.sponsor.id) || []),
          { ...item.placement, sort_order: i },
        ]);
      });
      for (const [id, values] of bySponsor)
        await api.admin.updateSponsor(id, { sponsor_placements_attributes: values });
      await load();
      setSuccess(t("sponsorAdmin.orderSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sponsorAdmin.saveFailed"));
      await load().catch(() => {});
    } finally {
      setSaving(false);
    }
  };
  const placementLabel = (item: { sponsor: Sponsor; placement: SponsorPlacement }) => {
    if (item.placement.placement_type !== "event") return item.sponsor.name;
    const scope = item.placement.event_id == null
      ? t("sponsorAdmin.allEvents")
      : events.find(event => event.id === item.placement.event_id)?.name || `#${item.placement.event_id}`;
    return `${item.sponsor.name} · ${scope}`;
  };
  if (loading) return <p role="status">{t("sponsorAdmin.loading")}</p>;
  if (loadFailed) return <div role="alert" className="space-y-4 rounded border border-red-400/40 p-4">
    <p>{error}</p><button type="button" className={buttonClass} onClick={() => setLoadVersion(v => v + 1)}>{t('eventDetail.retry')}</button>
  </div>;
  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{t("sponsorAdmin.title")}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t("sponsorAdmin.intro")}</p>
        </div>
        {editing === null && !missingTarget && (
          <button
            className={buttonClass}
            disabled={saving}
            onClick={() => {
              setEditing("new");
              setError("");
              setSuccess("");
            }}
          >
            {t("sponsorAdmin.add")}
          </button>
        )}
      </header>
      {!editorOpen && error && (
        <p role="alert" className="rounded border border-red-400/40 p-4 text-red-300">
          {error}
        </p>
      )}
      {!editorOpen && success && (
        <p role="status" className="rounded border border-green-400/40 p-4 text-green-300">
          {success}
        </p>
      )}
      {missingTarget ? (
        <div className="space-y-4">
          <p role="alert">{t("sponsorAdmin.notFound")}</p>
          <button type="button" className={buttonClass} onClick={() => setEditing(null)}>{t("sponsorAdmin.back")}</button>
        </div>
      ) : editing !== null ? (
        <form onSubmit={save} className="space-y-6 rounded border border-white/15 bg-surface p-4 sm:p-6">
          <fieldset disabled={saving} className="min-w-0 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{t(editing === "new" ? "sponsorAdmin.add" : "sponsorAdmin.edit")}</h2>
            <button type="button" className={buttonClass} disabled={saving} onClick={() => setEditing(null)}>
              {t("sponsorAdmin.back")}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              {t("sponsorAdmin.name")}
              <input
                required
                maxLength={200}
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              {t("sponsorAdmin.website")}
              <input
                type="url"
                placeholder="https://"
                className={inputClass}
                value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })}
              />
            </label>
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-2 font-bold">{t("sponsorAdmin.logos")}</legend>
            <p className="text-sm text-text-secondary">{t("sponsorAdmin.logoHelp")}</p>
            <div className="grid gap-5 sm:grid-cols-2">
              {(["light", "dark"] as const).map((variant) => (
                <label key={variant} className="min-w-0 space-y-3 rounded border border-white/15 p-4">
                  <span className="block">{t(`sponsorAdmin.${variant}Logo`)}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="block min-h-11 w-full text-sm file:mr-2 file:min-h-11 file:rounded file:border file:px-2"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFiles((f) => ({ ...f, [variant]: file }));
                    }}
                  />
                  <SponsorLogo
                    key={`${variant}-${previewUrls[variant]}`}
                    sponsor={previewSponsor}
                    dark={variant === "dark"}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="mb-2 font-bold">{t("sponsorAdmin.where")}</legend>
            {placements.map((p, index) =>
              p._destroy ? null : (
                <div key={p.id ?? `new-${index}`} className="space-y-4 rounded border border-white/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{t("sponsorAdmin.placementNumber", { number: index + 1 })}</h3>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => changePlacement(index, { _destroy: true })}
                    >
                      {t("sponsorAdmin.removePlacement")}
                    </button>
                  </div>
                  <label className="block">
                    {t("sponsorAdmin.showOn")}
                    <select
                      className={inputClass}
                      value={p.placement_type}
                      onChange={(e) =>
                        changePlacement(index, {
                          placement_type: e.target.value as SponsorPlacement["placement_type"],
                          event_id: null,
                        })
                      }
                    >
                      {["featured_bar", "presenting", "secondary", "official", "event"].map((type) => (
                        <option key={type} value={type}>
                          {t(`sponsorAdmin.locations.${type}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {p.placement_type === "event" && (
                    <>
                      <label className="block">
                        {t("sponsorAdmin.eventTier")}
                        <select
                          className={inputClass}
                          value={p.display_tier}
                          onChange={(e) =>
                            changePlacement(index, { display_tier: e.target.value as SponsorPlacement["display_tier"] })
                          }
                        >
                          {["presenting", "secondary", "official"].map((tier) => (
                            <option key={tier} value={tier}>
                              {t(`sponsorPlacements.${tier}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        {t("sponsorAdmin.eventScope")}
                        <select
                          className={inputClass}
                          value={p.event_id || ""}
                          onChange={(e) => changePlacement(index, { event_id: Number(e.target.value) || null })}
                        >
                          <option value="">{t("sponsorAdmin.allEvents")}</option>
                          {events.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-sm text-text-secondary">{t("sponsorAdmin.eventHelp")}</p>
                    </>
                  )}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label>
                      {t("sponsorAdmin.start")}
                      <input
                        type="date"
                        className={inputClass}
                        value={p.starts_on || ""}
                        onChange={(e) => changePlacement(index, { starts_on: e.target.value || null })}
                      />
                    </label>
                    <label>
                      {t("sponsorAdmin.end")}
                      <input
                        type="date"
                        min={p.starts_on || undefined}
                        className={inputClass}
                        value={p.ends_on || ""}
                        onChange={(e) => changePlacement(index, { ends_on: e.target.value || null })}
                      />
                    </label>
                    <label>
                      {t("sponsorAdmin.order")}
                      <input
                        type="number"
                        step="1"
                        className={inputClass}
                        value={p.sort_order}
                        onChange={(e) => changePlacement(index, { sort_order: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <p className="text-sm text-text-secondary">{t("sponsorAdmin.scheduleHelp")}</p>
                  <label className="block">
                    {t("sponsorAdmin.headline")}
                    <input
                      maxLength={200}
                      className={inputClass}
                      value={p.headline || ""}
                      onChange={(e) => changePlacement(index, { headline: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    {t("sponsorAdmin.blurb")}
                    <textarea
                      maxLength={2000}
                      rows={3}
                      className={inputClass}
                      value={p.blurb || ""}
                      onChange={(e) => changePlacement(index, { blurb: e.target.value })}
                    />
                  </label>
                  <p className="text-sm text-text-secondary">{t("sponsorAdmin.translationHelp")}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      {t("sponsorAdmin.video")}
                      <input
                        type="url"
                        placeholder="https://"
                        className={inputClass}
                        value={p.video_url || ""}
                        onChange={(e) => changePlacement(index, { video_url: e.target.value })}
                      />
                    </label>
                    <label>
                      {t("sponsorAdmin.cta")}
                      <input
                        type="url"
                        placeholder="https://"
                        className={inputClass}
                        value={p.cta_url || ""}
                        onChange={(e) => changePlacement(index, { cta_url: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
              )
            )}
            <button
              type="button"
              className={buttonClass}
              onClick={() => setForm((f) => ({ ...f, sponsor_placements_attributes: [...placements, newPlacement()] }))}
            >
              {t("sponsorAdmin.addPlacement")}
            </button>
          </fieldset>
          <section className="space-y-4 border-t border-white/15 pt-6" aria-label={t("sponsorAdmin.preview")}>
            <h2 className="font-bold">{t("sponsorAdmin.preview")}</h2>
            <p className="text-sm text-text-secondary">{t("sponsorAdmin.previewHelp")}</p>
            <FeaturedSponsorBar placements={preview} />
            <SponsorTiers placements={preview} />
            <SponsorTiers placements={preview} event />
          </section>
          <div className="sticky bottom-0 z-10 min-w-0 space-y-3 border-t border-white/20 bg-surface py-4">
            <button className={`${buttonClass} bg-gold-500 text-navy-900`} disabled={saving}>
              {t(saving ? "sponsorAdmin.saving" : "sponsorAdmin.save")}
            </button>
            {error && <p role="alert" className="min-w-0 break-words text-sm text-red-300">{error}</p>}
            {success && <p role="status" className="min-w-0 break-words text-sm text-green-300">{success}</p>}
          </div>
          {current?.audit_history?.length ? (
            <section>
              <h2 className="mb-3 font-bold">{t("sponsorAdmin.history")}</h2>
              <ul className="space-y-2 text-sm text-text-secondary">
                {current.audit_history.map((entry, i) => (
                  <li key={i}>
                    {t(`sponsorAdmin.actions.${entry.action}`, entry.action)} · {entry.actor_name} ·{" "}
                    {new Date(entry.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          </fieldset>
        </form>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-bold">{t("sponsorAdmin.allSponsors")}</h2>
            {!sponsors.length && <p>{t("sponsorAdmin.empty")}</p>}
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/15 bg-surface p-4"
              >
                <div className="min-w-0">
                  <h3 className="break-words font-bold">{sponsor.name}</h3>
                  <p className="text-sm text-text-secondary">
                    {t("sponsorAdmin.placementCount", { count: sponsor.placements?.length || 0 })}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                    {sponsor.placements?.map((p, i) => (
                      <li key={p.id ?? i}>
                        {t(`sponsorAdmin.locations.${p.placement_type}`)}
                        {p.event_id ? ` · ${events.find((e) => e.id === p.event_id)?.name || ""}` : ""}
                        {p.starts_on || p.ends_on ? ` · ${p.starts_on || "—"} – ${p.ends_on || "—"}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <button
                    className={buttonClass}
                    disabled={saving}
                    onClick={() => {
                      setEditing(sponsor.id);
                      setError("");
                      setSuccess("");
                    }}
                  >
                    {t("sponsorAdmin.edit")}
                  </button>
                  <button className={buttonClass} disabled={saving} onClick={() => setConfirmDelete(sponsor.id)}>
                    {t("sponsorAdmin.delete")}
                  </button>
                </div>
                {confirmDelete === sponsor.id && (
                  <div className="w-full space-y-3 border-t border-white/15 pt-4" role="alert">
                    <p>{t("sponsorAdmin.confirmDelete", { name: sponsor.name })}</p>
                    <button
                      className={`${buttonClass} mr-2 text-red-300`}
                      disabled={saving}
                      onClick={() => remove(sponsor.id)}
                    >
                      {t("sponsorAdmin.deleteConfirm")}
                    </button>
                    <button className={buttonClass} disabled={saving} onClick={() => setConfirmDelete(null)}>
                      {t("sponsorAdmin.cancel")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
          <section className="space-y-4 rounded border border-white/15 bg-surface p-4">
            <h2 className="font-bold">{t("sponsorAdmin.reorder")}</h2>
            <label className="block">
              {t("sponsorAdmin.showOn")}
              <select
                className={inputClass}
                value={placementFilter}
                disabled={saving}
                onChange={(e) => setPlacementFilter(e.target.value as SponsorPlacement["placement_type"])}
              >
                {["featured_bar", "presenting", "secondary", "official", "event"].map((type) => (
                  <option key={type} value={type}>
                    {t(`sponsorAdmin.locations.${type}`)}
                  </option>
                ))}
              </select>
            </label>
            {ordered.map((item, index) => (
              <div
                key={item.placement.id}
                className="flex items-center justify-between gap-2 border-t border-white/10 py-3"
              >
                <span className="min-w-0 break-words">{placementLabel(item)}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    className={buttonClass}
                    disabled={saving || index === 0}
                    aria-label={t("sponsorAdmin.moveUp", { name: placementLabel(item) })}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className={buttonClass}
                    disabled={saving || index === ordered.length - 1}
                    aria-label={t("sponsorAdmin.moveDown", { name: placementLabel(item) })}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
