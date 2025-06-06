<script lang="ts" setup>
import { ref, computed } from 'vue';
import type { GroupSelection, ScrapingStatus } from '~/composables/useScraper';

const props = defineProps<{
    groups: Record<string, any>;
    selections: Record<string, GroupSelection>;
    status: ScrapingStatus;
    onDownload: (quality: "120p" | "320p" | "480p") => Promise<void>;
}>();

const downloadQuality = ref<"120p" | "320p" | "480p">("320p");

const downloading = computed(() => props.status.stage === 'downloading');
const progress = computed(() => props.status.progress?.downloadProgress ?? 0);
const currentItem = computed(() => {
    if (props.status.stage === 'downloading') {
        return {
            group: props.status.progress?.group,
            progress: props.status.progress?.downloadProgress ?? 0,
            current: props.status.progress?.current ?? 0,
            total: props.status.progress?.total ?? 0
        };
    }
    return null;
});

const isItemSelected = (groupName: string, itemTitle: string) => {
    return props.selections[groupName]?.items[itemTitle] || false;
};

const handleDownload = async () => {
    try {
        await props.onDownload(downloadQuality.value);
    } catch (error) {
        console.error('Download failed:', error);
    }
};
</script>

<template>
    <div class="bg-white rounded-lg shadow-md p-6">
        <div class="quality-selector mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Download Quality
            </label>
            <select 
                v-model="downloadQuality"
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
                <option value="120p">Low Quality (120p)</option>
                <option value="320p">Medium Quality (320p)</option>
                <option value="480p">High Quality (480p)</option>
            </select>
        </div>

        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold">Selected Items</h2>
                <button
                    @click="handleDownload"
                    :disabled="downloading"
                    class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {{ downloading ? 'Downloading...' : 'Download All Selected' }}
                </button>
            </div>

            <div v-if="downloading && currentItem" class="mb-4">
                <p class="text-sm text-gray-600 mb-2">
                    Downloading group {{ currentItem.group }} ({{ currentItem.current }}/{{ currentItem.total }})
                </p>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div 
                        class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        :style="{ width: `${currentItem.progress}%` }"
                    ></div>
                </div>
                <p class="text-sm text-gray-600">
                    Current progress: {{ currentItem.progress }}%
                </p>
            </div>

            <div class="mt-4">
                <div class="space-y-4">
                    <template v-for="(groupData, groupName) in groups" :key="groupName">
                        <template v-if="selections[groupName]?.selected || Object.values(selections[groupName]?.items || {}).some(v => v)">
                            <div class="border-b pb-4">
                                <h3 class="font-semibold mb-3">{{ groupName }}</h3>
                                <div v-for="item in groupData" :key="item.title">
                                    <template v-if="isItemSelected(groupName, item.title)">
                                        <h4 class="font-medium">{{ item.title }}</h4>
                                        <ul class="mt-2 space-y-1">
                                            <li v-for="image in item.images" :key="image.path" 
                                                class="text-sm text-gray-600">
                                                {{ image.path }}
                                            </li>
                                        </ul>
                                    </template>
                                </div>
                            </div>
                        </template>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>
