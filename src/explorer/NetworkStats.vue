<script setup lang="ts">
import Header from "@/explorer/Header.vue";
import { blockStore, contractStore, transactionStore, proofStore } from "@/state/data";
import { getNetworkNodeApiUrl, getNetworkIndexerApiUrl, getNetworkWebSocketUrl, network } from "@/state/network";
import { onMounted, ref, computed, onUnmounted } from "vue";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import NetworkChart from "@/explorer/components/NetworkChart.vue";
import WorldMap3D from "@/explorer/components/WorldMap3D.vue";
import { getTimeAgo, formatVerifierName } from "@/state/utils";
import { WebSocketService } from "@/services/websocket";

const wsService = ref<WebSocketService | null>(null);

const stats = ref<null | {
    total_transactions: number;
    txs_last_day: number;
    total_contracts: number;
    contracts_last_day: number;
    graph_tx_volume: [number, number][];
    graph_block_time: [number, number][];
    peak_txs: [number, number];
}>(null);

const proofStats = ref<null | Array<{ verifier: string; proof_count: number }>>(null);

const consensusInfo = ref<null | { validators: string[] }>(null);
const stakingState = ref<null | {
    stakes: Record<string, number>;
    delegations: Record<string, string[]>;
    fees: {
        balances: Record<string, { balance: number; cumul_size: number }>;
    };
    total_bond: number;
}>(null);

// Validator clusters data
const validatorClusters: Array<{
    name: string;
    validators: string[];
    color: string;
    coordinates: [number, number];
    connections?: string[]; // Names of clusters to connect to
}> = [
    {
        name: "Europe",
        validators: [
            "afcb54d85af4d126b4a389f42747280b84fa3955fb94238d7839ba41fb96cbe6ae836d9954df37ef1a70f16e7c0a0e2d", // Node0
            "8630e21f519b16f7e9665046fb5851aaf29274d9dd8579898b86173b1a61b1db6f1a761bba9601d2bcd30991b916188b", // Node1
        ],
        color: "#4CAF50",
        coordinates: [48.8566, 2.3522] as [number, number], // Paris
        connections: ["North America", "South America", "Australia"],
    },
    {
        name: "North America",
        validators: [
            "a1c1a63c0b72648680402aa5c378922dab31a71068a50c9272b9edee1766c615c20e9bf01a79ca70b72db885b640d1f3", // Node4
            "82d0d3bc82a052c2b19ced45424c1ef6c2626d391f62243b4aecac24368082f31f36b0f691da45c38ff3f16152934f51", // Node5
        ],
        color: "#2196F3",
        coordinates: [40.7128, -74.006] as [number, number], // New York
        connections: ["South America", "Australia"],
    },
    {
        name: "Australia",
        validators: [
            "8ab1638012828de2fb821761ccdb36a84b7da6184d87241518ef2c56778b5e85d54f9a8f50ddfb89bcef69a0a5484603", // Node6
            "990d2627844d557cb11f2a3d9e2836826687ea7bef848496a2eefbd98b9e2ea52d39d30a1a12f06a977fb3f0ffb604b8", // Node7
        ],
        color: "#FF9800",
        coordinates: [-33.8688, 151.2093] as [number, number], // Sydney
        connections: ["Europe", "South America"],
    },
    {
        name: "South America",
        validators: [
            "afac1e7cf451ee4659a2b12822acfb54a8aaabb9acd0db917974838ffa7c8da9eb6a856df16a336c772247dc06f2f86e", // Node2
            "a72c202664eaa2c712e5e7eb2cf2b2f98f05e813145a3ce2e8008d82e4ee5a6a765e7a582f92b02965855ad446ea4ccc", // Node3
        ],
        color: "#FF9800",
        coordinates: [-19.9167, -43.9333] as [number, number], // Rio de Janeiro
        connections: ["North America", "Europe"],
    },
];

// Format number to human readable format (e.g., 100k, 1.2M)
const formatNumber = (num: number): string => {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(0).toLocaleString() + "M";
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(0).toLocaleString() + "k";
    }
    return num.toLocaleString();
};

// Compute total delegations for each validator
const validatorDelegations = computed(() => {
    if (!stakingState.value) return {};

    const delegations: Record<string, number> = {};
    Object.entries(stakingState.value.delegations).forEach(([validator, validators]) => {
        validators.forEach((delegator) => {
            if (!delegations[validator]) {
                delegations[validator] = 0;
            }
            delegations[validator] += stakingState.value?.stakes[delegator] || 0;
        });
    });
    return delegations;
});

const fetchConsensusInfo = async () => {
    const response = await fetch(getNetworkNodeApiUrl(network.value) + `/v1/consensus/info?no_cache=${Date.now()}`);
    consensusInfo.value = await response.json();
};

const fetchStakingState = async () => {
    const response = await fetch(getNetworkNodeApiUrl(network.value) + `/v1/consensus/staking_state?no_cache=${Date.now()}`);
    stakingState.value = await response.json();
};

const fetchStats = async () => {
    const response = await fetch(getNetworkIndexerApiUrl(network.value) + `/v1/indexer/stats?no_cache=${Date.now()}`);
    stats.value = await response.json();
};

const fetchProofStats = async () => {
    const response = await fetch(getNetworkIndexerApiUrl(network.value) + `/v1/indexer/stats/proofs?no_cache=${Date.now()}`);
    proofStats.value = await response.json();
};

onMounted(() => {
    fetchConsensusInfo();
    fetchStats();
    fetchProofStats();
    fetchStakingState();
    wsService.value = new WebSocketService(getNetworkWebSocketUrl(network.value) + "/ws");
    wsService.value.connect();
});

onUnmounted(() => {
    if (wsService.value) {
        wsService.value.disconnect();
    }
});

// Compute average block time from the latest blocks
const averageBlockTime = computed(() => {
    if (blockStore.value.latest.length < 2) return 0.5; // Default value if not enough blocks

    let totalTime = 0;
    let count = 0;

    // Calculate time differences between consecutive blocks
    for (let i = 0; i < blockStore.value.latest.length - 1; i++) {
        const currentBlock = blockStore.value.data[blockStore.value.latest[i]];
        const nextBlock = blockStore.value.data[blockStore.value.latest[i + 1]];

        if (currentBlock && nextBlock) {
            const timeDiff = new Date(currentBlock.timestamp).getTime() - new Date(nextBlock.timestamp).getTime();
            totalTime += timeDiff / 1000; // Convert to seconds
            count++;
        }
    }

    return count > 0 ? (totalTime / count).toFixed(2) : 0.5;
});

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Update transaction chart data with real data
const transactionChartData = computed(() => ({
    labels:
        stats.value?.graph_tx_volume.map(([timestamp]) => {
            const date = new Date(timestamp * 1000);
            return getTimeAgo(date.toISOString());
        }) || [],
    datasets: [
        {
            label: "Transactions per Hour",
            data: stats.value?.graph_tx_volume.map(([_, value]) => value) || [],
            fill: true,
            borderColor: "#DF6445",
            backgroundColor: "rgba(223, 100, 69, 0.1)",
            tension: 0.4,
        },
    ],
}));

// Update block time chart data with real data
const blockTimeChartData = computed(() => ({
    labels:
        stats.value?.graph_block_time.map(([timestamp]) => {
            const date = new Date(timestamp * 1000);
            return getTimeAgo(date.toISOString());
        }) || [],
    datasets: [
        {
            label: "Block Time (seconds)",
            data: stats.value?.graph_block_time.map(([_, value]) => value) || [],
            fill: true,
            borderColor: "#DF6445",
            backgroundColor: "rgba(223, 100, 69, 0.1)",
            tension: 0.4,
        },
    ],
}));

const worldMapRef = ref<InstanceType<typeof WorldMap3D> | null>(null);

const handleValidatorHover = (validator: string) => {
    worldMapRef.value?.rotateToValidator(validator);
};

const handleValidatorLeave = () => {
    worldMapRef.value?.startRotating();
};
</script>

<template>
    <div class="min-h-screen bg-background">
        <Header />
        <div class="container mx-auto px-4 py-12">
            <div class="mb-12 max-w-4xl mx-auto">
                <h1 class="text-4xl font-display text-primary mb-3">Network Statistics</h1>
                <p class="text-neutral text-lg mb-8">Detailed statistics and metrics about the Hyli network</p>
            </div>

            <main class="container mx-auto px-4 py-6">
                <!-- Network Overview -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                        <div class="flex items-center gap-3 mb-2">
                            <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <h3 class="text-sm font-medium text-neutral uppercase">Total Transactions</h3>
                        </div>
                        <p class="text-3xl font-display text-primary mb-2">
                            {{ stats?.total_transactions || transactionStore.latest.length }}
                        </p>
                        <div class="grid grid-cols-2 gap-2 text-xs text-neutral">
                            <div>
                                24H Tx: <span class="text-secondary">{{ stats?.txs_last_day || "0" }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                        <div class="flex items-center gap-3 mb-2">
                            <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                            <h3 class="text-sm font-medium text-neutral uppercase">Smart Contracts</h3>
                        </div>
                        <p class="text-3xl font-display text-primary mb-2">
                            {{ stats?.total_contracts || Object.keys(contractStore.data).length }}
                        </p>
                        <div class="grid grid-cols-2 gap-2 text-xs text-neutral">
                            <div>
                                24H New: <span class="text-secondary">{{ stats?.contracts_last_day || "0" }}</span>
                            </div>
                            <div>
                                Active: <span class="text-secondary">{{ stats?.total_contracts || "0" }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20">
                        <div class="flex items-center gap-3 mb-2">
                            <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            <h3 class="text-sm font-medium text-neutral uppercase">Network</h3>
                        </div>
                        <p class="text-3xl font-display text-primary capitalize mb-2">{{ network }}</p>
                        <div class="grid grid-cols-2 gap-2 text-xs text-neutral">
                            <div>
                                Validators: <span class="text-secondary">{{ consensusInfo?.validators?.length || 1 }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <NetworkChart :data="transactionChartData" title="Transaction Volume" />
                    <NetworkChart :data="blockTimeChartData" title="Average Block Time" />
                </div>

                <!-- Proof Statistics -->
                <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20 mb-8">
                    <h2 class="text-lg font-medium text-primary mb-4">Proof Statistics</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div v-for="stat in proofStats" :key="stat.verifier" class="bg-secondary/5 rounded-xl p-4">
                            <h3 class="text-sm font-medium text-neutral mb-2">{{ formatVerifierName(stat.verifier) }}</h3>
                            <p class="text-2xl font-display text-primary">{{ stat.proof_count }}</p>
                        </div>
                        <div v-if="!proofStats" class="text-sm text-neutral">Loading...</div>
                    </div>
                </div>

                <!-- Network Decentralization -->
                <div
                    v-if="network === 'testnet'"
                    class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20 mb-8"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <h2 class="text-lg font-medium text-primary">Network Decentralization</h2>
                    </div>
                    <div class="space-y-6">
                        <p class="text-neutral">
                            The network is distributed across multiple geographical regions to ensure high availability and resilience.
                        </p>

                        <!-- 3D World Map -->
                        <WorldMap3D ref="worldMapRef" :clusters="validatorClusters" />
                    </div>
                </div>

                <!-- Staking State -->
                <div
                    v-if="network === 'testnet'"
                    class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-white/20 mb-8"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <h2 class="text-lg font-medium text-primary">Staking State</h2>
                    </div>
                    <div v-if="stakingState" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-secondary/5 rounded-lg p-4">
                                <div class="text-sm text-neutral mb-1">Total Bonded</div>
                                <div class="text-2xl font-display text-primary">{{ formatNumber(stakingState.total_bond) }}</div>
                            </div>
                            <div class="bg-secondary/5 rounded-lg p-4">
                                <div class="text-sm text-neutral mb-1">Total Stakes</div>
                                <div class="text-2xl font-display text-primary">{{ Object.keys(stakingState.stakes).length }}</div>
                            </div>
                            <div class="bg-secondary/5 rounded-lg p-4">
                                <div class="text-sm text-neutral mb-1">Dissemination fees</div>
                                <div class="text-2xl font-display text-primary">1 HYL / Byte</div>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div class="text-sm text-neutral">Validator Balances & Data Dissemination</div>
                            <div class="space-y-6">
                                <div v-for="cluster in validatorClusters" :key="cluster.name" class="space-y-3">
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: cluster.color }"></div>
                                        <h3 class="text-lg font-medium text-primary">{{ cluster.name }}</h3>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div
                                            v-for="validator in cluster.validators"
                                            :key="validator"
                                            class="bg-secondary/5 rounded-lg p-4"
                                            @mouseenter="handleValidatorHover(validator)"
                                            @mouseleave="handleValidatorLeave()"
                                        >
                                            <div class="flex items-center justify-between mb-2">
                                                <div class="text-sm font-mono text-neutral truncate max-w-[200px]">
                                                    {{ validator.slice(0, 10) }}...{{ validator.slice(-6) }}
                                                </div>
                                                <div class="text-sm text-primary">
                                                    Disseminated: {{ (stakingState?.fees.balances[validator]?.cumul_size / 1024 / 1024).toFixed(2) || 0 }} MB
                                                </div>
                                            </div>
                                            <div class="w-full bg-white/20 rounded-full h-2 mb-2">
                                                <div
                                                    class="bg-primary h-2 rounded-full transition-all duration-300"
                                                    :style="{
                                                        width: `${(stakingState?.fees.balances[validator]?.balance / Math.max(...Object.values(stakingState?.fees.balances || {}).map((b) => b.balance))) * 100}%`,
                                                    }"
                                                ></div>
                                            </div>
                                            <div class="grid grid-cols-2 gap-2 text-sm text-neutral">
                                                <div>
                                                    Balance: <span class="text-secondary">{{ formatNumber(stakingState?.fees.balances[validator]?.balance || 0) }} HYL</span>
                                                </div>
                                                <div>
                                                    Delegated:
                                                    <span class="text-secondary">{{ formatNumber(validatorDelegations[validator] || 0) }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-sm text-neutral">Loading staking data...</div>
                </div>
            </main>
        </div>
    </div>
</template>

