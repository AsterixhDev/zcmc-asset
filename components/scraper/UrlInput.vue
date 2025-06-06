<script lang="ts" setup>
const emit = defineEmits<{
    'update:input': [value: string]
    'update:mode': [value: 'preview' | 'download']
    'submit': []
    'cancel': []
}>();

const props = defineProps<{
    input: string
    mode: 'preview' | 'download'
    isLoading: boolean
    status: any,
    groups: Record<string, any>
}>();

</script>

<template>
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="space-y-4">
            <input :value="input" @input="e => emit('update:input', (e.target as HTMLInputElement).value)"
                placeholder="Enter URL"
                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div class="flex space-x-4"> <button v-if="Object.keys(groups).length > 0"
                    @click="emit('update:mode', 'download')"
                    class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600">
                    Select & Download
                </button><button v-if="isLoading && status.stage !== 'error' && status.stage !== 'complete'" @click="emit('cancel')"
                    class="px-4 py-2 bg-red-500 text-white rounded-lg">
                    Cancel
                </button>
                <button v-else @click="emit('submit')" :disabled="!input"
                    class="px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50">
                    Go
                </button>
            </div>
        </div>
    </div>
</template>
