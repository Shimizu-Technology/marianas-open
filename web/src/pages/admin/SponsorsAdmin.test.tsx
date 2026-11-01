import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../locales/en.json";
import SponsorsAdmin from "./SponsorsAdmin";
import { api, type Sponsor } from "../../services/api";

vi.mock("../../services/api", () => ({
  api: {
    admin: {
      getSponsors: vi.fn(),
      getEvents: vi.fn(),
      createSponsor: vi.fn(),
      updateSponsor: vi.fn(),
      uploadSponsorLogo: vi.fn(),
      deleteSponsor: vi.fn(),
    },
  },
}));
const sponsor: Sponsor = {
  id: 1,
  name: "Hotel Tano",
  tier: "official",
  website_url: "",
  logo_url: null,
  sort_order: 0,
  placements: [],
};
beforeAll(async () => {
  await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } } });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
beforeEach(() => {
  vi.mocked(api.admin.getSponsors).mockResolvedValue({ sponsors: [sponsor] });
  vi.mocked(api.admin.getEvents).mockResolvedValue({ events: [] });
  vi.mocked(api.admin.createSponsor).mockResolvedValue({ sponsor: { ...sponsor, id: 2 } });
  vi.mocked(api.admin.updateSponsor).mockResolvedValue({ sponsor });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("creates a dated featured placement with plain labels and previews before saving", async () => {
  render(
    <MemoryRouter initialEntries={["/?edit=new"]}>
      <SponsorsAdmin />
    </MemoryRouter>
  );
  const name = await screen.findByLabelText("Sponsor name");
  fireEvent.change(name, { target: { value: "New partner" } });
  fireEvent.change(screen.getByLabelText("First day (optional)"), { target: { value: "2027-01-01" } });
  fireEvent.change(screen.getByLabelText("Last day (optional)"), { target: { value: "2027-01-30" } });
  expect(screen.getByRole("region", { name: "Featured sponsors" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save sponsor" }));
  await waitFor(() =>
    expect(api.admin.createSponsor).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New partner",
        sponsor_placements_attributes: [
          expect.objectContaining({ starts_on: "2027-01-01", ends_on: "2027-01-30", placement_type: "featured_bar" }),
        ],
      })
    )
  );
  expect(await screen.findByText("Sponsor and placements saved.")).toBeTruthy();
});

it("requires explicit deletion confirmation and can cancel", async () => {
  render(
    <MemoryRouter>
      <SponsorsAdmin />
    </MemoryRouter>
  );
  fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
  expect(api.admin.deleteSponsor).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("button", { name: "Yes, delete sponsor" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Yes, delete sponsor" }));
  await waitFor(() => expect(api.admin.deleteSponsor).toHaveBeenCalledWith(1));
});

it("keeps edits visible when saving fails and allows retry", async () => {
  vi.mocked(api.admin.updateSponsor).mockRejectedValueOnce(new Error("Please retry"));
  render(
    <MemoryRouter initialEntries={["/?edit=1"]}>
      <SponsorsAdmin />
    </MemoryRouter>
  );
  const name = await screen.findByLabelText("Sponsor name");
  fireEvent.change(name, { target: { value: "Updated sponsor" } });
  fireEvent.click(screen.getByRole("button", { name: "Save sponsor" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect((name as HTMLInputElement).value).toBe("Updated sponsor");
  fireEvent.click(screen.getByRole("button", { name: "Save sponsor" }));
  expect(await screen.findByText("Sponsor and placements saved.")).toBeTruthy();
});

it('previews video without saving the form', async () => {
  render(<MemoryRouter initialEntries={['/?edit=new']}><SponsorsAdmin /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Sponsor name'), { target: { value: 'Preview sponsor' } });
  fireEvent.change(screen.getByLabelText('YouTube or Vimeo link (optional)'), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Watch Preview sponsor video' }));
  expect(api.admin.createSponsor).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Close video' }));
  expect(api.admin.createSponsor).not.toHaveBeenCalled();
});

it('retains failed uploads and saved placement IDs for retry without creating duplicates', async () => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const saved = { ...sponsor, id: 2, name: 'New partner', placements: [{ id: 42, placement_type: 'featured_bar' as const, display_tier: 'official' as const, event_id: null, starts_on: null, ends_on: null, sort_order: 0, headline: '', blurb: '', video_url: '', cta_url: '' }] };
  vi.mocked(api.admin.createSponsor).mockResolvedValue({ sponsor: saved });
  vi.mocked(api.admin.updateSponsor).mockResolvedValue({ sponsor: saved });
  vi.mocked(api.admin.uploadSponsorLogo).mockRejectedValueOnce(new Error('Upload interrupted')).mockResolvedValueOnce({ sponsor: saved });
  render(<MemoryRouter initialEntries={['/?edit=new']}><SponsorsAdmin /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Sponsor name'), { target: { value: 'New partner' } });
  const file = new File(['image'], 'logo.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText(/^Regular logo/), { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: 'Save sponsor' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Save sponsor' }));
  await waitFor(() => expect(api.admin.uploadSponsorLogo).toHaveBeenCalledTimes(2));
  expect(api.admin.createSponsor).toHaveBeenCalledTimes(1);
  expect(api.admin.updateSponsor).toHaveBeenCalledWith(2, expect.objectContaining({ sponsor_placements_attributes: [expect.objectContaining({ id: 42 })] }));
  expect(await screen.findByText('Sponsor and placements saved.')).toBeTruthy();
});

it('reorders a placement with move buttons and reloads the saved order', async () => {
  const placement = { id: 10, placement_type: 'official' as const, display_tier: 'official' as const, event_id: null, starts_on: null, ends_on: null, sort_order: 0, headline: '', blurb: '', video_url: '', cta_url: '' };
  let list: Sponsor[] = [{ ...sponsor, placements: [placement] }, { ...sponsor, id: 2, name: 'Ready H2GO', placements: [{ ...placement, id: 20, sort_order: 1 }] }];
  vi.mocked(api.admin.getSponsors).mockImplementation(async () => ({ sponsors: list }));
  vi.mocked(api.admin.updateSponsor).mockImplementation(async (id, data) => {
    list = list.map(s => s.id === id ? { ...s, placements: data.sponsor_placements_attributes } : s);
    return { sponsor: list.find(s => s.id === id)! };
  });
  render(<MemoryRouter><SponsorsAdmin /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Show on'), { target: { value: 'official' } });
  expect((screen.getByRole('button', { name: 'Move Hotel Tano up' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Move Hotel Tano down' }));
  expect(await screen.findByText('Display order saved.')).toBeTruthy();
  expect(list.find(s => s.id === 2)?.placements?.[0].sort_order).toBe(0);
  expect(list.find(s => s.id === 1)?.placements?.[0].sort_order).toBe(1);
  expect((screen.getByRole('button', { name: 'Move Hotel Tano up' }) as HTMLButtonElement).disabled).toBe(false);
});

it('shows a retry action instead of an empty sponsor list when initial loading fails', async () => {
  vi.mocked(api.admin.getSponsors).mockRejectedValueOnce(new Error('Unable to load sponsors'));
  render(<MemoryRouter><SponsorsAdmin /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Add sponsor' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: en.eventDetail.retry }));
  expect(await screen.findByText('Hotel Tano')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Add sponsor' })).toBeTruthy();
});
