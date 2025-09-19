import axios from "axios";

export default defineEventHandler(async (event) => {
  const videoId = getRouterParam(event, "videoId");
  const path = getRouterParam(event, "path"); // e.g. "240p/video.m3u8"

  if (!videoId || !path) {
    return { error: true, message: "Missing videoId or path" };
  }

  const targetUrl = `https://vz-be550dce-c8c.b-cdn.net/${videoId}/${path}`;

  try {
    const isPlaylist = targetUrl.includes(".m3u8");
    const res = await axios.get(targetUrl, {
      responseType: isPlaylist ? "text" : "arraybuffer",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        accept: "*/*",
        origin: "https://www.zioncenter.co.kr",
        referer: "https://www.zioncenter.co.kr/",
      },
    });

    if (isPlaylist) {
      let playlist = res.data as string;

      // Rewrite URLs inside playlist
      playlist = playlist.replace(
        /((?:https?:\/\/[^\s]+)?\d+p\/[^\s]+)/g,
        (match) => {
          const cleaned = match.replace(/^https?:\/\/[^/]+\/?/, "");
          return `/api/v1/playlist/${videoId}/${cleaned}`;
        }
      );

      // Rewrite .ts segments
      playlist = playlist.replace(
        /([0-9]+p\/[^\s]+\.ts)/g,
        (match) => `/api/v1/playlist/${videoId}/${match}`
      );

      return new Response(playlist, {
        headers: { "content-type": "application/vnd.apple.mpegurl" },
      });
    } else {
      return new Response(res.data, {
        headers: {
          "content-type":
            res.headers["content-type"] || "application/octet-stream",
        },
      });
    }
  } catch (err: any) {
    console.error("Proxy failed", targetUrl, err.message);
    return {
      error: true,
      url: targetUrl,
      statusCode: 500,
      statusMessage: "Proxy failed",
      message: "Proxy failed",
    };
  }
});
