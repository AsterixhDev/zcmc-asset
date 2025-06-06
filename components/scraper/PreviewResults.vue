<script lang="ts" setup>
defineProps<{
    groups: Record<string, any>
    status: any
    formatSize: (bytes: number) => string
}>();
</script>

<template>
    <div class="space-y-6">
        <template v-for="(groupData, groupName) in groups" :key="groupName">
            <div @click="()=>console.log(item)" v-for="item in groupData" :key="item.title" 
                class="bg-white rounded-lg shadow-md p-6"
                :class="{ 'animate-fade-in': status.stage === 'processing' }">
                <h2 class="text-xl font-semibold mb-4">{{ groupName }} - {{ item.title }}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div v-for="image in item.images" :key="image.url" class="space-y-2">
                        <img 
                            v-if="image.success" 
                            :src="image.url" 
                            :alt="image.name"
                            class="w-full h-48 object-cover rounded-lg"
                        />
                        <div v-if="image.success" class="text-sm text-gray-600">
                            {{ image.name }}
                            <span v-if="image.size" class="ml-2">({{ formatSize(image.size) }})</span>
                        </div>
                        <div v-if="!image.success" class="text-red-500">
                            {{ image.error }}
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
