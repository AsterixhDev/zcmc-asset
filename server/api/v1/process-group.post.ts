import axios, { AxiosResponse } from "axios";
import path from "path";
import pLimit from "p-limit";
import * as cheerio from "cheerio";

interface ItemSelection {
  selected: boolean;
  items: Record<string, boolean>;
}

export default defineEventHandler(async (event) => {
  const {
    groupName,
    links,
    mode = "preview",
    selections,
    onlyWithVideo = false,
    onlyWithImages = false,
  } = (await readBody(event)) as {
    groupName: string;
    links: string[];
    mode?: "preview" | "download";
    selections?: Record<string, ItemSelection>;
    onlyWithVideo?: boolean;
    onlyWithImages?: boolean;
  };

  if (!groupName || !links || !Array.isArray(links)) {
    return {
      success: false,
      error: "Group name and links array are required",
    };
  }

  // Limit concurrency for both pages and images
  const pageLimit = pLimit(10);
  const imageLimit = pLimit(30);

  try {
    const results = await Promise.all(
      links.map((link) =>
        pageLimit(async () => {
          const fullLink = `${process.env.BASE_URL || ""}${link}`;
          const { linkId } = parseParam<{ linkId: string }>(
            fullLink,
            "/web/lection/:linkId/show_lection"
          );

          const pageResponse = await useCache<AxiosResponse<any, any>>(
            linkId,
            async () => await axios.get(fullLink),
            30
          );

          const html = pageResponse.data;
          const page$ = cheerio.load(html);

          const title = `${linkId}-${page$(".lection_title").text().trim()}`;
          const materialMain = page$(".material_main a");
          const hasVideo = page$("video").length > 0;

          if (onlyWithVideo && !hasVideo) return null;
          if (
            onlyWithImages &&
            !onlyWithVideo &&
            hasVideo &&
            materialMain.length === 0
          )
            return null;

          // Skip if in download mode and item is not selected
          if (mode === "download" && selections) {
            const groupSelection = selections[groupName] as ItemSelection;
            if (!groupSelection?.selected && !groupSelection?.items[title]) {
              return null;
            }
          }

          // Extract real video URL if present
          let videoUrl: string | null = null;

          // Try to capture is_video_id from inline script
          const scriptBlock = html.match(/var\s+is_video_id\s*=\s*"([^"]+)"/);
          if (scriptBlock && scriptBlock[1]) {
            const isVideoId = scriptBlock[1];
            videoUrl = `https://vz-be550dce-c8c.b-cdn.net/${isVideoId}/playlist.m3u8`;
          }

          // fallback: still try <video> or regex
          if (!videoUrl && hasVideo) {
            const directSrc = page$("video").attr("src");
            if (directSrc && !directSrc.startsWith("blob:")) {
              videoUrl = directSrc;
            }

            if (!videoUrl) {
              page$("video source").each((_, el) => {
                const src = page$(el).attr("src");
                if (src && !src.startsWith("blob:")) {
                  videoUrl = src;
                }
              });
            }

            if (!videoUrl) {
              const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8/);
              if (m3u8Match) videoUrl = m3u8Match[0];
            }

            if (!videoUrl) {
              const mp4Match = html.match(/https?:\/\/[^\s"']+\.mp4/);
              if (mp4Match) videoUrl = mp4Match[0];
            }
          }

          let images: any[] = [];
          if (materialMain.length > 0) {
            const imageTasks = Array.from(materialMain).map((element) =>
              imageLimit(async () => {
                const $element = page$(element);
                const relativeImageUrl = $element.attr("href");
                if (!relativeImageUrl) return null;

                const imageUrl = resolveUrl(
                  useRuntimeConfig().public.baseUrl || "",
                  relativeImageUrl
                );
                if (!imageUrl) return null;

                const imageName = path.basename(imageUrl.split("?")[0]);

                try {
                  const headResponse = await useCache<AxiosResponse<any, any>>(
                    imageName,
                    async () => await axios.head(imageUrl),
                    30
                  );
                  const size = parseInt(
                    headResponse.headers["content-length"] || "0",
                    10
                  );

                  if (mode === "preview") {
                    return {
                      success: true,
                      url: imageUrl,
                      name: imageName,
                      size,
                    };
                  }
                } catch (error: any) {
                  console.log(`Error processing image ${imageUrl}:`, error);
                  return {
                    success: false,
                    error: error.message || "Failed to process image",
                  };
                }

                return null;
              })
            );

            images = (await Promise.all(imageTasks)).filter(Boolean);
          }

          return {
            title,
            images,
            hasVideo,
            videoUrl, // now includes is_video_id extraction
            fullLink,
          };
        })
      )
    );

    return {
      success: true,
      data: results.filter(Boolean),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to process group",
    };
  }
});
