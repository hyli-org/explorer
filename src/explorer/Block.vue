<script setup lang="ts">
import ExplorerLayout from "@/explorer/components/ExplorerLayout.vue";
import CopyButton from "@/components/CopyButton.vue";
import { blockStore, transactionStore } from "@/state/data";
import { getTimeAgo } from "@/state/utils";
import { computed, ref, watch, watchEffect } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const hashParam = computed(() => (typeof route.params.block_hash === "string" ? (route.params.block_hash as string) : null));
const heightParam = computed(() => {
    if (typeof route.params.block_height === "string") {
        const parsed = Number(route.params.block_height);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
});

const resolvedBlockHash = ref<string | null>(null);
let requestId = 0;

watch(
    () => ({ hash: hashParam.value, height: heightParam.value }),
    async ({ hash, height }) => {
        requestId += 1;
        const currentRequest = requestId;

        if (hash) {
            resolvedBlockHash.value = hash;
            if (!blockStore.value.data[hash]) {
                await blockStore.value.load(hash);
            }
            return;
        }

        resolvedBlockHash.value = null;

        if (height !== null) {
            try {
                const block = await blockStore.value.loadByHeight(height);
                if (currentRequest === requestId) {
                    resolvedBlockHash.value = block.hash;
                }
            } catch (error) {
                console.error("Failed to load block by height:", error);
            }
        }
    },
    { immediate: true },
);

const data = computed(() => (resolvedBlockHash.value ? blockStore.value.data?.[resolvedBlockHash.value] : undefined));

watchEffect(() => {
    if (resolvedBlockHash.value && data.value) {
        transactionStore.value.getTransactionsByBlockHash(resolvedBlockHash.value, data.value.height);
    }
});

const transactions = computed(() =>
    resolvedBlockHash.value ? transactionStore.value.transactionsByBlock[resolvedBlockHash.value] || [] : [],
);

const displayHeight = computed(() => data.value?.height ?? heightParam.value);

const tabs = [{ name: "Overview" }, { name: "Raw JSON" }];

const formatTimestamp = (date: Date) => {
    return `${getTimeAgo(date)} (${date.toLocaleString()})`;
};

const formatTxTimestamp = (timestamp: number) => {
    return `${getTimeAgo(timestamp)} (${new Date(timestamp).toLocaleString()})`;
};
</script>

<template>
    <ExplorerLayout title="Block Details" :tabs="tabs">
        <template #default="{ activeTab }">
            <div v-if="activeTab === 'Overview'" class="data-card">
                <div class="divide-y divide-secondary/5">
                    <div class="info-row">
                        <span class="info-label">Block:</span>
                        <div class="flex flex-col gap-3">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span
                                    class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-secondary/10 text-secondary/80"
                                >
                                    Hash
                                </span>
                                <RouterLink
                                    v-if="resolvedBlockHash"
                                    :to="{ name: 'BlockHash', params: { block_hash: resolvedBlockHash } }"
                                    class="text-link text-mono break-all"
                                >
                                    {{ resolvedBlockHash }}
                                </RouterLink>
                                <span v-else class="text-label">Loading...</span>
                                <CopyButton v-if="resolvedBlockHash" :text="resolvedBlockHash" />
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <span
                                    class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-secondary/10 text-secondary/80"
                                >
                                    Height
                                </span>
                                <RouterLink
                                    v-if="displayHeight !== null"
                                    :to="{ name: 'BlockHeight', params: { block_height: displayHeight } }"
                                    class="text-link text-mono break-all"
                                >
                                    #{{ displayHeight }}
                                </RouterLink>
                                <span v-else class="text-label">...</span>
                            </div>
                        </div>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Parent Block:</span>
                        <div class="flex items-center gap-2">
                            <RouterLink
                                v-if="data?.parent_hash"
                                :to="{ name: 'BlockHash', params: { block_hash: data?.parent_hash } }"
                                class="text-link"
                            >
                                {{ data?.parent_hash }}
                            </RouterLink>
                            <CopyButton v-if="data?.parent_hash" :text="data.parent_hash" />
                        </div>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Timestamp:</span>
                        <span class="text-label">{{ data?.timestamp ? formatTimestamp(data.timestamp) : "..." }}</span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Transactions (blob tx only):</span>
                        <span class="text-label">{{ transactions.length || 0 }} transactions</span>
                    </div>
                </div>
            </div>

            <!-- Transactions List -->
            <div v-if="activeTab === 'Overview' && transactions.length > 0" class="data-card">
                <h3 class="card-header">Transactions (blob tx only)</h3>
                <div>
                    <RouterLink
                        v-for="tx_hash in transactions"
                        :key="tx_hash"
                        :to="{ name: 'Transaction', params: { tx_hash } }"
                        class="flex items-center justify-between p-3 hover:bg-secondary/5 rounded-lg transition-colors"
                    >
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center shrink-0">
                                <span class="text-sm text-secondary">TX</span>
                            </div>
                            <div class="flex flex-col min-w-0">
                                <span class="text-mono truncate">{{ tx_hash }}</span>
                                <div class="flex items-center gap-2 text-xs">
                                    <span class="text-neutral">{{ formatTxTimestamp(transactionStore.data[tx_hash].timestamp) }}</span>
                                    <span class="text-primary px-2 py-0.5 bg-primary/5 rounded-full">
                                        {{ transactionStore.data[tx_hash].transaction_status }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <svg class="w-4 h-4 text-neutral shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </RouterLink>
                </div>
            </div>

            <div v-else-if="activeTab === 'Raw JSON'" class="data-card">
                <h3 class="card-header">Block Data</h3>
                <pre class="code-block">{{ JSON.stringify(data, null, 2) }}</pre>
            </div>
        </template>
    </ExplorerLayout>
</template>

<style scoped>
.tx-row {
    @apply flex items-center justify-between p-3 hover:bg-secondary/5 rounded-lg transition-colors;
}

.tx-icon {
    @apply w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center shrink-0;
}
</style>
