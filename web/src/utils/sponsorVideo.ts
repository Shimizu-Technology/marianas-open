/** Parse provider IDs locally; never embed arbitrary user-supplied URLs. */
export function sponsorVideo(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(u.hostname)) {
      const id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v") || u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1];
      if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
      return {
        embed: `https://www.youtube-nocookie.com/embed/${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(u.hostname)) {
      const id = u.pathname.match(/^\/(?:video\/)?(\d+)$/)?.[1];
      if (id) return { embed: `https://player.vimeo.com/video/${id}`, thumbnail: null };
    }
  } catch {
    /* Invalid URLs never become embeds. */
  }
  return null;
}
