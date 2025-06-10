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
            
            <ContentReader 
    :group-data="groupData"
    :group-name="groupName"
    :status="status"
    :format-size="formatSize"
/>
        </template>
    </div>

</template>
