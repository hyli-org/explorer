<script setup lang="ts">
import Header from "@/explorer/Header.vue";
import { ref } from "vue";

interface Tab {
    name: string;
}

const props = defineProps<{
    title: string;
    tabs?: Tab[];
}>();

const emit = defineEmits<{
    (e: "update:activeTab", tab: string): void;
}>();

const activeTab = ref(props.tabs?.[0]?.name || "Overview");

function setActiveTab(tab: string) {
    activeTab.value = tab;
    emit("update:activeTab", tab);
}
</script>

<template>
    <div class="min-h-screen bg-background">
        <Header />
        <main class="container mx-auto px-4 py-6">
            <div class="mb-6">
                <h1 class="text-2xl font-display text-secondary mb-4">{{ title }}</h1>
                <div v-if="tabs" class="tab-container">
                    <button
                        v-for="tab in tabs"
                        :key="tab.name"
                        @click="setActiveTab(tab.name)"
                        :class="['tab-button', { active: activeTab === tab.name }]"
                    >
                        {{ tab.name }}
                    </button>
                </div>
            </div>
            <slot :active-tab="activeTab" />
        </main>
    </div>
</template>

<style>
/* Common styles - note this is unscoped to allow inheritance */
.info-row {
    @apply flex py-4 min-h-[4.5rem] items-center;
}

.info-label {
    @apply text-sm w-[200px];
}

.data-card {
    @apply bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6;
}

.code-block {
    @apply bg-secondary/5 p-4 rounded-xl font-mono text-neutral overflow-x-auto whitespace-pre-wrap break-all;
    max-height: 600px;
    font-size: 0.875rem;
    line-height: 1.5rem;
    tab-size: 2;
    -moz-tab-size: 2;
}

.tab-button {
    @apply px-6 py-2 text-sm font-medium transition-colors rounded-xl;
}

.tab-button.active {
    @apply bg-primary/10 text-primary border border-primary/20;
}

.tab-button:not(.active) {
    @apply bg-white/80 backdrop-blur-sm border border-white/20 text-secondary hover:bg-secondary/5;
}

.tab-container {
    @apply flex gap-2 mb-6;
}

/* Text styles */
.text-mono {
    @apply font-mono text-sm text-secondary;
}

.text-link {
    @apply text-primary hover:text-primary/80 font-medium;
}

.text-label {
    @apply text-secondary font-medium;
    word-break: break-all;
}

/* Status indicator */
.status-indicator {
    @apply w-2 h-2 rounded-full;
}

.status-indicator.pending {
    @apply bg-yellow-500;
}

.status-indicator.success {
    @apply bg-green-500;
}

.status-indicator.failed {
    @apply bg-red-500;
}

.status-indicator.default {
    @apply bg-gray-500;
}

/* Card header */
.card-header {
    @apply text-lg font-medium text-secondary mb-4;
}
</style>
