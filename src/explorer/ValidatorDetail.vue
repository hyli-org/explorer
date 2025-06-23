<script setup lang="ts">
import Header from "@/explorer/Header.vue";
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getNetworkIndexerApiUrl, getNetworkNodeApiUrl, network } from "@/state/network";
import { getTimeAgo } from "@/state/utils";
import CopyButton from "@/components/CopyButton.vue";
import { transactionStore } from "@/state/data";

interface DataProposal {
    hash: string;
    parent_hash: string | null;
    lane_id: string;
    tx_count: number;
    estimated_size: number;
    block_hash: string;
    block_height: number;
    timestamp: number;
    transactions?: any[];
}

const route = useRoute();
const router = useRouter();
const validatorId = computed(() => route.params.validator_id as string);

const validatorInfo = ref<{
    id: string;
    balance: number;
    cumul_size: number;
    delegated: number;
} | null>(null);

const dataProposals = ref<DataProposal[]>([]);
const loading = ref(false);
const error = ref("");
const expandedProposals = ref<Set<string>>(new Set());

// Format number to human readable format
const formatNumber = (num: number): string => {
    if (num === 0) return "0";
    const k = 1000;
    const sizes = ["", "k", "M", "B", "T"];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return (num / Math.pow(k, i)).toFixed(2) + sizes[i];
};

// Format bytes to human readable format
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
};

const fetchValidatorInfo = async () => {
    try {
        const response = await fetch(getNetworkNodeApiUrl(network.value) + `/v1/consensus/staking_state?no_cache=${Date.now()}`);
        const stakingState = await response.json();

        if (stakingState?.fees?.balances[validatorId.value]) {
            validatorInfo.value = {
                id: validatorId.value,
                balance: stakingState.fees.balances[validatorId.value].balance,
                cumul_size: stakingState.fees.balances[validatorId.value].cumul_size,
                delegated: 0, // TODO: Calculate delegated amount
            };
        }
    } catch (err) {
        console.error("Error fetching validator info:", err);
        error.value = "Failed to fetch validator information";
    }
};

const fetchDataProposals = async () => {
    try {
        const response = await fetch(
            getNetworkIndexerApiUrl(network.value) + `/v1/indexer/data_proposals/lane/${validatorId.value}?no_cache=${Date.now()}`,
        );
        if (response.ok) {
            dataProposals.value = await response.json();
        } else {
            console.warn("No data proposals found for this validator");
        }
    } catch (err) {
        console.error("Error fetching data proposals:", err);
    }
};

const fetchProposalTransactions = async (proposalHash: string) => {
    try {
        const response = await fetch(
            getNetworkIndexerApiUrl(network.value) + `/v1/indexer/data_proposal/hash/${proposalHash}/transactions?no_cache=${Date.now()}`,
        );
        if (response.ok) {
            const transactions = await response.json();
            // Find the proposal and add transactions to it
            const proposal = dataProposals.value.find((p) => p.hash === proposalHash);
            if (proposal) {
                proposal.transactions = transactions;
                // Store transaction data in transactionStore for consistency
                transactions.forEach((tx: any) => {
                    transactionStore.value.data[tx.tx_hash] = tx;
                });
            }
        }
    } catch (err) {
        console.error("Error fetching proposal transactions:", err);
    }
};

const toggleProposal = async (proposalHash: string) => {
    if (expandedProposals.value.has(proposalHash)) {
        expandedProposals.value.delete(proposalHash);
    } else {
        expandedProposals.value.add(proposalHash);
        // Fetch transactions for this proposal if not already loaded
        const proposal = dataProposals.value.find((p) => p.hash === proposalHash);
        if (proposal && !proposal.transactions) {
            await fetchProposalTransactions(proposalHash);
        }
    }
};

onMounted(async () => {
    loading.value = true;
    try {
        await Promise.all([fetchValidatorInfo(), fetchDataProposals()]);
    } finally {
        loading.value = false;
    }
});

// Computed properties for statistics
const totalProposals = computed(() => dataProposals.value.length);
const totalTransactions = computed(() => dataProposals.value.reduce((sum, p) => sum + p.tx_count, 0));
</script>

<template>
    <div class="min-h-screen bg-background">
        <Header />
        <div class="container mx-auto px-4 py-12">
            <!-- Header Section -->
            <div class="mb-12 max-w-4xl mx-auto">
                <div class="flex items-center gap-4 mb-4">
                    <button
                        @click="router.go(-1)"
                        class="p-2 rounded-lg bg-white/80 backdrop-blur-sm border border-white/20 hover:bg-secondary/5 transition-colors"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 class="text-4xl font-display text-primary mb-3">Validator Details</h1>
                        <p class="text-neutral text-lg">Comprehensive information about validator activity</p>
                    </div>
                </div>

                <!-- Validator ID -->
                <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                    <div class="flex items-center gap-3 mb-2">
                        <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <h3 class="text-sm font-medium text-neutral uppercase">Validator ID</h3>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-mono text-sm text-secondary break-all">{{ validatorId }}</span>
                        <CopyButton :text="validatorId" />
                    </div>
                </div>
            </div>

            <main class="container mx-auto px-4 py-6">
                <!-- Loading State -->
                <div v-if="loading" class="flex justify-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>

                <!-- Error State -->
                <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                    <p class="text-red-600">{{ error }}</p>
                </div>

                <!-- Content -->
                <div v-else class="space-y-8">
                    <!-- Validator Stats -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                            <div class="flex items-center gap-3 mb-2">
                                <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <h3 class="text-sm font-medium text-neutral uppercase">Balance</h3>
                            </div>
                            <p class="text-3xl font-display text-primary">
                                {{ validatorInfo ? formatNumber(validatorInfo.balance) : "0" }} HYL
                            </p>
                        </div>

                        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                            <div class="flex items-center gap-3 mb-2">
                                <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                                    />
                                </svg>
                                <h3 class="text-sm font-medium text-neutral uppercase">Data Disseminated</h3>
                            </div>
                            <p class="text-3xl font-display text-primary">
                                {{ validatorInfo ? formatBytes(validatorInfo.cumul_size) : "0 B" }}
                            </p>
                        </div>

                        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                            <div class="flex items-center gap-3 mb-2">
                                <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                <h3 class="text-sm font-medium text-neutral uppercase">Data Proposals</h3>
                            </div>
                            <p class="text-3xl font-display text-primary">{{ totalProposals }}</p>
                        </div>

                        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                            <div class="flex items-center gap-3 mb-2">
                                <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <h3 class="text-sm font-medium text-neutral uppercase">Total Transactions</h3>
                            </div>
                            <p class="text-3xl font-display text-primary">{{ totalTransactions }}</p>
                        </div>
                    </div>

                    <!-- Data Proposals Section -->
                    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-3">
                                <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                <h2 class="text-2xl font-display text-primary">Data Proposals</h2>
                            </div>
                            <span class="text-sm bg-secondary/5 px-3 py-1 rounded-full text-neutral"> {{ totalProposals }} total </span>
                        </div>

                        <div v-if="dataProposals.length === 0" class="text-center py-8 text-neutral">
                            No data proposals found for this validator
                        </div>

                        <div v-else class="space-y-4">
                            <div
                                v-for="proposal in dataProposals"
                                :key="proposal.hash"
                                class="border border-secondary/10 rounded-lg overflow-hidden"
                            >
                                <!-- Proposal Header -->
                                <div
                                    class="p-4 bg-secondary/5 cursor-pointer hover:bg-secondary/10 transition-colors"
                                    @click="toggleProposal(proposal.hash)"
                                >
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-3">
                                            <div class="flex items-center gap-2">
                                                <svg
                                                    class="w-4 h-4 text-primary transition-transform duration-200"
                                                    :class="{ 'rotate-90': expandedProposals.has(proposal.hash) }"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M9 5l7 7-7 7"
                                                    />
                                                </svg>
                                                <span class="text-sm font-medium text-primary">Data Proposal</span>
                                            </div>
                                            <span class="font-mono text-sm text-neutral">
                                                {{ proposal.hash.slice(0, 10) }}...{{ proposal.hash.slice(-6) }}
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-4 text-sm text-neutral">
                                            <span>{{ proposal.tx_count }} transactions</span>
                                            <span>{{ formatBytes(proposal.estimated_size) }}</span>
                                            <span>Block #{{ proposal.block_height }}</span>
                                            <span>{{ getTimeAgo(new Date(proposal.timestamp).toISOString()) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Expanded Content -->
                                <div v-if="expandedProposals.has(proposal.hash)" class="p-4 border-t border-secondary/10">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <h4 class="text-sm font-medium text-neutral mb-2">Proposal Details</h4>
                                            <div class="space-y-3 text-sm">
                                                <div>
                                                    <div class="text-neutral mb-1">Hash:</div>
                                                    <div class="flex items-center gap-2">
                                                        <span class="font-mono text-secondary break-all">{{ proposal.hash }}</span>
                                                        <CopyButton :text="proposal.hash" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div class="text-neutral mb-1">Parent Hash:</div>
                                                    <div class="flex items-center gap-2">
                                                        <span class="font-mono text-secondary break-all">{{
                                                            proposal.parent_hash || "(none)"
                                                        }}</span>
                                                        <CopyButton v-if="proposal.parent_hash" :text="proposal.parent_hash" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div class="text-neutral mb-1">Lane ID:</div>
                                                    <div class="flex items-center gap-2">
                                                        <span class="font-mono text-secondary break-all">{{ proposal.lane_id }}</span>
                                                        <CopyButton :text="proposal.lane_id" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 class="text-sm font-medium text-neutral mb-2">Block Information</h4>
                                            <div class="space-y-3 text-sm">
                                                <div>
                                                    <div class="text-neutral mb-1">Block Hash:</div>
                                                    <RouterLink
                                                        :to="{ name: 'Block', params: { block_hash: proposal.block_hash } }"
                                                        class="font-mono text-primary hover:underline break-all"
                                                    >
                                                        {{ proposal.block_hash }}
                                                    </RouterLink>
                                                </div>
                                                <div>
                                                    <div class="text-neutral mb-1">Block Height:</div>
                                                    <span class="text-secondary">#{{ proposal.block_height }}</span>
                                                </div>
                                                <div>
                                                    <div class="text-neutral mb-1">Timestamp:</div>
                                                    <span class="text-secondary">{{ new Date(proposal.timestamp).toLocaleString() }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Transactions -->
                                    <div v-if="proposal.transactions && proposal.transactions.length > 0">
                                        <h4 class="text-sm font-medium text-neutral mb-3">
                                            Transactions ({{ proposal.transactions.length }})
                                        </h4>
                                        <div class="divide-y divide-secondary/5 max-h-64 overflow-y-auto">
                                            <RouterLink
                                                v-for="transaction in proposal.transactions"
                                                :key="transaction.tx_hash"
                                                :to="{ name: 'Transaction', params: { tx_hash: transaction.tx_hash } }"
                                                class="block hover:bg-secondary/5 rounded-lg transition-colors"
                                            >
                                                <div class="flex items-center py-3 px-4">
                                                    <div class="flex-1">
                                                        <div class="flex items-center justify-between mb-1">
                                                            <div class="flex items-center gap-2">
                                                                <span class="font-mono text-xs text-neutral"
                                                                    >{{ transaction.tx_hash.slice(0, 10) }}...{{
                                                                        transaction.tx_hash.slice(-6)
                                                                    }}</span
                                                                >
                                                                <span class="text-xs text-primary px-2 py-0.5 bg-primary/5 rounded-full">
                                                                    {{ transaction.transaction_type }}
                                                                </span>
                                                            </div>
                                                            <span class="text-xs text-neutral">{{
                                                                getTimeAgo(transaction.timestamp)
                                                            }}</span>
                                                        </div>
                                                        <div class="flex items-center justify-between text-xs">
                                                            <div class="flex items-center gap-3 text-neutral">
                                                                <span
                                                                    >Sender:
                                                                    <span class="text-secondary font-mono">{{
                                                                        transaction.identity ?? "(unknown)"
                                                                    }}</span></span
                                                                >
                                                            </div>
                                                            <span class="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                                                                {{ transaction.transaction_status }}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </RouterLink>
                                        </div>
                                    </div>
                                    <div v-else-if="proposal.transactions && proposal.transactions.length === 0">
                                        <p class="text-sm text-neutral">No transactions found for this proposal</p>
                                    </div>
                                    <div v-else>
                                        <div class="flex items-center gap-2 text-sm text-neutral">
                                            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                            Loading transactions...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<style scoped>
.rotate-90 {
    transform: rotate(90deg);
}
</style>
