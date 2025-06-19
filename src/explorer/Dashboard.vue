<script setup lang="ts">
import ExplorerLayout from "@/explorer/components/ExplorerLayout.vue";
import { ref, onMounted, computed, watch } from "vue";
import { network, getNetworkIndexerApiUrl, getNetworkWalletApiUrl } from "@/state/network";
import { RouterLink, useRouter, useRoute } from "vue-router";

interface TokenHolder {
    address: string;
    balance: number;
    allowances: Record<string, any>;
}

interface ContractState {
    [key: string]: TokenHolder;
}

interface Transfer {
    id: string;
    type: string;
    status: string;
    amount: number;
    address: string;
    timestamp: number;
}

interface TransferHistory {
    account: string;
    history: Transfer[];
}

const contracts = ['vitamin', 'oranj', 'oxygen'];
const contractStates = ref<Record<string, ContractState>>({});
const loading = ref<Record<string, boolean>>({});
const error = ref<Record<string, string>>({});

// Transfer-related state
const transferHistory = ref<TransferHistory | null>(null);
const transferLoading = ref(false);
const transferError = ref('');

// Contract transaction stats
const contractTransactionStats = ref<Record<string, { total: number; unsettled: number }>>({});
const statsLoading = ref<Record<string, boolean>>({});
const statsError = ref<Record<string, string>>({});

const router = useRouter();
const route = useRoute();

// Initialize state from URL parameters or defaults
const selectedContract = ref(route.query.contract as string || 'blackjack');
const selectedToken = ref(route.query.token as string || 'oranj');
const activeTab = ref(route.query.tab as string || 'Overview');

const availableContracts = [
    { value: 'blackjack', label: 'Blackjack' },
    { value: 'board_game', label: 'Board Game' }
];

const availableTokens = [
    { value: 'oranj', label: 'Oranj (Deposits)' },
    { value: 'vitamin', label: 'Vitamin (Withdraws)' },
    { value: 'oxygen', label: 'Oxygen (Withdraws)' }
];

const fetchContractState = async (contractName: string) => {
    loading.value[contractName] = true;
    error.value[contractName] = '';
    
    try {
        const baseUrl = getNetworkIndexerApiUrl(network.value);
        const response = await fetch(`${baseUrl}/v1/indexer/contract/${contractName}/state`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        contractStates.value[contractName] = data;
    } catch (err) {
        console.error(`Error fetching ${contractName} contract state:`, err);
        error.value[contractName] = err instanceof Error ? err.message : 'Unknown error';
    } finally {
        loading.value[contractName] = false;
    }
};

const fetchContractTransactionStats = async (contractName: string) => {
    statsLoading.value[contractName] = true;
    statsError.value[contractName] = '';
    
    try {
        const baseUrl = getNetworkIndexerApiUrl(network.value);
        const response = await fetch(`${baseUrl}/v1/indexer/contract/${contractName}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const total = data.total_tx || 0;
        const unsettled = data.unsettled_tx || 0;
        
        contractTransactionStats.value[contractName] = { total, unsettled };
    } catch (err) {
        console.error(`Error fetching ${contractName} transaction stats:`, err);
        statsError.value[contractName] = err instanceof Error ? err.message : 'Unknown error';
        // Set default values on error
        contractTransactionStats.value[contractName] = { total: 0, unsettled: 0 };
    } finally {
        statsLoading.value[contractName] = false;
    }
};

const fetchBlackjackTransfers = async () => {
    transferLoading.value = true;
    transferError.value = '';
    
    try {
        const baseUrl = getNetworkWalletApiUrl(network.value);
        const response = await fetch(`${baseUrl}/v1/indexer/contract/${selectedToken.value}/history/${selectedContract.value}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        transferHistory.value = data;
    } catch (err) {
        console.error(`Error fetching ${selectedContract.value} transfers:`, err);
        transferError.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
        transferLoading.value = false;
    }
};

const sortedHolders = computed(() => {
    const result: Record<string, TokenHolder[]> = {};
    
    for (const contract of contracts) {
        const state = contractStates.value[contract];
        if (state) {
            result[contract] = Object.values(state)
                .filter(holder => holder.balance > 0 && holder.address !== 'hyli@wallet')
                .sort((a, b) => b.balance - a.balance);
        }
    }
    
    return result;
});

const totalSupply = computed(() => {
    const result: Record<string, number> = {};
    
    for (const contract of contracts) {
        const state = contractStates.value[contract];
        if (state) {
            result[contract] = Object.values(state)
                .reduce((sum, holder) => sum + holder.balance, 0);
        }
    }
    
    return result;
});

const circulatingSupply = computed(() => {
    const result: Record<string, number> = {};
    
    for (const contract of contracts) {
        const state = contractStates.value[contract];
        if (state) {
            const hyliWalletBalance = state['hyli@wallet']?.balance || 0;
            result[contract] = Object.values(state)
                .reduce((sum, holder) => sum + holder.balance, 0) - hyliWalletBalance;
        }
    }
    
    return result;
});

// Filter transfers to only show Receive (deposit) transactions for oranj, or Send (withdraw) transactions for vitamin/oxygen
const receiveTransfers = computed(() => {
    if (!transferHistory.value?.history) return [];
    const transfers = transferHistory.value.history;
    
    if (selectedToken.value === 'oranj') {
        // For oranj, show Receive transactions (deposits)
        return transfers
            .filter(transfer => transfer.type === 'Receive')
            .sort((a, b) => b.timestamp - a.timestamp);
    } else {
        // For vitamin/oxygen, show Send transactions (withdraws)
        return transfers
            .filter(transfer => transfer.type === 'Send')
            .sort((a, b) => b.timestamp - a.timestamp);
    }
});

// Update URL when state changes
const updateURL = () => {
    const query: Record<string, string> = {};
    
    if (activeTab.value !== 'Overview') {
        query.tab = activeTab.value;
    }
    
    if (selectedContract.value !== 'blackjack') {
        query.contract = selectedContract.value;
    }
    
    if (selectedToken.value !== 'oranj') {
        query.token = selectedToken.value;
    }
    
    router.replace({ 
        name: 'Dashboard', 
        query: Object.keys(query).length > 0 ? query : undefined 
    });
};

// Watch for state changes and update URL (but not immediately on mount)
let isInitialized = false;
watch([selectedContract, selectedToken, activeTab], () => {
    if (isInitialized) {
        updateURL();
    }
}, { immediate: false });

onMounted(() => {
    contracts.forEach(contract => {
        fetchContractState(contract);
        fetchContractTransactionStats(contract);
    });
    fetchBlackjackTransfers();
    
    // Mark as initialized after mount to prevent immediate URL updates
    setTimeout(() => {
        isInitialized = true;
    }, 100);
});

const formatBalance = (balance: number) => {
    return balance.toLocaleString();
};

const getContractDisplayName = (contract: string) => {
    return contract.charAt(0).toUpperCase() + contract.slice(1);
};

const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Success':
            return 'text-green-600';
        case 'Failed':
            return 'text-red-600';
        case 'Sequenced':
            return 'text-blue-600';
        case 'Timed Out':
            return 'text-yellow-600';
        default:
            return 'text-secondary';
    }
};

const handleContractChange = () => {
    // Reset token selection based on contract
    if (selectedContract.value === 'board_game') {
        selectedToken.value = 'oxygen';
    } else {
        selectedToken.value = 'oranj';
    }
    fetchBlackjackTransfers();
};

const handleTokenChange = () => {
    fetchBlackjackTransfers();
};

const handleTabChange = (tab: string) => {
    activeTab.value = tab;
};

// Get available tokens for the selected contract
const availableTokensForContract = computed(() => {
    if (selectedContract.value === 'board_game') {
        return [
            { value: 'oranj', label: 'Oranj (Deposits)' },
            { value: 'oxygen', label: 'Oxygen (Withdraws)' }
        ];
    } else {
        return [
            { value: 'oranj', label: 'Oranj (Deposits)' },
            { value: 'vitamin', label: 'Vitamin (Withdraws)' }
        ];
    }
});

const selectedTokenLabel = computed(() => {
    const token = availableTokens.find(t => t.value === selectedToken.value);
    return token ? token.label : selectedToken.value;
});
</script>

<template>
    <ExplorerLayout 
        title="Token Dashboard" 
        :tabs="[{ name: 'Overview' }, { name: 'Transfers' }]"
        :active-tab="activeTab"
        @update:active-tab="handleTabChange"
    >
        <template #default="{ activeTab }">
            <div v-if="activeTab === 'Overview'" class="space-y-6">
                <!-- Contract Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div 
                        v-for="contract in contracts" 
                        :key="contract"
                        class="data-card"
                    >
                        <div class="flex items-center justify-between mb-4">
                            <RouterLink 
                                :to="{ name: 'Contract', params: { contract_name: contract } }"
                                class="text-lg font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
                            >
                                {{ getContractDisplayName(contract) }}
                            </RouterLink>
                            <div class="flex items-center gap-2">
                                <div 
                                    v-if="loading[contract]" 
                                    class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
                                ></div>
                                <button 
                                    @click="fetchContractState(contract)"
                                    class="text-sm text-secondary hover:text-primary transition-colors"
                                    :disabled="loading[contract]"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div v-if="error[contract]" class="text-red-500 text-sm mb-4">
                            {{ error[contract] }}
                        </div>

                        <div v-if="!loading[contract] && !error[contract] && contractStates[contract]" class="space-y-4">
                            <!-- Total Supply -->
                            <div class="bg-secondary/5 rounded-lg p-4">
                                <div class="text-sm text-secondary">Total Supply</div>
                                <div class="text-2xl font-bold text-primary">
                                    {{ formatBalance(totalSupply[contract] || 0) }}
                                </div>
                            </div>

                            <!-- Circulating Supply -->
                            <div class="bg-secondary/5 rounded-lg p-4">
                                <div class="text-sm text-secondary">Circulating Supply</div>
                                <div class="text-2xl font-bold text-primary">
                                    {{ formatBalance(circulatingSupply[contract] || 0) }}
                                </div>
                            </div>

                            <!-- Holders Count -->
                            <div class="bg-secondary/5 rounded-lg p-4">
                                <div class="text-sm text-secondary">Active Holders</div>
                                <div class="text-2xl font-bold text-primary">
                                    {{ sortedHolders[contract]?.length || 0 }}
                                </div>
                            </div>

                            <!-- Transactions Stats -->
                            <div class="bg-secondary/5 rounded-lg p-4">
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <div class="text-sm text-secondary">Total Transactions</div>
                                        <div class="text-xl font-bold text-primary">
                                            {{ statsLoading[contract] ? '...' : formatBalance(contractTransactionStats[contract]?.total || 0) }}
                                        </div>
                                    </div>
                                    <div>
                                        <div class="text-sm text-secondary">Total Unsettled</div>
                                        <div class="text-xl font-bold text-primary">
                                            {{ statsLoading[contract] ? '...' : formatBalance(contractTransactionStats[contract]?.unsettled || 0) }}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Top Holders -->
                            <div v-if="sortedHolders[contract] && sortedHolders[contract].length > 0">
                                <h4 class="text-sm font-medium text-secondary mb-3">Top Holders</h4>
                                <div class="space-y-2">
                                    <div 
                                        v-for="(holder, index) in sortedHolders[contract].slice(0, 10)" 
                                        :key="holder.address"
                                        class="flex items-center justify-between p-2 bg-secondary/5 rounded-lg"
                                    >
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-secondary w-4">{{ index + 1 }}</span>
                                            <RouterLink 
                                                :to="{ name: 'Address', params: { address: holder.address } }"
                                                class="text-sm text-mono truncate max-w-32 text-primary hover:text-primary/80 hover:underline transition-colors"
                                            >
                                                {{ holder.address }}
                                            </RouterLink>
                                        </div>
                                        <span class="text-sm font-medium text-primary">
                                            {{ formatBalance(holder.balance) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-else-if="loading[contract]" class="flex items-center justify-center py-8">
                            <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Holders Table -->
                <div class="data-card">
                    <h3 class="card-header mb-6">All Token Holders</h3>
                    
                    <div class="space-y-6">
                        <div 
                            v-for="contract in contracts" 
                            :key="contract"
                            class="space-y-4"
                        >
                            <div class="flex items-center justify-between">
                                <h4 class="text-lg font-semibold text-primary">
                                    {{ getContractDisplayName(contract) }} Holders
                                </h4>
                                <span class="text-sm text-secondary">
                                    {{ sortedHolders[contract]?.length || 0 }} holders
                                </span>
                            </div>

                            <div v-if="error[contract]" class="text-red-500 text-sm">
                                {{ error[contract] }}
                            </div>

                            <div v-else-if="loading[contract]" class="flex items-center justify-center py-8">
                                <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>

                            <div v-else-if="sortedHolders[contract] && sortedHolders[contract].length > 0" class="overflow-x-auto">
                                <table class="w-full">
                                    <thead>
                                        <tr class="border-b border-secondary/10">
                                            <th class="text-left py-3 px-4 text-sm font-medium text-secondary">Rank</th>
                                            <th class="text-left py-3 px-4 text-sm font-medium text-secondary">Address</th>
                                            <th class="text-right py-3 px-4 text-sm font-medium text-secondary">Balance</th>
                                            <th class="text-right py-3 px-4 text-sm font-medium text-secondary">Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr 
                                            v-for="(holder, index) in sortedHolders[contract]" 
                                            :key="holder.address"
                                            class="border-b border-secondary/5 hover:bg-secondary/5 transition-colors"
                                        >
                                            <td class="py-3 px-4 text-sm text-secondary">#{{ index + 1 }}</td>
                                            <td class="py-3 px-4">
                                                <RouterLink 
                                                    :to="{ name: 'Address', params: { address: holder.address } }"
                                                    class="text-sm text-mono font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                                                >
                                                    {{ holder.address }}
                                                </RouterLink>
                                            </td>
                                            <td class="py-3 px-4 text-right">
                                                <span class="text-sm font-medium text-primary">
                                                    {{ formatBalance(holder.balance) }}
                                                </span>
                                            </td>
                                            <td class="py-3 px-4 text-right">
                                                <span class="text-sm text-secondary">
                                                    {{ circulatingSupply[contract] ? ((holder.balance / circulatingSupply[contract]) * 100).toFixed(2) : '0' }}%
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div v-else class="text-center py-8 text-secondary">
                                No holders found
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Transfers Tab -->
            <div v-else-if="activeTab === 'Transfers'" class="space-y-6">
                <div class="data-card">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-4">
                            <h3 class="card-header">{{ getContractDisplayName(selectedContract) }} Contract Transfers ({{ selectedTokenLabel }})</h3>
                            
                            <!-- Contract Selection Buttons -->
                            <div class="flex gap-2">
                                <button 
                                    v-for="contract in availableContracts" 
                                    :key="contract.value"
                                    @click="selectedContract = contract.value; handleContractChange()"
                                    :class="[
                                        'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                                        selectedContract === contract.value
                                            ? 'bg-primary text-white'
                                            : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                                    ]"
                                >
                                    {{ contract.label }}
                                </button>
                            </div>

                            <!-- Token Selection Buttons -->
                            <div class="flex gap-2">
                                <button 
                                    v-for="token in availableTokensForContract" 
                                    :key="token.value"
                                    @click="selectedToken = token.value; handleTokenChange()"
                                    :class="[
                                        'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                                        selectedToken === token.value
                                            ? 'bg-primary text-white'
                                            : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                                    ]"
                                >
                                    {{ token.label }}
                                </button>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <div 
                                v-if="transferLoading" 
                                class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
                            ></div>
                            <button 
                                @click="fetchBlackjackTransfers"
                                class="text-sm text-secondary hover:text-primary transition-colors"
                                :disabled="transferLoading"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div v-if="transferError" class="text-red-500 text-sm mb-4">
                        {{ transferError }}
                    </div>

                    <div v-else-if="transferLoading" class="flex items-center justify-center py-8">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>

                    <div v-else-if="receiveTransfers.length > 0" class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b border-secondary/10">
                                    <th class="text-left py-3 px-4 text-sm font-medium text-secondary">Transaction ID</th>
                                    <th class="text-left py-3 px-4 text-sm font-medium text-secondary">From Address</th>
                                    <th class="text-right py-3 px-4 text-sm font-medium text-secondary">Amount</th>
                                    <th class="text-center py-3 px-4 text-sm font-medium text-secondary">Status</th>
                                    <th class="text-right py-3 px-4 text-sm font-medium text-secondary">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr 
                                    v-for="transfer in receiveTransfers" 
                                    :key="transfer.id"
                                    class="border-b border-secondary/5 hover:bg-secondary/5 transition-colors"
                                >
                                    <td class="py-3 px-4">
                                        <RouterLink 
                                            :to="{ name: 'Transaction', params: { tx_hash: transfer.id } }"
                                            class="text-sm text-mono font-medium truncate max-w-32 block text-primary hover:text-primary/80 hover:underline transition-colors"
                                        >
                                            {{ transfer.id }}
                                        </RouterLink>
                                    </td>
                                    <td class="py-3 px-4">
                                        <RouterLink 
                                            :to="{ name: 'Address', params: { address: transfer.address } }"
                                            class="text-sm text-mono font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                                        >
                                            {{ transfer.address }}
                                        </RouterLink>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <span class="text-sm font-medium text-primary">
                                            {{ formatBalance(transfer.amount) }}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-center">
                                        <span class="text-sm font-medium" :class="getStatusColor(transfer.status)">
                                            {{ transfer.status }}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <span class="text-sm text-secondary">
                                            {{ formatTimestamp(transfer.timestamp) }}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-else class="text-center py-8 text-secondary">
                        No transfer history found
                    </div>
                </div>
            </div>
        </template>
    </ExplorerLayout>
</template>

<style scoped>
.data-card {
    @apply bg-white rounded-lg border border-secondary/10 p-6 shadow-sm;
}

.card-header {
    @apply text-lg font-semibold text-primary;
}
</style> 