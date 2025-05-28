<script setup lang="ts">
import ExplorerLayout from "@/explorer/components/ExplorerLayout.vue";
import CopyButton from "@/components/CopyButton.vue";
import { blockStore, transactionStore } from "@/state/data";
import { getTimeAgo } from "@/state/utils";
import { computed, watchEffect } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const block_hash = computed(() => route.params.block_hash as string);

watchEffect(() => {
    if (!blockStore.value.data[block_hash.value]) {
        blockStore.value.load(block_hash.value);
    }
});

const data = computed(() => blockStore.value.data?.[block_hash.value]);

watchEffect(() => {
    if (data.value) {
        transactionStore.value.getTransactionsByBlockHash(block_hash.value, data.value.height);
    }
});

const transactions = computed(() => transactionStore.value.transactionsByBlock[block_hash.value] || []);

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
                        <span class="info-label">Block Hash:</span>
                        <div class="flex items-center gap-2">
                            <span class="text-mono">{{ block_hash }}</span>
                            <CopyButton :text="block_hash" />
                        </div>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Height:</span>
                        <span class="text-label">#{{ data?.height === undefined ? "..." : data.height }}</span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Parent Block:</span>
                        <div class="flex items-center gap-2">
                            <RouterLink
                                v-if="data?.parent_hash"
                                :to="{ name: 'Block', params: { block_hash: data?.parent_hash } }"
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
