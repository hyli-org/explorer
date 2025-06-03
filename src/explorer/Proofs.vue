<script setup lang="ts">
import Header from "@/explorer/Header.vue";
import { proofStore, blockStore } from "@/state/data";
import { onMounted, ref, computed } from "vue";

const currentPage = ref(1);
const pageSize = 100;
const isLoading = ref(false);

const currentPageProofs = ref<any[]>([]);
const totalPages = ref(1);

const startBlock = computed(() => {
    // If there are proofs, use the block height of the latest proof
    if (proofStore.value.latest.length > 0) {
        const latestProof = proofStore.value.data[proofStore.value.latest[0]];
        if (latestProof && latestProof.block_hash) {
            const proofBlockHeight = blockStore.value.data[latestProof.block_hash]?.height;
            if (!proofBlockHeight) {
                blockStore.value.load(latestProof.block_hash);
            } else {
                return proofBlockHeight - (currentPage.value - 1) * pageSize;
            }
        }
    }
    // Fallback: use latest block
    if (!blockStore.value.latest[0]) return null;
    const latestBlockHeight = blockStore.value.data[blockStore.value.latest[0]].height;
    return latestBlockHeight - (currentPage.value - 1) * pageSize;
});

const loadProofs = async () => {
    isLoading.value = true;
    currentPageProofs.value = [];
    try {
        if (!blockStore.value.latest[0]) {
            await blockStore.value.loadLatest();
        }
        if (!startBlock.value || startBlock.value <= 0) {
            currentPageProofs.value = [];
            totalPages.value = 1;
            return;
        }
        const { proofs } = await proofStore.value.getPaginatedProofs(startBlock.value, pageSize);
        currentPageProofs.value = proofs;
        // Update total pages based on latest block
        const latestBlockHeight = blockStore.value.data[blockStore.value.latest[0]].height;
        totalPages.value = Math.ceil(latestBlockHeight / pageSize);
    } catch (error) {
        console.error("Failed to load proofs:", error);
    } finally {
        isLoading.value = false;
    }
};

const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
        loadProofs();
    }
};

onMounted(async () => {
    await loadProofs();
});
</script>

<template>
    <div class="min-h-screen bg-background">
        <Header />
        <main class="container mx-auto px-4 py-6">
            <div class="mb-6">
                <h1 class="text-2xl font-display text-secondary mb-4">All Proofs</h1>
                <p class="text-neutral">Explore all zero-knowledge proofs in the Hyli blockchain</p>
            </div>

            <!-- Pagination (Top) -->
            <div class="flex items-center justify-between mb-6">
                <button
                    @click="goToPage(currentPage - 1)"
                    :disabled="currentPage === 1"
                    class="px-4 py-2 text-sm font-medium rounded-xl bg-secondary/5 text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <div class="flex items-center gap-2">
                    <span class="text-sm text-neutral"> Page {{ currentPage }} of {{ totalPages }} </span>
                </div>
                <button
                    @click="goToPage(currentPage + 1)"
                    :disabled="currentPage >= totalPages"
                    class="px-4 py-2 text-sm font-medium rounded-xl bg-secondary/5 text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>

            <!-- Proofs List -->
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                <div class="space-y-4">
                    <!-- Loading State -->
                    <div v-if="isLoading" class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>

                    <!-- Proofs List -->
                    <div v-else class="divide-y divide-secondary/5">
                        <div v-if="currentPageProofs.length === 0" class="text-center">
                            No proofs found between blocks #{{ (startBlock ?? 0) - pageSize }} and #{{ startBlock ?? 0 }}
                        </div>
                        <RouterLink
                            v-for="proof in currentPageProofs"
                            :key="proof.tx_hash"
                            :to="{ name: 'Transaction', params: { tx_hash: proof.tx_hash } }"
                            class="block hover:bg-secondary/5 rounded-lg transition-colors"
                        >
                            <div class="flex items-center py-3 px-4">
                                <div class="flex-1">
                                    <div class="flex items-center justify-between mb-1">
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono text-xs text-neutral">
                                                {{ proof.tx_hash.slice(0, 10) }}...{{ proof.tx_hash.slice(-6) }}
                                            </span>
                                            <span class="text-xs text-primary px-2 py-0.5 bg-primary/5 rounded-full">
                                                {{ proof.transaction_type }}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="flex items-center justify-between text-xs">
                                        <div class="flex items-center gap-3 text-neutral">
                                            <span
                                                >Block:
                                                <RouterLink
                                                    :to="{ name: 'Block', params: { block_hash: proof.block_hash } }"
                                                    class="text-secondary hover:underline"
                                                >
                                                    {{ proof.block_hash ? `${proof.block_hash.slice(0, 8)}...` : "Pending" }}
                                                </RouterLink>
                                            </span>
                                        </div>
                                        <span
                                            class="text-xs px-2 py-0.5 rounded-full"
                                            :class="{
                                                'bg-green-50 text-green-600': proof.transaction_status === 'Success',
                                                'bg-red-50 text-red-600': proof.transaction_status !== 'Success',
                                            }"
                                        >
                                            {{ proof.transaction_status }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </RouterLink>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>
