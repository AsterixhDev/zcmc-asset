<script lang="ts" setup>
interface Props {
  src: string;
  alt: string;
  quality?: '120p' | '320p' | '480p';
  format?: 'jpeg' | 'png';
  width?: number;
  height?: number;
  lazy?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  quality: '320p',
  format: 'jpeg',
  lazy: true,
  class: ''
});

// Convert quality to numeric value for the API
const qualityValue = computed(() => {
  switch (props.quality) {
    case '120p': return 32;
    case '320p': return 75;
    case '480p': return 100;
    default: return 75;
  }
});

// State for image loading and error handling
const isLoading = ref(true);
const hasError = ref(false);
const imageRef = ref<HTMLImageElement | null>(null);

// Optimized image URL
const optimizedSrc = computed(() => {
  if (!props.src) return '';
  
  const params = new URLSearchParams({
    imageUrl: encodeURIComponent(props.src),
    quality: qualityValue.value.toString(),
    format: props.format
  });
  
//   return `/api/v1/proxy-image?${params.toString()}`;
return props.src
});

// Load handling
const handleLoad = () => {
  isLoading.value = false;
  hasError.value = false;
};

const handleError = () => {
  isLoading.value = false;
  hasError.value = true;
};

// Intersection Observer for lazy loading
onMounted(() => {
  if (!props.lazy || !imageRef.value) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && imageRef.value) {
          imageRef.value.src = optimizedSrc.value;
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '50px'
    }
  );

  observer.observe(imageRef.value);

  onBeforeUnmount(() => {
    observer.disconnect();
  });
});
</script>

<template>
  <div class="relative" :class="props.class">
    <!-- Loading Skeleton -->
    <div 
      v-if="isLoading" 
      class="absolute inset-0 bg-gray-200 animate-pulse rounded"
      :style="{ 
        paddingBottom: height ? `${height}px` : '100%',
        width: width ? `${width}px` : '100%'
      }"
    />

    <!-- Error State -->
    <div 
      v-if="hasError" 
      class="absolute inset-0 bg-red-50 flex items-center justify-center rounded"
      :style="{ 
        paddingBottom: height ? `${height}px` : '100%',
        width: width ? `${width}px` : '100%'
      }"
    >
      <span class="text-red-500 text-sm">Failed to load image</span>
    </div>

    <!-- Image -->
    <img
      ref="imageRef"
      :src="lazy ? '' : optimizedSrc"
      :data-src="optimizedSrc"
      :alt="alt"
      :width="width"
      :height="height"
      @load="handleLoad"
      @error="handleError"
      class="w-full h-full object-contain rounded transition-opacity duration-300"
      :class="{
        'opacity-0': isLoading || hasError,
        'opacity-100': !isLoading && !hasError
      }"
    />
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>