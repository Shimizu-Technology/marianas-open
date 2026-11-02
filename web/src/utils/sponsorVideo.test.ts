import { expect, it } from "vitest";
import { sponsorVideo } from "./sponsorVideo";

const id = "dQw4w9WgXcQ";
it("accepts a sole watch ID and path IDs with absent or matching query v", () => {
  for (const url of [
    `https://youtube.com/watch?v=${id}`,
    `https://youtube.com/watch/?v=${id}`,
    ...[`https://youtu.be/${id}`, `https://youtube.com/embed/${id}`, `https://youtube.com/shorts/${id}`].flatMap(path => [path, `${path}?v=${id}`]),
  ]) expect(sponsorVideo(url)?.embed).toBe(`https://www.youtube-nocookie.com/embed/${id}`);
});
it("rejects duplicate v values and conflicting path/query IDs", () => {
  for (const path of [`https://youtube.com/watch`, `https://youtu.be/${id}`, `https://youtube.com/embed/${id}`, `https://youtube.com/shorts/${id}`]) {
    expect(sponsorVideo(`${path}?v=${id}&v=${id}`)).toBeNull();
  }
  for (const path of [`https://youtu.be/${id}`, `https://youtube.com/embed/${id}`, `https://youtube.com/shorts/${id}`]) {
    expect(sponsorVideo(`${path}?v=abcdefghijk`)).toBeNull();
    expect(sponsorVideo(`${path}?v=`)).toBeNull();
  }
});
it("retains a valid Vimeo privacy hash and rejects empty, malformed and duplicate hashes", () => {
  for (const path of ["https://vimeo.com/123", "https://player.vimeo.com/video/123"]) {
    expect(sponsorVideo(`${path}?h=AbC123`)?.embed).toBe("https://player.vimeo.com/video/123?h=AbC123");
    for (const query of ["h=", "h=abc-def", "h=abc%20def", "h=abc&h=abc", "h=abc&h="]) {
      expect(sponsorVideo(`${path}?${query}`)).toBeNull();
    }
  }
});
