<script lang="ts" setup>
interface Props {
    modelValue: boolean;
    title: string;
    onClose?: () => void;
}

const props = defineProps<Props>();
const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'close': [];
}>();

const handleClose = () => {
    emit('update:modelValue', false);
    if (props.onClose) {
        props.onClose();
    }
    emit('close');
};

// Close on escape key
onMounted(() => {
    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && props.modelValue) {
            handleClose();
        }
    };
    document.addEventListener('keydown', handleEscape);
    onUnmounted(() => {
        document.removeEventListener('keydown', handleEscape);
    });
});
</script>

<template>
    <Teleport to="body">

        <div v-if="modelValue" class="fixed inset-0 z-50 overflow-hidden" @click="handleClose">
            <!-- Backdrop with fade -->
            <Transition enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0"
                enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200"
                leave-from-class="opacity-100" leave-to-class="opacity-0">
                <div class="fixed inset-0 bg-black bg-opacity-50"></div>
            </Transition>
            <!-- Modal Container -->
            <Transition enter-active-class="transition duration-500 ease-out" enter-from-class="translate-y-8 opacity-0"
                enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-500 ease-in"
                leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-8 opacity-0">

                <div class="flex min-h-screen items-center justify-center p-4">
                    <div class="relative w-full max-w-2xl bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]"
                        @click.stop>
                        <!-- Sticky Header -->
                        <div
                            class="flex items-center justify-between p-4 border-b bg-white rounded-t-lg sticky top-0 z-10">
                            <h3 class="text-lg font-medium text-gray-900">{{ title }}</h3>
                            <button @click="handleClose"
                                class="text-gray-400 hover:text-gray-500 transition-colors p-2 rounded-lg hover:bg-gray-100"
                                aria-label="Close modal">
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <!-- Scrollable Content -->
                        <div class="flex-1 overflow-y-auto p-4">
                            <div class="space-y-4">
                                <slot></slot>
                            </div>
                        </div>

                        <!-- Sticky Footer -->
                        <div class="sticky bottom-0 border-t bg-white rounded-b-lg p-4 flex justify-end space-x-3">
                            <slot name="footer">
                                <button @click="handleClose"
                                    class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                    Cancel
                                </button>
                            </slot>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    </Teleport>
</template>