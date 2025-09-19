<template>
    <div v-for="source in staticSources" :key="source.name"
        class="bg-white rounded shadow transition-all overflow-x-hidden relative isolate" :style="{
            maxHeight: '90dvh',
        }">
        <!-- Accordion Header -->
        <div class="flex justify-between items-center sticky top-0 z-30 bg-white p-4 cursor-pointer border-b"
            @click="toggle(source.name)">
            <h3 class="text-base font-medium text-gray-800">
                {{ source.name }}
            </h3>
            <span class="text-sm text-gray-500">
                {{ isOpen(source.name) ? '−' : '+' }}
            </span>
        </div>

        <!-- Accordion Body -->
        <transition name="accordion">
            <div v-show="isOpen(source.name)" class="p-4">
                <p class="text-sm text-gray-600 mb-4">
                    {{ source.longInfo }}
                </p>
                <ul class="space-y-4">
                    <li v-for="(item, index) in source.jsonData" :key="index" class="border rounded p-4">
                        <!-- Title -->
                        <h3 class="text-md font-bold mb-2">{{ item.title }}</h3>

                        <!-- Images (accordion style) -->
                        <details class="mb-2">
                            <summary class="cursor-pointer text-blue-600">Show Images</summary>
                            <div class="mt-2 flex flex-wrap gap-2">
                                <img v-for="(img, imgIndex) in item.images" :key="imgIndex" :src="img.url"
                                    :alt="img.name" class="rounded shadow"
                                    style="min-width: 120px; max-width: 200px;" />
                            </div>
                        </details>

                        <!-- Actions -->
                        <div class="flex items-center gap-4 mt-3">
                            <a :href="item.fullLink" target="_blank" rel="noopener noreferrer"
                                class="text-sm text-blue-500 underline">
                                Open Full Lesson
                            </a>

                            <button v-if="item.hasVideo && item.videoUrl" @click="openVideo(item.videoUrl)"
                                class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                Watch Video
                            </button>
                        </div>
                    </li>
                </ul>

                <client-only>
                    <!-- Video Modal -->
                    <VideoPlayer :isOpen="!!selectedVideoId" :videoId="selectedVideoId" @close="closeVideoModal" />

                </client-only>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{
    staticSources: Array<{
        name: string; longInfo: string; jsonData: {
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
    }>;
    status: any;
    formatSize: (size: number) => string;
}>();

const openPanels = ref<Set<string>>(new Set());

function toggle(name: string) {
    if (openPanels.value.has(name)) {
        openPanels.value.delete(name);
    } else {
        openPanels.value.add(name);
    }
}

function isOpen(name: string) {
    return openPanels.value.has(name);
}
const selectedVideoId = ref<string | null>(null);
const openVideo = (videoUrl: string) => {
    const urlObj = new URL(videoUrl);
    const parts = urlObj.pathname.split("/").filter(Boolean);
    selectedVideoId.value = parts[0];
    console.log(selectedVideoId.value)
};
const closeVideoModal = () => {
    selectedVideoId.value = null;
};
</script>

<style scoped>
.accordion-enter-active,
.accordion-leave-active {
    transition: all 0.3s ease;
    max-height: 500px;
}

.accordion-enter-from,
.accordion-leave-to {
    max-height: 0;
    opacity: 0;
}
</style>
