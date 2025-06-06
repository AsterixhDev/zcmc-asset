<script lang="ts" setup>
import type { GroupSelection } from '~/composables/useScraper';

const props =  defineProps<{
    groups: Record<string, any>;
    selections: Record<string, GroupSelection>;
    status: any;
}>();

const emit = defineEmits<{
    'select-all': [value: boolean];
    'select-group': [groupName: string, value: boolean];
    'select-item': [groupName: string, itemTitle: string, value: boolean];
}>();

const allSelected = computed(() => {
    if (Object.keys(props.groups).length === 0) return false;
    return Object.values(props.selections).every(group => group.selected);
});

const someSelected = computed(() => {
    return Object.values(props.selections).some(group => group.selected);
});

const groupHasSelection = (groupName: string) => {
    const groupSelection = props.selections[groupName];
    if (!groupSelection) return false;
    return Object.values(groupSelection.items).some(selected => selected);
};
</script>

<template>
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="space-y-4">
            <!-- Global Selection -->
            <div class="flex items-center space-x-2 pb-4 border-b">
                <input
                    type="checkbox"
                    :checked="allSelected"
                    :indeterminate="!allSelected && someSelected"
                    @change="e => emit('select-all', (e.target as HTMLInputElement).checked)"
                    class="w-4 h-4 text-blue-600"
                />
                <label class="text-lg font-semibold">Select All Groups</label>
            </div>

            <!-- Groups -->
            <div class="space-y-6">
                <div v-for="(groupData, groupName) in groups" :key="groupName"
                    class="border rounded-lg p-4">
                    <div class="flex items-center space-x-2 pb-2 border-b">
                        <input
                            type="checkbox"
                            :checked="selections[groupName]?.selected"
                            :indeterminate="!selections[groupName]?.selected && groupHasSelection(groupName)"
                            @change="e => emit('select-group', groupName, (e.target as HTMLInputElement).checked)"
                            class="w-4 h-4 text-blue-600"
                        />
                        <label class="font-semibold">{{ groupName }}</label>
                    </div>

                    <!-- Items in group -->
                    <div class="mt-2 space-y-2 pl-6">
                        <div v-for="item in groupData" :key="item.title"
                            class="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                :checked="selections[groupName]?.items[item.title]"
                                @change="e => emit('select-item', groupName, item.title, (e.target as HTMLInputElement).checked)"
                                class="w-4 h-4 text-blue-600"
                            />
                            <label class="text-sm">{{ item.title }}</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
