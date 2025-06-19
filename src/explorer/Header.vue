<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import NetworkSelector from "@/explorer/components/NetworkSelector.vue";

const router = useRouter();
const route = useRoute();
const searchQuery = ref("");

// Hide search bar on home page
const isHomePage = computed(() => route.name === "Home");

const handleSearch = () => {
    const query = searchQuery.value.trim();

    if (query.match(/^[0-9]+$/)) {
        router.push({ name: "Block", params: { block_hash: query } });
    } else if (query.length === 64) {
        router.push({ name: "Transaction", params: { tx_hash: query } });
    } else if (query) {
        router.push({ name: "Contract", params: { contract_name: query } });
    }
    searchQuery.value = "";
};
</script>

<template>
    <header class="bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div class="container mx-auto px-4">
            <div class="flex items-center justify-between h-16">
                <RouterLink :to="{ name: 'Home' }" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <svg class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                    </svg>
                    <span class="text-xl font-display text-primary">Hyli Explorer</span>
                </RouterLink>

                <div v-if="!isHomePage" class="flex items-center gap-4 flex-1 max-w-xl mx-4">
                    <div class="relative w-full">
                        <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <svg class="w-4 h-4 text-neutral/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <input
                            v-model="searchQuery"
                            type="search"
                            placeholder="Search blocks, transactions, or contracts..."
                            class="w-full bg-white/80 backdrop-blur-sm border border-secondary/10 rounded-xl py-2 pl-10 pr-4 text-secondary placeholder-neutral/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-secondary/20 transition-all duration-200"
                            @keyup.enter="handleSearch"
                        />
                    </div>
                </div>
                <div class="flex gap-8 items-center">
                    <div class="hidden md:block">
                        <RouterLink
                            :to="{ name: 'NetworkStats' }"
                            class="w-full py-2 px-4 rounded-xl text-secondary hover:bg-secondary/10 transition-colors text-sm block text-center"
                        >
                            NETWORK STATS
                        </RouterLink>
                    </div>

                    <NetworkSelector />
                </div>
            </div>
        </div>
    </header>
</template>
