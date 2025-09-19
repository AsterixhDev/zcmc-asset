<script lang="ts" setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps<{
    groupData: {
        title: string;
        images: {
            success: boolean;
            url: string;
            name: string;
            size: number;
        }[];
        hasVideo: boolean;
        fullLink: string;
    }[]
    groupName: string
    status: any
    formatSize: (bytes: number) => string
}>();

// State
const showGallery = ref(false)
const activeItem = ref<any>(null)
const activeImageIndex = ref(0)

// Computed
const currentImages = computed(() => {
    if (!activeItem.value) return [];
    return activeItem.value.images.filter((img: any) => img.success);
});

// Methods
const openGallery = (item: any) => {
    activeItem.value = item;
    activeImageIndex.value = 0;
    showGallery.value = true;
};

const nextImage = () => {
    activeImageIndex.value = (activeImageIndex.value + 1) % currentImages.value.length;
};

const previousImage = () => {
    activeImageIndex.value = activeImageIndex.value === 0
        ? currentImages.value.length - 1
        : activeImageIndex.value - 1;
};

// Keyboard navigation
onMounted(() => {
    const handleKeydown = (e: KeyboardEvent) => {
        if (!showGallery.value) return;
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') previousImage();
        if (e.key === 'Escape') showGallery.value = false;
    };

    window.addEventListener('keydown', handleKeydown);
    onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
});
</script>

<template>
    <div class="space-y-6">
        <!-- Group Items -->
        <div v-for="item in groupData" :key="item.title" @click="openGallery(item)"
            class="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
            :class="{ 'animate-fade-in': status.stage === 'processing' }">

            <a :href="item.fullLink" target="_blank" rel="noopener noreferrer" class="block mb-4">
                <h2 class="text-xl font-semibold mb-4">{{ groupName }} - {{ item.title }}</h2>
            </a>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="image in item.images" :key="image.url" class="space-y-2 flex flex-col items-center">

                    <ImageComponent v-if="image.success" :src="image.url" :alt="image.name"
                        class="w-full h-48 object-cover rounded-lg" quality="320p" format="png" :width="300"
                        :height="200" lazy />
                    <div v-if="image.success" class="text-sm text-gray-600">
                        {{ image.name }}
                        <span v-if="image.size" class="ml-2">({{ formatSize(image.size) }})</span>
                    </div>
                    <div v-if="!image.success" class="text-red-500">
                        Failed to load image
                    </div>
                </div>
            </div>
        </div>

        <!-- Gallery Modal -->
        <Teleport to="body">
            <Transition enter-active-class="transition-opacity duration-300"
                leave-active-class="transition-opacity duration-300" enter-from-class="opacity-0"
                leave-to-class="opacity-0">
                <div v-if="showGallery"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
                    @click="showGallery = false">
                    <div class="relative w-full h-full flex flex-col items-center justify-center p-4" @click.stop>
                        <!-- Main Image -->
                        <div class="relative w-full max-w-6xl aspect-[16/9] flex items-center justify-center">
                            <transition enter-active-class="transition-opacity duration-300"
                                leave-active-class="transition-opacity duration-300" enter-from-class="opacity-0"
                                leave-to-class="opacity-0">

                                <ImageComponent :key="activeImageIndex" :src="currentImages[activeImageIndex]?.url"
                                    :alt="currentImages[activeImageIndex]?.name" class="w-[90%] h-[90%] object-contain"
                                    quality="480p" format="png" :width="300" :height="200" lazy />
                            </transition>

                            <!-- Navigation Arrows -->
                            <button v-if="currentImages.length > 1" @click.stop="previousImage" class="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 
                                       hover:bg-opacity-75 text-white p-2 rounded-full transition-all duration-200">
                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button v-if="currentImages.length > 1" @click.stop="nextImage" class="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 
                                       hover:bg-opacity-75 text-white p-2 rounded-full transition-all duration-200">
                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        <!-- Image Info -->
                        <div class="mt-4 text-white text-center">
                            <h3 class="text-xl font-medium">{{ activeItem?.title }}</h3>
                            <p class="text-sm opacity-80">
                                {{ currentImages[activeImageIndex]?.name }}
                                <span v-if="currentImages[activeImageIndex]?.size" class="ml-2">
                                    ({{ formatSize(currentImages[activeImageIndex]?.size) }})
                                </span>
                            </p>
                        </div>

                        <!-- Close Button -->
                        <button @click.stop="showGallery = false" class="absolute top-4 right-4 text-white bg-black bg-opacity-50 
                                   hover:bg-opacity-75 p-2 rounded-full transition-all duration-200">
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>