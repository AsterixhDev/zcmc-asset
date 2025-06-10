import axios, { AxiosResponse } from "axios";
import path from "path";

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
  } = await readBody(event);

  if (!groupName || !links || !Array.isArray(links)) {
    return {
      success: false,
      error: "Group name and links array are required",
    };
  }

  try {
    const results = [];

    for (const link of links) {
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

      const title = page$(".lection_title").text().trim();
      const materialMain = page$(".material_main a");

      // Skip if in download mode and item is not selected
      if (mode === "download" && selections) {
        const groupSelection = selections[groupName] as ItemSelection;
        if (!groupSelection?.selected && !groupSelection?.items[title]) {
          continue;
        }
      }

      if (materialMain.length > 0) {
        const images = [];

        for (const element of materialMain) {
          const $element = page$(element);
          const relativeImageUrl = $element.attr("href");
          if (!relativeImageUrl) continue;

          const imageUrl = resolveUrl(
            useRuntimeConfig().public.baseUrl || "",
            relativeImageUrl
          );
          if (!imageUrl) continue;

          const imageName = path.basename(imageUrl.split("?")[0]);

          try {
            // Get file size for both modes
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
              images.push({
                success: true,
                url: imageUrl,
                name: imageName,
                size,
              });
            }
          } catch (error: any) {
            console.log(`Error processing image ${imageUrl}:`, error);
            images.push({
              success: false,
              error: error.message || "Failed to process image",
            });
          }
        }

        results.push({
          title,
          images,
        });
      }
    }

    return {
      success: true,
      data: results,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to process group",
    };
  }
});
