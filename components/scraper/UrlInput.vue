<script lang="ts" setup>
interface Props {
    input: string
    mode: 'preview' | 'download'
    isLoading: boolean
    status: {
        stage: string
        message?: string
        error?: string
        progress?: {
            current: number
            total: number
        }
    }
    groups: Record<string, any>
}

const emit = defineEmits<{
    'update:input': [value: string]
    'update:mode': [value: 'preview' | 'download']
    'submit': []
    'cancel': []
    'download': []
}>();

const props = defineProps<Props>();

// Computed
const showCancelButton = computed(() =>
    props.isLoading && props.status.stage !== 'error' && props.status.stage !== 'complete'
);

const showDownloadButton = computed(() =>
    Object.keys(props.groups || {}).length > 0 && !props.isLoading
);
</script>

<template>
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="space-y-4">
            <!-- URL Input Field -->
            <div class="relative">
                <input :value="input" @input="e => emit('update:input', (e.target as HTMLInputElement).value)"
                    placeholder="Enter URL to scrape content" :disabled="isLoading" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                           disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>

            <!-- Action Buttons -->
            <div class="flex space-x-4 items-center">
                <!-- Download Button -->
                <button v-if="showDownloadButton" @click="emit('download')" class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 
           transition-colors duration-200 focus:outline-none focus:ring-2 
           focus:ring-blue-500 focus:ring-offset-2">
                    Select & Download
                </button>

                <!-- Cancel Button -->
                <button v-if="showCancelButton" @click="emit('cancel')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 
                           transition-colors duration-200 focus:outline-none focus:ring-2 
                           focus:ring-red-500 focus:ring-offset-2">
                    Cancel
                </button>

                <!-- Submit Button -->
                <button v-else @click="emit('submit')" :disabled="!input || isLoading" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 
                           transition-colors duration-200 focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 
                           disabled:cursor-not-allowed disabled:hover:bg-green-500">
                    {{ isLoading ? 'Processing...' : 'Go' }}
                </button>
            </div>
        </div>
    </div>
</template>