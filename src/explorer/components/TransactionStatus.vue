<script setup lang="ts">
defineProps<{
    status?: string;
}>();
</script>

<template>
    <div class="flex items-center gap-2">
        <div
            :class="
                (() => {
                    if (!status) return 'pending';
                    if (status === 'Success') return 'success';
                    if (status === 'Failed') return 'failed';
                    return 'default';
                })() + ' status-indicator'
            "
        ></div>
        <span class="text-label">{{ status || "Pending" }}</span>
    </div>
</template> 