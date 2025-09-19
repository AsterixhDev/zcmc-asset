import axios, { AxiosResponse } from "axios";
import path from "path";
import pLimit from "p-limit";

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
  } = await readBody(event) as {
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
  const pageLimit = pLimit(10); // 5 pages at once
  const imageLimit = pLimit(30); // 10 image HEADs at once

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

          const page$ = cheerio.load(pageResponse.data);
          const title = `${linkId}-${page$(".lection_title").text().trim()}`;
          const materialMain = page$(".material_main a");
          const hasVideo = page$(".video-js").length > 0;
          console.log(onlyWithVideo,onlyWithImages)
          if (onlyWithVideo && !hasVideo) return null;
          if (
            onlyWithImages &&
            !onlyWithVideo&&
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
            fullLink,
          };
        })
      )
    );

    return {
      success: true,
      data: results.filter(Boolean), // remove nulls
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to process group",
    };
  }
});
