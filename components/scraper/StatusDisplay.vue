<script lang="ts" setup>
defineProps<{
    status: {
        stage: string;
        message: string;
        progress?: {
            current: number;
            total: number;
        };
        error?: string;
    }
}>();
</script>

<template>
    <div v-if="status.stage !== 'idle'" 
        class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">
                    Status: {{ status.stage.charAt(0).toUpperCase() + status.stage.slice(1) }}
                </h3>
                <span v-if="status.stage === 'processing'" 
                    class="text-blue-600">
                    {{ status.progress?.current }}/{{ status.progress?.total }} groups
                </span>
            </div>
            <p class="text-gray-600">{{ status.message }}</p>
            
            <!-- Progress bar -->
            <div v-if="status.progress" class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    :style="{ width: `${(status.progress.current / status.progress.total) * 100}%` }">
                </div>
            </div>

            <p v-if="status.error" class="text-red-500">
                {{ status.error }}
            </p>
        </div>
    </div>
</template>
