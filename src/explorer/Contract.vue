<script setup lang="ts">
import ExplorerLayout from "@/explorer/components/ExplorerLayout.vue";
import CopyButton from "@/components/CopyButton.vue";
import { contractStore, transactionStore } from "@/state/data";
import { computed, watchEffect, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getTimeAgo } from "@/state/utils";

const route = useRoute();
const contract_name = computed(() => route.params.contract_name as string);

watchEffect(() => {
    if (!contractStore.value.data[contract_name.value]) {
        contractStore.value.load(contract_name.value);
    }
});

const data = computed(() => contractStore.value.data?.[contract_name.value]);

const transactions = ref<string[]>([]);

onMounted(async () => {
    transactions.value = await transactionStore.value.getTransactionsByContract(contract_name.value);
});

const tabs = [{ name: "Overview" }, { name: "Raw JSON" }];

const formatTimestamp = (timestamp: number) => {
    return `${getTimeAgo(timestamp)} (${new Date(timestamp).toLocaleString()})`;
};
</script>

<template>
    <ExplorerLayout title="Contract Details" :tabs="tabs">
        <template #default="{ activeTab }">
            <div v-if="activeTab === 'Overview'" class="data-card">
                <div class="divide-y divide-secondary/5">
                    <div class="info-row">
                        <span class="info-label">Contract Name:</span>
                        <div class="flex items-center gap-2">
                            <span class="text-label">{{ contract_name }}</span>
                            <CopyButton :text="contract_name" />
                        </div>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Transaction Hash:</span>
                        <div class="flex items-center gap-2">
                            <RouterLink
                                v-if="data?.tx_hash"
                                :to="{ name: 'Transaction', params: { tx_hash: data.tx_hash } }"
                                class="text-link"
                            >
                                {{ data.tx_hash }}
                            </RouterLink>
                            <CopyButton v-if="data?.tx_hash" :text="data.tx_hash" />
                        </div>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Verifier:</span>
                        <span class="text-label">{{ data?.verifier }}</span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Program ID:</span>
                        <span class="text-label">{{ data?.program_id }}</span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">State Commitment:</span>
                        <div class="flex items-center gap-2 flex-1">
                            <span class="text-label">{{ data?.state_commitment }}</span>
                            <CopyButton v-if="data?.state_commitment" :text="data.state_commitment" />
                        </div>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Total Transactions:</span>
                        <span class="text-label">{{ data?.total_tx || "0" }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Total unsettled Transactions:</span>
                        <span class="text-label">{{ data?.unsettled_tx || "0" }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Earliest unsettled transaction:</span>
                        <span class="text-label">
                            <template v-if="!data || !data.earliest_unsettled"> No unsettled txs </template>
                            <template v-else>
                                <RouterLink
                                    :to="{ name: 'BlockHeight', params: { block_height: data.earliest_unsettled } }"
                                    class="text-link"
                                >
                                    Block #{{ data.earliest_unsettled }}
                                </RouterLink>
                            </template>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Transactions List -->
            <div v-if="activeTab === 'Overview' && transactions.length > 0" class="data-card">
                <h3 class="card-header">Transactions</h3>
                {{ data.total_tx > 100 ? "(Latest 100)" : `` }}
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
                                    <span class="text-neutral">{{ formatTimestamp(transactionStore.data[tx_hash].timestamp) }}</span>
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
                <h3 class="card-header">Contract Data</h3>
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
