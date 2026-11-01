/** Parse provider IDs locally; never embed arbitrary user-supplied URLs. */
export function sponsorVideo(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(u.hostname)) {
      const values = u.searchParams.getAll("v");
      if (values.length > 1) return null;
      const pathId = u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1];
      if (pathId && values.length && values[0] !== pathId) return null;
      const id = pathId || (u.pathname === "/watch" ? values[0] : undefined);
      if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
      return {
        embed: `https://www.youtube-nocookie.com/embed/${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(u.hostname)) {
      const id = u.pathname.match(/^\/(?:video\/)?(\d+)$/)?.[1];
      const hashes = u.searchParams.getAll("h");
      if (hashes.length > 1 || (hashes.length === 1 && !/^[a-zA-Z0-9]+$/.test(hashes[0]))) return null;
      if (id) return { embed: `https://player.vimeo.com/video/${id}${hashes.length ? `?h=${hashes[0]}` : ""}`, thumbnail: null };
    }
  } catch {
    /* Invalid URLs never become embeds. */
  }
  return null;
}
