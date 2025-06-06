import { ref, computed } from 'vue'
import { downloadContent } from '~/utils/download'

export interface ScrapingStatus {
    stage: 'idle' | 'fetching' | 'parsing' | 'processing' | 'downloading' | 'complete' | 'error'
    message: string
    progress?: {
        current: number
        total: number
        group?: string
        downloadProgress?: number
    }
    error?: string
}

export interface GroupSelection {
    selected: boolean;
    items: Record<string, boolean>;
}

export function useScraper() {
    // Initialize with default values
    const status = ref<ScrapingStatus>({
        stage: 'idle',
        message: 'Ready to start'
    })

    const groups = ref<Record<string, any>>({})
    const selections = ref<Record<string, GroupSelection>>({})
    
    // Make computed properties SSR-safe with null checks
    const isLoading = computed(() => {
        if (!status.value) return false;
        return status.value.stage !== 'idle' && status.value.stage !== 'complete';
    })

    // Use undefined for browser-only features during SSR
    const abortController = ref<AbortController | null>(null)

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
                items: {}
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
                items: {}
            };
        }
        selections.value[groupName].items[itemTitle] = value;
        
        const groupData = groups.value[groupName];
        if (groupData) {
            const allSelected = groupData.every((item: any) => 
                selections.value[groupName].items[item.title]
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
                stage: 'error',
                message: 'Process cancelled by user'
            };
        }
    };

    const scrape = async (url: string, mode: 'preview' | 'download' = 'preview') => {
        try {
            abortController.value = new AbortController();
            // Stage 1: Initial fetch
            status.value = {
                stage: 'fetching',
                message: 'Fetching webpage content...'
            }

            const initialResponse = await $fetch<{ success: boolean; data?: any; error?: string }>('/api/v1/fetch', {
                method: 'POST',
                body: { url },
                signal: abortController.value.signal
            })

            if (!initialResponse.success) {
                throw new Error(initialResponse.error)
            }

            // Stage 2: Parse groups
            status.value = {
                stage: 'parsing',
                message: 'Parsing course groups...'
            }

            const groupsResponse = await $fetch('/api/v1/parse-groups', {
                method: 'POST',
                body: { html: initialResponse.data },
                signal: abortController.value.signal
            })

            if (!groupsResponse.success || !('data' in groupsResponse)) {
                throw new Error("Failed to parse groups")
            }

            // Stage 3: Process each group
            status.value = {
                stage: 'processing',
                message: 'Processing groups...',
                progress: {
                    current: 0,
                    total: Object.keys(groupsResponse.data).length
                }
            }

            // Initialize selections for new groups
            Object.keys(groupsResponse.data).forEach(groupName => {
                if (!selections.value[groupName]) {
                    selections.value[groupName] = {
                        selected: false,
                        items: {}
                    };
                }
            });

            for (const [groupName, links] of Object.entries<string[]>(groupsResponse.data)) {
                if (abortController.value.signal.aborted) {
                    throw new Error('Process cancelled by user');
                }

                status.value = {
                    stage: 'processing',
                    message: `Processing group: ${groupName}`,
                    progress: {
                        current: status.value.progress?.current ?? 0,
                        total: status.value.progress?.total ?? 0,
                        group: groupName
                    }
                }                
                const groupResult = await $fetch<{ success: boolean; data?: any; error?: string }>('/api/v1/process-group', {
                    method: 'POST',
                    body: {
                        groupName,
                        links,
                        mode,
                        selections: mode === 'download' ? selections.value : undefined
                    },
                    signal: abortController.value.signal
                })

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
                    status.value.progress.current++
                }
            }

            // Complete
            status.value = {
                stage: 'complete',
                message: 'All groups processed successfully'
            }

            return {
                success: true,
                data: groups.value
            }

        } catch (error: any) {
            status.value = {
                stage: 'error',
                message: 'An error occurred',
                error: error.message
            }
            
            return {
                success: false,
                error: error.message
            }
        } finally {
            abortController.value = null;
        }
    }

    const downloadSelectedContent = async (quality: "120p" | "480p" | "320p" = "320p") => {
        try {
            const selected = getSelectedItems();
            const selectedGroups = Object.keys(selected);
            
            if (selectedGroups.length === 0) {
                throw new Error('No items selected for download');
            }

            status.value = {
                stage: 'downloading',
                message: 'Preparing downloads...',
                progress: {
                    current: 0,
                    total: selectedGroups.length,
                }
            };

            for (const groupName of selectedGroups) {
                if (abortController.value?.signal.aborted) {
                    throw new Error('Download cancelled by user');
                }

                const items = selected[groupName];
                for (const itemTitle of items) {
                    status.value = {
                        stage: 'downloading',
                        message: `Downloading ${groupName} - ${itemTitle}...`,
                        progress: {
                            current: status.value.progress?.current ?? 0,
                            total: status.value.progress?.total ?? 0,
                            group: groupName,
                            downloadProgress: 0
                        }
                    };                    const item = groups.value[groupName].find((i: any) => i.title === itemTitle);
                    if (item && item.images) {
                        const imageUrls = item.images.map((img: any) => img.url);
                        await downloadContent(
                            groupName,
                            itemTitle,
                            imageUrls,
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
            }

            status.value = {
                stage: 'complete',
                message: 'All downloads completed successfully'
            };

        } catch (error: any) {
            status.value = {
                stage: 'error',
                message: 'Download failed',
                error: error.message
            };
            throw error;
        }
    };

    const reset = () => {
        status.value = {
            stage: 'idle',
            message: 'Ready to start'
        }
        groups.value = {}
        selections.value = {}
        if (process.client && abortController.value) {
            abortController.value.abort();
            abortController.value = null;
        }
    }

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
        downloadSelectedContent
    }
}
