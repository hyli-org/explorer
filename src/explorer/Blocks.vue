<script setup lang="ts">
import Header from "@/explorer/Header.vue";
import { blockStore, transactionStore } from "@/state/data";
import { onMounted, ref, computed } from "vue";
import type { BlockInfo } from "@/state/blocks";
import { getTimeAgo } from "@/state/utils";

const currentPage = ref(1);
const pageSize = 10;
const isLoading = ref(false);
const initialBlockHeight = ref(0);

// Get the latest block height from the blockStore
const latestBlockHeight = computed(() => {
    if (blockStore.value.latest[0]) {
        return blockStore.value.data[blockStore.value.latest[0]].height;
    }
    return 0;
});

// Use initial block height as reference point for pagination
const totalBlocks = computed(() => initialBlockHeight.value);

// Compute the current page's block range
const pageBlockRange = computed(() => {
    const startBlock = initialBlockHeight.value - (currentPage.value - 1) * pageSize;
    const endBlock = Math.max(startBlock - pageSize + 1, 1);
    return { startBlock, endBlock };
});

// Check if we have all blocks for current page
const hasCurrentPageBlocks = computed(() => {
    const { startBlock, endBlock } = pageBlockRange.value;
    return (
        Object.values(blockStore.value.data).some((block) => block.height === startBlock) &&
        Object.values(blockStore.value.data).some((block) => block.height === endBlock)
    );
});

// Compute the current page's blocks
const currentPageBlocks = computed(() => {
    const { startBlock, endBlock } = pageBlockRange.value;
    return Object.values(blockStore.value.data)
        .filter((block) => block.height <= startBlock && block.height >= endBlock)
        .sort((a, b) => b.height - a.height);
});

const loadBlocks = async () => {
    // Only load if we don't have the blocks for current page
    if (!hasCurrentPageBlocks.value) {
        isLoading.value = true;
        try {
            const { startBlock } = pageBlockRange.value;
            const blocks = await blockStore.value.loadBlocks(startBlock, pageSize);

            // Load transactions for each block
            await Promise.all(
                blocks.map((block: BlockInfo) => transactionStore.value.getTransactionsByBlockHash(block.hash, block.height)),
            );
        } catch (error) {
            console.error("Failed to load blocks:", error);
        } finally {
            isLoading.value = false;
        }
    }
};

const totalPages = computed(() => Math.ceil(totalBlocks.value / pageSize));

const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
        loadBlocks();
    }
};

// Load latest blocks first, then load the paginated blocks
onMounted(async () => {
    // Load latest blocks if not already loaded
    if (blockStore.value.latest.length === 0) {
        await blockStore.value.loadLatest();
    }
    // Set initial block height as reference point
    initialBlockHeight.value = latestBlockHeight.value;
    loadBlocks();
});
</script>

<template>
    <div class="min-h-screen bg-background">
        <Header />
        <main class="container mx-auto px-4 py-6">
            <div class="mb-6">
                <h1 class="text-2xl font-display text-secondary mb-4">All Blocks</h1>
                <p class="text-neutral">Explore all blocks in the Hyli blockchain</p>
            </div>

            <!-- Blocks List -->
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                <div class="space-y-4">
                    <!-- Loading State -->
                    <div v-if="isLoading" class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>

                    <!-- Blocks List -->
                    <div v-else class="divide-y divide-secondary/5">
                        <RouterLink
                            v-for="block in currentPageBlocks"
                            :key="block.hash"
                            :to="{ name: 'BlockHash', params: { block_hash: block.hash } }"
                            class="block hover:bg-secondary/5 rounded-lg transition-colors"
                        >
                            <div class="flex items-center py-3 px-4">
                                <div class="flex-1">
                                    <div class="flex items-center justify-between mb-1">
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-primary px-2 py-0.5 bg-primary/5 rounded-full">
                                                Block #{{ block.height }}
                                            </span>
                                            <span class="font-mono text-xs text-neutral">
                                                {{ block.hash.slice(0, 10) }}...{{ block.hash.slice(-6) }}
                                            </span>
                                        </div>
                                        <span class="text-xs text-neutral">{{ getTimeAgo(block.timestamp) }}</span>
                                    </div>
                                    <div class="flex items-center justify-between text-xs">
                                        <div class="flex items-center gap-3 text-neutral">
                                            <span
                                                >Transactions:
                                                <span class="text-secondary">{{
                                                    transactionStore.transactionsByBlock?.[block.hash]?.length || "..."
                                                }}</span></span
                                            >
                                            <span>Size: <span class="text-secondary">24.5 KB (fake)</span></span>
                                        </div>
                                        <span class="text-xs px-2 py-0.5 bg-primary/5 text-primary rounded-full"> Finalized </span>
                                    </div>
                                </div>
                            </div>
                        </RouterLink>
                    </div>

                    <!-- Pagination -->
                    <div class="flex items-center justify-between mt-6 pt-4 border-t border-secondary/5">
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
                </div>
            </div>
        </main>
    </div>
</template>
