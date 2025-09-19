<template>
    <div v-for="source in staticSources" :key="source.name"
        class="bg-white rounded shadow transition-all overflow-x-hidden relative isolate" :style="{
            maxHeight: '90dvh',
        }">
        <!-- Accordion Header -->
        <div class="flex justify-between items-center sticky top-0 z-30 bg-white p-4 cursor-pointer border-b" @click="toggle(source.name)">
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

                <div class="space-y-2">
                    <ContentReader :group-data="source.jsonData" :group-name="source.name" :status="status"
                        :format-size="formatSize" />
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{
    staticSources: Array<{ name: string; longInfo: string; jsonData: any }>;
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
