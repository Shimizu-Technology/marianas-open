import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api, type SponsorPlacement } from "../services/api";
import { useSponsorPlacements } from "./useSponsorPlacements";

vi.mock("../services/api", () => ({ api: { getSponsorPlacements: vi.fn() } }));
const items = [{ id: 1 }] as SponsorPlacement[];
const response = (sponsor_placements = items) => ({ sponsor_placements });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(api.getSponsorPlacements).mockReset().mockResolvedValue(response());
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("exposes initial failure and recovers on retry without exposing backend errors", async () => {
  vi.mocked(api.getSponsorPlacements).mockRejectedValueOnce(new Error("private details"));
  const { result } = renderHook(() => useSponsorPlacements());
  await act(async () => {});
  expect(result.current).toMatchObject({ placements: [], error: true });
  await act(async () => { result.current.retry(); });
  expect(result.current).toMatchObject({ placements: items, error: false });
  expect(api.getSponsorPlacements).toHaveBeenCalledTimes(2);
});

it("refreshes on a visible interval and tab return, retaining data on failed refresh", async () => {
  const { result, unmount } = renderHook(() => useSponsorPlacements(7));
  await act(async () => {});
  vi.mocked(api.getSponsorPlacements).mockRejectedValueOnce(new Error("offline"));
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(result.current).toMatchObject({ placements: items, error: true });
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); document.dispatchEvent(new Event("visibilitychange")); });
  expect(api.getSponsorPlacements).toHaveBeenCalledTimes(2);
  const refreshed = [{ id: 2 }] as SponsorPlacement[];
  vi.mocked(api.getSponsorPlacements).mockResolvedValueOnce(response(refreshed));
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  expect(result.current).toMatchObject({ placements: refreshed, error: false });
  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(120_000); document.dispatchEvent(new Event("visibilitychange")); });
  expect(api.getSponsorPlacements).toHaveBeenCalledTimes(3);
});

it("hides old-event data immediately and ignores old scopes and disabled responses", async () => {
  const old = deferred<ReturnType<typeof response>>();
  const disabled = deferred<ReturnType<typeof response>>();
  const { result, rerender } = renderHook(({ id, enabled }) => useSponsorPlacements(id, enabled), { initialProps: { id: 7, enabled: true } });
  await act(async () => {});
  vi.mocked(api.getSponsorPlacements).mockReturnValueOnce(old.promise).mockReturnValueOnce(disabled.promise);
  await act(async () => { result.current.retry(); });
  rerender({ id: 8, enabled: true });
  expect(result.current).toMatchObject({ placements: [], error: false });
  await act(async () => { old.resolve(response()); });
  expect(result.current.placements).toEqual([]);
  rerender({ id: 8, enabled: false });
  await act(async () => { disabled.reject(new Error("late failure")); });
  expect(result.current).toMatchObject({ placements: [], error: false });
  await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
  expect(api.getSponsorPlacements).toHaveBeenCalledTimes(3);
  expect(vi.mocked(api.getSponsorPlacements).mock.calls.map(call => call[0])).toEqual([7, 7, 8]);
});

it("ignores an older response when overlapping refreshes settle out of order", async () => {
  const old = deferred<ReturnType<typeof response>>();
  vi.mocked(api.getSponsorPlacements).mockReturnValueOnce(old.promise);
  const { result } = renderHook(() => useSponsorPlacements());
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(result.current.placements).toEqual(items);
  await act(async () => { old.resolve(response([])); });
  expect(result.current.placements).toEqual(items);
});
