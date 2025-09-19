<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-5">
    <div class="relative w-full max-w-3xl bg-black rounded-lg overflow-hidden">
      <!-- Close button -->
      <button
        class="absolute top-3 right-3 text-white text-2xl z-50"
        @click="$emit('close')"
      >
        ×
      </button>

      <div data-vjs-player>
        <video ref="videoRef" class="video-js vjs-big-play-centered"></video>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import videojs from "video.js";
import "video.js/dist/video-js.css";

interface Props {
  videoId: string | null;
  isOpen: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(["close"]);

const videoRef = ref<HTMLVideoElement | null>(null);
let player: any = null;

function getProxiedPlaylistUrl(videoId: string): string {
  return `/api/v1/playlist/${videoId}/playlist.m3u8`;
}

function initPlayer(videoId: string) {
  if (!videoRef.value) return;

  if (player) {
    player.dispose();
  }

  player = videojs(videoRef.value, {
    controls: true,
    autoplay: false,
    preload: "auto",
    sources: [
      {
        src: getProxiedPlaylistUrl(videoId),
        type: "application/x-mpegURL",
      },
    ],
    playbackRates: [0.5, 1, 1.5, 2],
  });
}

watchEffect(() => {
  if (props.isOpen && props.videoId) {
    initPlayer(props.videoId);
  } else if (!props.isOpen && player) {
    player.dispose();
    player = null;
  }
});

onBeforeUnmount(() => {
  if (player) {
    player.dispose();
    player = null;
  }
});
</script>

<style>
.video-js {
  width: 100%;
  height: 500px;
}
</style>
