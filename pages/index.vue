<script lang="ts" setup>
const input = ref("");
const mode = ref<'preview' | 'download'>('preview');
const showSelectionModal = ref(false);
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
const downloadQuality = ref<"120p" | "320p" | "480p">("320p");


const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const handleSubmit = async () => {
    reset();
    await scrape(input.value, mode.value);
};

const handleCancel = () => {
    cancelScraping();
};

const handleDownloadSelected = async () => {
    try {
        await downloadSelectedContent(downloadQuality.value);
    } catch (error) {
        console.error('Download failed:', error);
    }
};

watch(() => mode.value, (newMode) => {
    if (newMode === 'download') {
        showSelectionModal.value = true;
    }
});
</script>

<template>
    <div class="min-h-screen bg-gray-100 p-8">
        <div class="max-w-4xl mx-auto">
            <ScraperUrlInput v-model:input="input" v-model:mode="mode" :is-loading="isLoading" :status="status"
                :groups="groups" @submit="handleSubmit" @cancel="handleCancel" />

            <ScraperStatusDisplay :status="status" />

            <!-- Preview Results (always visible when available) -->
            <ScraperPreviewResults v-if="Object.keys(groups).length > 0" :groups="groups" :status="status"
                :format-size="formatSize" />
            <!-- Download Results -->
            <ScraperDownloadResults v-if="mode === 'download' && status.stage === 'complete'" :groups="groups"
                :selections="selections" :status="status" :on-download="downloadSelectedContent" />

            <!-- Selection Modal -->
            <CommonModal :model-value="mode === 'download' && showSelectionModal" title="Select Items to Download">
                <ScraperGroupSelector :groups="groups" :selections="selections" :status="status" @select-all="selectAll"
                    @select-group="selectGroup" @select-item="selectItem" />
                <template #footer>

                    <button @click="mode = 'preview'; showSelectionModal = false"
                        class="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button @click="handleDownloadSelected"
                        class="ml-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        :disabled="selections && Object.values(selections).every(group => !group.selected && group.items && Object.values(group.items).every(selected => !selected))">
                        Proceed with Download
                    </button>
                    <div class="quality-selector mt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Download Quality
                        </label>
                        <select v-model="downloadQuality"
                            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                            <option value="120p">Low Quality (120p)</option>
                            <option value="320p">Medium Quality (320p)</option>
                            <option value="480p">High Quality (480p)</option>
                        </select>
                    </div>
                </template>
            </CommonModal>
        </div>
    </div>
</template>
