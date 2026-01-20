<script setup lang="ts">
import ExplorerLayout from "@/explorer/components/ExplorerLayout.vue";
import CopyButton from "@/components/CopyButton.vue";
import { contractStore, transactionStore } from "@/state/data";
import { network, getNetworkIndexerApiUrl } from "@/state/network";
import { computed, watchEffect, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getTimeAgo, copyToClipboard } from "@/state/utils";

const route = useRoute();
const router = useRouter();
const contract_name = computed(() => route.params.contract_name as string);

watchEffect(() => {
    if (!contractStore.value.data[contract_name.value]) {
        contractStore.value.load(contract_name.value);
    }
});

const data = computed(() => contractStore.value.data?.[contract_name.value]);

const transactions = ref<string[]>([]);
const history = ref<ContractHistoryItem[]>([]);
const historyLoading = ref(false);
const historyError = ref("");
const toastMessage = ref("");
const isToastVisible = ref(false);
const toastX = ref(0);
const toastY = ref(0);

onMounted(async () => {
    transactions.value = await transactionStore.value.getTransactionsByContract(contract_name.value);
});

const tabs = [{ name: "Overview" }, { name: "History" }, { name: "Raw JSON" }];
const activeTab = ref((route.query.tab as string) || "Overview");
watch(
    () => route.query.tab,
    (tab) => {
        activeTab.value = (tab as string) || "Overview";
    },
);

const formatTimestamp = (timestamp: number) => {
    return `${getTimeAgo(timestamp)} (${new Date(timestamp).toLocaleString()})`;
};

interface ContractHistoryItem {
    change_type?: string;
    contract_name?: string;
    tx_hash?: string;
    block_height?: number;
    height?: number;
    timestamp?: number;
    program_id?: string;
    soft_timeout?: number;
    hard_timeout?: number;
    state_commitment?: string;
    verifier?: string;
    [key: string]: any;
}

const historyChangeTypes = ["registered", "program_id_updated", "timeout_updated", "deleted"];

const fetchContractHistory = async () => {
    historyLoading.value = true;
    historyError.value = "";

    try {
        const baseUrl = getNetworkIndexerApiUrl(network.value);
        const params = new URLSearchParams({
            change_type: historyChangeTypes.join(","),
            no_cache: Date.now().toString(),
        });
        const response = await fetch(`${baseUrl}/v1/indexer/contract/${contract_name.value}/history?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const payload = await response.json();
        history.value = Array.isArray(payload) ? payload : (payload?.history ?? []);
    } catch (err) {
        console.error(`Error fetching ${contract_name.value} contract history:`, err);
        historyError.value = err instanceof Error ? err.message : "Unknown error";
        history.value = [];
    } finally {
        historyLoading.value = false;
    }
};

const getHistoryBlockHeight = (item: ContractHistoryItem) => {
    return item.block_height ?? item.height ?? undefined;
};

const getHistoryTxHash = (item: ContractHistoryItem) => {
    return item.tx_hash ?? item.txHash ?? undefined;
};

const getHistoryDetails = (item: ContractHistoryItem) => {
    const details: { label: string; value: string }[] = [];
    const changeTypes = normalizeHistoryChangeTypes(item.change_type);
    const hasType = (type: string) => changeTypes.includes(type);

    if (hasType("registered")) {
        if (item.program_id) details.push({ label: "Program ID", value: item.program_id });
        if (item.soft_timeout !== undefined) details.push({ label: "Soft Timeout", value: String(item.soft_timeout) });
        if (item.hard_timeout !== undefined) details.push({ label: "Hard Timeout", value: String(item.hard_timeout) });
        if (item.state_commitment) details.push({ label: "State", value: item.state_commitment });
        if (item.verifier) details.push({ label: "Verifier", value: item.verifier });
        return details;
    }

    if (hasType("program_id_updated") && item.program_id) {
        details.push({ label: "Program ID", value: item.program_id });
    }
    if (hasType("timeout_updated")) {
        if (item.soft_timeout !== undefined) details.push({ label: "Soft Timeout", value: String(item.soft_timeout) });
        if (item.hard_timeout !== undefined) details.push({ label: "Hard Timeout", value: String(item.hard_timeout) });
    }

    return details;
};

const isProgramIdDetail = (detail: { label: string; value: string }) => detail.label === "Program ID";
const handleProgramIdCopy = async (value: string, event: MouseEvent) => {
    await copyToClipboard(value);
    const target = event.currentTarget as HTMLElement | null;
    if (target) {
        const rect = target.getBoundingClientRect();
        const padding = 8;
        const maxX = window.innerWidth - padding;
        const maxY = window.innerHeight - padding;
        toastX.value = Math.min(Math.max(rect.left + rect.width / 2, padding), maxX);
        toastY.value = Math.min(Math.max(rect.top - 8, padding), maxY);
    } else {
        toastX.value = event.clientX;
        toastY.value = event.clientY - 8;
    }
    toastMessage.value = "Program ID copied";
    isToastVisible.value = true;
    setTimeout(() => {
        isToastVisible.value = false;
    }, 1500);
};

const normalizeHistoryChangeTypes = (changeType?: string | string[]) => {
    if (!changeType) return [];
    if (Array.isArray(changeType)) return changeType;
    return [changeType];
};

const formatHistoryChangeType = (changeType?: string) => {
    if (!changeType) return "Event";
    const labels: Record<string, string> = {
        registered: "Registered",
        program_id_updated: "Program ID Updated",
        timeout_updated: "Timeout Updated",
        deleted: "Deleted",
    };
    return labels[changeType] || changeType.replaceAll("_", " ");
};

const getHistoryChangeTypeClass = (changeType?: string) => {
    const classes: Record<string, string> = {
        registered: "bg-emerald-500/15 text-emerald-700",
        program_id_updated: "bg-blue-500/15 text-blue-700",
        timeout_updated: "bg-amber-500/15 text-amber-700",
        deleted: "bg-rose-500/15 text-rose-700",
    };
    return classes[changeType || ""] || "bg-secondary/10 text-secondary";
};

watch(
    [contract_name, network],
    () => {
        fetchContractHistory();
    },
    { immediate: true },
);

const updateURL = () => {
    const query: Record<string, string> = {};

    if (activeTab.value !== "Overview") {
        query.tab = activeTab.value;
    }

    router.replace({
        name: "Contract",
        params: { contract_name: contract_name.value },
        query: Object.keys(query).length > 0 ? query : undefined,
    });
};

let isInitialized = false;
watch(
    activeTab,
    () => {
        if (isInitialized) {
            updateURL();
        }
    },
    { immediate: false },
);

const handleTabChange = (tab: string) => {
    activeTab.value = tab;
};

watch(
    () => contract_name.value,
    () => {
        if (!isInitialized) {
            setTimeout(() => {
                isInitialized = true;
            }, 100);
        }
    },
    { immediate: true },
);
</script>

<template>
    <ExplorerLayout title="Contract Details" :tabs="tabs" :active-tab="activeTab" @update:active-tab="handleTabChange">
        <template #default="{ activeTab }">
            <div
                v-if="isToastVisible"
                class="fixed z-50 rounded-xl bg-secondary text-white px-4 py-2 text-sm shadow-lg pointer-events-none"
                :style="{ left: `${toastX}px`, top: `${toastY}px`, transform: 'translate(-50%, -100%)' }"
            >
                {{ toastMessage }}
            </div>
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

            <div v-else-if="activeTab === 'History'" class="data-card">
                <h3 class="card-header">Contract History</h3>
                <div v-if="historyLoading" class="text-center py-6 text-secondary">Loading contract history...</div>
                <div v-else-if="historyError" class="text-center py-6 text-red-500">{{ historyError }}</div>
                <div v-else-if="history.length === 0" class="text-center py-6 text-secondary">No history events found</div>
                <div v-else class="space-y-3">
                    <div
                        v-for="(event, index) in history"
                        :key="event.tx_hash || event.txHash || `${event.change_type}-${index}`"
                        class="flex items-start justify-between gap-4 p-3 rounded-lg border border-secondary/10 bg-white/60"
                    >
                        <div class="flex items-start gap-3 min-w-0">
                            <div class="w-9 h-9 bg-secondary/10 rounded-lg flex items-center justify-center shrink-0">
                                <span class="text-xs text-secondary">EV</span>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <div class="flex flex-wrap gap-2">
                                        <span
                                            v-for="changeType in normalizeHistoryChangeTypes(event.change_type)"
                                            :key="changeType"
                                            :class="[
                                                'px-3 py-1 rounded-full text-sm font-semibold',
                                                getHistoryChangeTypeClass(changeType),
                                            ]"
                                        >
                                            {{ formatHistoryChangeType(changeType) }}
                                        </span>
                                    </div>
                                    <span v-if="getHistoryBlockHeight(event)" class="text-xs text-secondary">
                                        Block #{{ getHistoryBlockHeight(event) }}
                                    </span>
                                    <span v-if="event.timestamp" class="text-xs text-secondary">
                                        {{ formatTimestamp(event.timestamp) }}
                                    </span>
                                </div>
                                <div v-if="getHistoryTxHash(event)" class="text-xs text-secondary">
                                    <RouterLink
                                        :to="{ name: 'Transaction', params: { tx_hash: getHistoryTxHash(event) } }"
                                        class="text-link font-mono"
                                    >
                                        {{ getHistoryTxHash(event) }}
                                    </RouterLink>
                                </div>
                                <div v-if="getHistoryDetails(event).length > 0" class="flex flex-wrap gap-2 mt-2 text-xs text-secondary">
                                    <span
                                        v-for="detail in getHistoryDetails(event)"
                                        :key="detail.label"
                                        :class="[
                                            'px-2 py-1 rounded-full bg-secondary/5 max-w-[260px]',
                                            isProgramIdDetail(detail) ? 'cursor-pointer hover:bg-secondary/10' : '',
                                        ]"
                                        :title="`${detail.label}: ${detail.value}`"
                                        @click="isProgramIdDetail(detail) ? handleProgramIdCopy(detail.value, $event) : undefined"
                                    >
                                        <span v-if="isProgramIdDetail(detail)" class="inline-flex items-center gap-2 w-full">
                                            <span class="font-medium">{{ detail.label }}:</span>
                                            <span class="truncate max-w-[140px]">{{ detail.value }}</span>
                                        </span>
                                        <span v-else class="truncate block">
                                            {{ detail.label }}: {{ detail.value }}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <svg class="w-4 h-4 text-neutral shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
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
