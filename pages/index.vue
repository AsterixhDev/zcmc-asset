<script lang="ts" setup>
// Constants
const QUALITY_OPTIONS = [
  { value: '120p', label: 'Low Quality (120p)' },
  { value: '320p', label: 'Medium Quality (320p)' },
  { value: '480p', label: 'High Quality (480p)' },
] as const;

// Reactive state
const input = ref("");
const mode = ref<'preview' | 'download'>('preview');
const showSelectionModal = ref(false);
const downloadQuality = ref<typeof QUALITY_OPTIONS[number]['value']>("320p");

// Composable
const {
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
    downloadSelectedContent
} = useScraper();

// Computed
const hasGroups = computed(() => Object.keys(groups.value || {}).length > 0);
const canDownload = computed(() => {
    if (!selections.value) return false;
    return Object.values(selections.value).some(group => 
        group.selected || Object.values(group.items || {}).some(selected => selected)
    );
});

const showDownloadResults = computed(() => 
    mode.value === 'download' && status.value?.stage === 'complete'
);

// Methods
const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'] as const;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const handleSubmit = async () => {
    try {
        reset();
        await scrape(input.value, mode.value);
    } catch (error) {
        console.error('Scraping failed:', error);
    }
};

const handleCancel = () => {
    cancelScraping();
    showSelectionModal.value = false;
};

const handleDownloadSelected = async () => {
    try {
        await downloadSelectedContent(downloadQuality.value);
        showSelectionModal.value = false;
    } catch (error) {
        console.error('Download failed:', error);
    }
};

const closeModal = () => {
    showSelectionModal.value = false;
};

// Watchers
// watch(() => mode.value, (newMode) => {
//     if (newMode === 'download' && hasGroups.value) {
//         showSelectionModal.value = true;
//     }
// });
// Update handleDownloadButton method

</script>

<template>
    <div class="min-h-screen bg-gray-100 p-8">
        <div class="max-w-4xl mx-auto space-y-6">
            <!-- URL Input -->
            <ScraperUrlInput 
                v-model:input="input" 
                v-model:mode="mode" 
                :is-loading="isLoading" 
                :status="status"
                :groups="groups" 
                @submit="handleSubmit" 
                @cancel="handleCancel"
                    @download="showSelectionModal = true"

            />

            <!-- Status Display -->
            <ScraperStatusDisplay :status="status" />

            <!-- Preview Results -->
            <ScraperPreviewResults 
                v-if="hasGroups" 
                :groups="groups" 
                :status="status"
                :format-size="formatSize" 
            />

            <!-- Download Results -->
            <ScraperDownloadResults 
                v-if="showDownloadResults" 
                :groups="groups"
                :selections="selections" 
                :status="status" 
                :on-download="downloadSelectedContent" 
            />

            <!-- Selection Modal -->
            <CommonModal 
                :model-value="showSelectionModal" 
                title="Select Items to Download" 
                @close="closeModal"
            >
                <ScraperGroupSelector 
                    :groups="groups" 
                    :selections="selections" 
                    :status="status" 
                    @select-all="selectAll"
                    @select-group="selectGroup" 
                    @select-item="selectItem" 
                />
                
                <template #footer>
                    <div class="space-y-4">
                        <!-- Quality Selector -->
                        <div class="quality-selector">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Download Quality
                            </label>
                            <select 
                                v-model="downloadQuality"
                                class="form-select w-full"
                            >
                                <option 
                                    v-for="option in QUALITY_OPTIONS" 
                                    :key="option.value"
                                    :value="option.value"
                                >
                                    {{ option.label }}
                                </option>
                            </select>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex justify-end space-x-3">
                            <button 
                                @click="closeModal"
                                class="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                @click="handleDownloadSelected"
                                class="btn-primary"
                                :disabled="!canDownload"
                            >
                                Proceed with Download
                            </button>
                        </div>
                    </div>
                </template>
            </CommonModal>
        </div>
    </div>
</template>

<style scoped>
.btn-primary {
    @apply ml-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white 
           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
    @apply rounded-md border px-4 py-2 text-sm font-medium text-gray-700 
           hover:bg-gray-50;
}

.form-select {
    @apply mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 
           rounded-md focus:outline-none focus:ring-indigo-500 
           focus:border-indigo-500 sm:text-sm;
}
</style>