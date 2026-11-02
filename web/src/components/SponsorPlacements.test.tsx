import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import { FeaturedSponsorBar, SponsorLogo, SponsorTiers, SponsorPlacementsError } from "./SponsorPlacements";
import { sponsorVideo } from "../utils/sponsorVideo";
import type { SponsorPlacement } from "../services/api";

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } } });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
const placement = (type: SponsorPlacement["placement_type"], name: string): SponsorPlacement => ({
  id: name.length,
  placement_type: type,
  display_tier: "official",
  event_id: null,
  starts_on: null,
  ends_on: null,
  sort_order: 0,
  headline: "",
  blurb: "",
  cta_url: "",
  video_url: "",
  sponsor: { id: 1, name, tier: "official", sort_order: 0, website_url: null, logo_url: null },
});

it("hides empty featured bars and renders every featured sponsor without autoplay", () => {
  const { rerender, container } = render(<FeaturedSponsorBar placements={[]} />);
  expect(container.textContent).toBe("");
  rerender(
    <FeaturedSponsorBar placements={[placement("featured_bar", "Sponsor A"), placement("featured_bar", "Sponsor B")]} />
  );
  expect(screen.getByText("Sponsor A")).toBeTruthy();
  expect(screen.getByText("Sponsor B")).toBeTruthy();
  expect(container.querySelector("iframe")).toBeNull();
});

it("opens only allowed provider video after activation and removes it on close", () => {
  const p = {
    ...placement("featured_bar", "Sponsor A"),
    video_url: "https://youtu.be/dQw4w9WgXcQ",
    cta_url: "javascript:alert(1)",
  };
  const { container } = render(<FeaturedSponsorBar placements={[p]} />);
  expect(container.querySelector("a")).toBeNull();
  const trigger = screen.getByRole("button", { name: "Watch Sponsor A video" });
  trigger.focus();
  fireEvent.click(trigger);
  expect(container.querySelector("iframe")?.src).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  fireEvent.click(screen.getByRole("button", { name: "Close video" }));
  expect(container.querySelector("iframe")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("uses dark logo on dark surfaces and a text badge after an image failure", () => {
  const sponsor = { ...placement("official", "Sponsor").sponsor!, logo_url: "/light.png", logo_dark_url: "/dark.png" };
  render(<SponsorLogo sponsor={sponsor} />);
  const image = screen.getByRole("img");
  expect(image.getAttribute("src")).toContain("/dark.png");
  fireEvent.error(image);
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.getByText("Sponsor")).toBeTruthy();
});

it("groups home and event placements with labels and no opacity dimming", () => {
  const items = [
    placement("presenting", "GVB"),
    placement("secondary", "Ready H2GO"),
    placement("official", "Hotel Tano"),
    placement("event", "Event sponsor"),
  ];
  const { rerender, container } = render(<SponsorTiers placements={items} />);
  expect(screen.getByRole("region", { name: "Presenting partner" })).toBeTruthy();
  expect(screen.getByRole("region", { name: "Supporting partners" })).toBeTruthy();
  expect(screen.getByRole("region", { name: "Official sponsors" })).toBeTruthy();
  expect(screen.queryByText("Event sponsor")).toBeNull();
  expect(container.innerHTML).not.toContain("opacity-60");
  rerender(<SponsorTiers placements={items} event />);
  expect(screen.getByText("Event sponsor")).toBeTruthy();
  expect(screen.queryByText("GVB")).toBeNull();
});

it("rejects misleading hosts and executable or invalid video URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=bad",
    "http://vimeo.com/123",
    "https://user:pass@vimeo.com/123",
  ])
    expect(sponsorVideo(url)).toBeNull();
  expect(sponsorVideo("https://vimeo.com/123")?.embed).toBe("https://player.vimeo.com/video/123");
});

it("falls back to the normalized sponsor website for whitespace-only CTA", () => {
  const p = placement("featured_bar", "Sponsor A");
  p.cta_url = "   ";
  p.sponsor!.website_url = "example.com";
  const { container } = render(<FeaturedSponsorBar placements={[p]} />);
  expect([...container.querySelectorAll("a")].map(link => link.href)).toEqual(["https://example.com/", "https://example.com/"]);
});

it("keeps Vimeo privacy hashes in the activated iframe and hides invalid videos", () => {
  const p = { ...placement("featured_bar", "Sponsor A"), video_url: "https://player.vimeo.com/video/123?h=AbC123" };
  const { container, rerender } = render(<FeaturedSponsorBar placements={[p]} />);
  fireEvent.click(screen.getByRole("button", { name: "Watch Sponsor A video" }));
  expect(container.querySelector("iframe")?.src).toBe("https://player.vimeo.com/video/123?h=AbC123");
  fireEvent.click(screen.getByRole("button", { name: "Close video" }));
  for (const video_url of ["https://vimeo.com/123?h=a&h=a", "https://youtube.com/watch?v=dQw4w9WgXcQ&v=dQw4w9WgXcQ"]) {
    rerender(<FeaturedSponsorBar placements={[{ ...p, video_url }]} />);
    expect(screen.queryByRole("button", { name: "Watch Sponsor A video" })).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  }
});

it("shows a localized sponsor load error with a working retry action", () => {
  const retry = vi.fn();
  render(<SponsorPlacementsError retry={retry} />);
  expect(screen.getByRole("alert").textContent).toContain(en.sponsorPlacements.loadError);
  fireEvent.click(screen.getByRole("button", { name: en.eventDetail.retry }));
  expect(retry).toHaveBeenCalledTimes(1);
});

it("reserves sponsor logo space while its lazy image is still loading", () => {
  const sponsor = { ...placement("official", "Sponsor").sponsor!, logo_url: "/sponsor.jpg" };
  render(<SponsorLogo sponsor={sponsor} />);
  const image = screen.getByRole("img");
  expect(image.getAttribute("loading")).toBe("lazy");
  expect(image.parentElement?.classList.contains("h-24")).toBe(true);
  expect(image.parentElement?.classList.contains("w-36")).toBe(true);
  fireEvent.error(image);
  expect(screen.getByText("Sponsor").parentElement?.classList.contains("h-24")).toBe(true);
});
