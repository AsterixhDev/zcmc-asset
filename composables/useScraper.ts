import pLimit from "p-limit";
import { ref, computed } from "vue";
import { downloadContent } from "~/utils/download";
import nov1stsource from "~/assets/static-sources/nov1-session-sources.json";

export interface ScrapingStatus {
  stage:
    | "idle"
    | "fetching"
    | "parsing"
    | "processing"
    | "downloading"
    | "complete"
    | "error";
  message: string;
  progress?: {
    current: number;
    total: number;
    group?: string;
    downloadProgress?: number;
  };
  error?: string;
}

export interface GroupSelection {
  selected: boolean;
  items: Record<string, boolean>;
}

export function useScraper() {
  // Initialize with default values
  const status = ref<ScrapingStatus>({
    stage: "idle",
    message: "Ready to start",
  });

  const longItems = ref<
    {
      title: string;
      images: {
        success: boolean;
        url: string;
        name: string;
        size: number;
      }[];
      hasVideo: boolean;
      videoUrl: string;
      fullLink: string;
    }[]
  >([]);
  const staticSources = [
    {
      name: "zioncenter",
      jsonData: nov1stsource,
      baseUrl: "https://www.zioncenter.co.kr",
      linkPrefix: "/web/lection/",
      linkSuffix: "/show_lection?id=cnEzS2pFN25CeUtoRk1ycUMvbXdjUT09",
      descriptionKr: "시온센터",
      descriptionEn: "Zion Center",
      longInfo: "2024년 11월 1일부터 2025년 8월까지의 성경공부 자료입니다.",
      tags: [
        "시온센터",
        "Zion Center",
        "Bible Study",
        "2024",
        "2025",
        "Nov 1st",
      ],
    },
    ...(longItems.value.length > 0
      ? [
          {
            name: "Long search results",
            jsonData: longItems.value,
            baseUrl: "https://www.zioncenter.co.kr",
            linkPrefix: "/web/lection/",
            linkSuffix: "/show_lection?id=cnEzS2pFN25CeUtoRk1ycUMvbXdjUT09",
            descriptionKr: "추가 검색 결과",
            descriptionEn: "Additional search results",
            longInfo:
              "사용자가 검색한 항목에 대한 추가 자료입니다. 여기에는 선택한 레슨 및 관련 미디어가 포함됩니다.",
            tags: [
              "검색결과",
              "Long Items",
              "Bible Study",
              "Filtered",
              "User Selection",
            ],
          },
        ]
      : []),
  ];

  const groups = ref<Record<string, any>>({});

  const selections = ref<Record<string, GroupSelection>>({});

  // Make computed properties SSR-safe with null checks
  const isLoading = computed(() => {
    if (!status.value) return false;
    return (
      status.value.stage !== "idle" &&
      status.value.stage !== "complete" &&
      status.value.stage !== "error"
    );
  });

  // Use undefined for browser-only features during SSR
  const abortController = ref<AbortController | null>(null);

  // Initialize AbortController only in browser
  if (process.client) {
    abortController.value = null;
  }

  const selectAll = (value: boolean) => {
    if (!groups.value || !selections.value) return;
    Object.entries(groups.value).forEach(([groupName]) => {
      selectGroup(groupName, value);
    });
  };

  const selectGroup = (groupName: string, value: boolean) => {
    if (!selections.value || !groups.value) return;

    if (!selections.value[groupName]) {
      selections.value[groupName] = {
        selected: false,
        items: {},
      };
    }
    selections.value[groupName].selected = value;

    const groupData = groups.value[groupName];
    if (groupData) {
      groupData.forEach((item: any) => {
        selections.value[groupName].items[item.title] = value;
      });
    }
  };

  const selectItem = (groupName: string, itemTitle: string, value: boolean) => {
    if (!selections.value || !groups.value) return;

    if (!selections.value[groupName]) {
      selections.value[groupName] = {
        selected: false,
        items: {},
      };
    }
    selections.value[groupName].items[itemTitle] = value;

    const groupData = groups.value[groupName];
    if (groupData) {
      const allSelected = groupData.every(
        (item: any) => selections.value[groupName].items[item.title]
      );
      selections.value[groupName].selected = allSelected;
    }
  };

  const getSelectedItems = () => {
    const selected: Record<string, string[]> = {};
    Object.entries(selections.value).forEach(([groupName, groupSelection]) => {
      const selectedItems = Object.entries(groupSelection.items)
        .filter(([_, isSelected]) => isSelected)
        .map(([itemTitle]) => itemTitle);

      if (selectedItems.length > 0) {
        selected[groupName] = selectedItems;
      }
    });
    return selected;
  };

  const cancelScraping = () => {
    if (abortController.value) {
      abortController.value.abort();
      status.value = {
        stage: "error",
        message: "Process cancelled by user",
      };
    }
  };

  const scrape = async (
    url: string,
    mode: "preview" | "download" = "preview"
  ) => {
    try {
      abortController.value = new AbortController();
      // Stage 1: Initial fetch
      status.value = {
        stage: "fetching",
        message: "Fetching webpage content...",
      };

      const initialResponse = await $fetch<{
        success: boolean;
        data?: any;
        error?: string;
      }>("/api/v1/fetch", {
        method: "POST",
        body: { url },
        signal: abortController.value.signal,
      });

      if (!initialResponse.success) {
        throw new Error(initialResponse.error);
      }

      // Stage 2: Parse groups
      status.value = {
        stage: "parsing",
        message: "Parsing course groups...",
      };

      const groupsResponse = await $fetch("/api/v1/parse-groups", {
        method: "POST",
        body: { html: initialResponse.data },
        signal: abortController.value.signal,
      });

      if (!groupsResponse.success || !("data" in groupsResponse)) {
        throw new Error("Failed to parse groups");
      }

      // Stage 3: Process each group
      status.value = {
        stage: "processing",
        message: "Processing groups...",
        progress: {
          current: 0,
          total: Object.keys(groupsResponse.data).length,
        },
      };

      // Initialize selections for new groups
      Object.keys(groupsResponse.data).forEach((groupName) => {
        if (!selections.value[groupName]) {
          selections.value[groupName] = {
            selected: false,
            items: {},
          };
        }
      });

      for (const [groupName, links] of Object.entries<string[]>(
        groupsResponse.data
      )) {
        if (abortController.value.signal.aborted) {
          throw new Error("Process cancelled by user");
        }

        status.value = {
          stage: "processing",
          message: `Processing group: ${groupName}`,
          progress: {
            current: status.value.progress?.current ?? 0,
            total: status.value.progress?.total ?? 0,
            group: groupName,
          },
        };
        const groupResult = await $fetch<{
          success: boolean;
          data?: any;
          error?: string;
        }>("/api/v1/process-group", {
          method: "POST",
          body: {
            groupName,
            links,
            mode,
            selections: mode === "download" ? selections.value : undefined,
          },
          signal: abortController.value.signal,
        });

        if (groupResult.success) {
          groups.value[groupName] = groupResult.data;

          // Initialize item selections
          groupResult.data.forEach((item: any) => {
            if (!selections.value[groupName].items[item.title]) {
              selections.value[groupName].items[item.title] = false;
            }
          });
        }

        if (status.value.progress) {
          status.value.progress.current++;
        }
      }

      // Complete
      status.value = {
        stage: "complete",
        message: "All groups processed successfully",
      };

      return {
        success: true,
        data: groups.value,
      };
    } catch (error: any) {
      status.value = {
        stage: "error",
        message: "An error occurred",
        error: error.message,
      };

      return {
        success: false,
        error: error.message,
      };
    } finally {
      abortController.value = null;
    }
  };
  const scrapeLongFind = async () => {
    abortController.value = new AbortController();
    const BATCH_SIZE = 1; // number of links per API call
    const TOTAL = 2337 - 1699; // total links
    const limit = pLimit(10); // how many batch requests in parallel

    try {
      // Build batches of links
      const batches: string[][] = [];
      for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
        const links = Array.from(
          { length: Math.min(BATCH_SIZE, TOTAL - i) },
          (_, j) => {
            const id = i + j + 1690;
            return `https://www.zioncenter.co.kr/web/lection/${id}/show_lection?id=cnEzS2pFN25CeUtoRk1ycUMvbXdjUT09`;
          }
        );
        batches.push(links);
      }

      status.value = {
        stage: "processing",
        message: "Processing batches...",
        progress: { current: 0, total: batches.length },
      };

      let completed = 0;

      const tasks = batches.map((links, batchIdx) =>
        limit(async () => {
          if (abortController.value?.signal.aborted) {
            throw new Error("Process cancelled by user");
          }

          const res = await $fetch<{
            success: boolean;
            data?: any;
            error?: string;
          }>("/api/v1/process-group", {
            method: "POST",
            body: {
              groupName: "groups-batch-" + batchIdx,
              links,
              mode: "preview",
              selections: undefined,
              onlyWithImages: false,
              onlyWithVideo: true,
            },
            signal: abortController.value?.signal,
          });

          if (res?.success) {
            longItems.value.push(...res.data);
          }

          completed++;
          if (status.value.progress) {
            status.value.progress.current = completed;
          }

          return res;
        })
      );

      const results = await Promise.allSettled(tasks);

      status.value = {
        stage: "complete",
        message: "All batches processed successfully",
      };

      return { success: true, data: longItems.value, results };
    } catch (err: any) {
      status.value = {
        stage: "error",
        message: err.message ?? "Unknown error",
      };
      return { success: false, error: err.message };
    } finally {
      abortController.value = null;
    }
  };

  const downloadSelectedContent = async (
    quality: "120p" | "480p" | "320p" = "320p"
  ) => {
    try {
      const selected = getSelectedItems();
      const selectedGroups = Object.keys(selected);

      if (selectedGroups.length === 0) {
        throw new Error("No items selected for download");
      }

      status.value = {
        stage: "downloading",
        message: "Preparing downloads...",
        progress: {
          current: 0,
          total: selectedGroups.length,
        },
      };

      const CHUNK_SIZE = 2; // Number of groups to process simultaneously

      // Process groups in chunks
      for (let i = 0; i < selectedGroups.length; i += CHUNK_SIZE) {
        if (abortController.value?.signal.aborted) {
          throw new Error("Download cancelled by user");
        }

        const groupChunk = selectedGroups.slice(i, i + CHUNK_SIZE);

        // Process chunk of groups in parallel
        await Promise.all(
          groupChunk.map(async (groupName) => {
            const items = selected[groupName];

            // Process each item in the group sequentially
            for (const itemTitle of items) {
              status.value = {
                stage: "downloading",
                message: `Downloading ${groupName} - ${itemTitle}...`,
                progress: {
                  current: status.value.progress?.current ?? 0,
                  total: status.value.progress?.total ?? 0,
                  group: groupName,
                  downloadProgress: 0,
                },
              };

              const item = groups.value[groupName].find(
                (i: any) => i.title === itemTitle
              );
              if (item && item.images) {
                await downloadContent(
                  groupName,
                  itemTitle,
                  item.images,
                  quality,
                  (progress) => {
                    if (status.value.progress) {
                      status.value.progress.downloadProgress = progress;
                    }
                  }
                );
              }
            }

            if (status.value.progress) {
              status.value.progress.current++;
            }
          })
        );
      }

      status.value = {
        stage: "complete",
        message: "All downloads completed successfully",
      };
    } catch (error: any) {
      status.value = {
        stage: "error",
        message: "Download failed",
        error: error.message,
      };
      throw error;
    }
  };

  const reset = () => {
    status.value = {
      stage: "idle",
      message: "Ready to start",
    };
    groups.value = {};
    selections.value = {};
    if (process.client && abortController.value) {
      abortController.value.abort();
      abortController.value = null;
    }
  };

  return {
    status,
    groups,
    selections,
    isLoading,
    scrape,
    reset,
    cancelScraping,
    selectAll,
    selectGroup,
    selectItem,
    getSelectedItems,
    downloadSelectedContent,
    scrapeLongFind,
    longItems,
    staticSources,
  };
}
