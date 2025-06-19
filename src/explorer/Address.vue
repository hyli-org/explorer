<script setup lang="ts">
import ExplorerLayout from "@/explorer/components/ExplorerLayout.vue";
import CopyButton from "@/components/CopyButton.vue";
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { network, getNetworkIndexerApiUrl, getNetworkWalletApiUrl } from "@/state/network";
import { getTimeAgo } from "@/state/utils";

interface TokenBalance {
    contract: string;
    balance: number;
    allowances?: Record<string, any>;
}

interface Transfer {
    id: string;
    type: string;
    status: string;
    amount: number;
    address: string;
    timestamp: number;
    contract?: string;
}

interface AddressData {
    address: string;
    balances: TokenBalance[];
    transfers: Transfer[];
}

const route = useRoute();
const router = useRouter();
const rawAddress = computed(() => route.params.address as string);

// Clean address by removing @faucet if it ends with @wallet@faucet
const address = computed(() => {
    const addr = rawAddress.value;
    if (addr && addr.endsWith('@wallet@faucet')) {
        return addr.replace('@faucet', '');
    }
    return addr;
});

// State management
const addressData = ref<AddressData | null>(null);
const loading = ref(false);
const error = ref('');

// Contract selection
const availableContracts = [
    { value: 'oranj', label: 'Oranj' },
    { value: 'vitamin', label: 'Vitamin' },
    { value: 'oxygen', label: 'Oxygen' }
];

const selectedContracts = ref<string[]>(route.query.contracts ? (route.query.contracts as string).split(',') : ['oranj', 'vitamin', 'oxygen']);

// Initialize from URL or defaults
const initializeFromURL = () => {
    if (route.query.contracts) {
        selectedContracts.value = (route.query.contracts as string).split(',');
    }
};

const fetchAddressData = async () => {
    if (!address.value) return;
    
    loading.value = true;
    error.value = '';
    
    try {
        // Fetch balances for selected contracts
        const balances: TokenBalance[] = [];
        for (const contract of selectedContracts.value) {
            try {
                const baseUrl = getNetworkIndexerApiUrl(network.value);
                const response = await fetch(`${baseUrl}/v1/indexer/contract/${contract}/state?no_cache=${Date.now()}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const holderData = data[address.value];
                    if (holderData) {
                        balances.push({
                            contract,
                            balance: holderData.balance,
                            allowances: holderData.allowances
                        });
                    } else {
                        balances.push({
                            contract,
                            balance: 0
                        });
                    }
                }
            } catch (err) {
                console.error(`Error fetching ${contract} balance:`, err);
                balances.push({
                    contract,
                    balance: 0
                });
            }
        }

        // Fetch transfer history for selected contracts
        const transfers: Transfer[] = [];
        for (const contract of selectedContracts.value) {
            try {
                const baseUrl = getNetworkWalletApiUrl(network.value);
                const response = await fetch(`${baseUrl}/v1/indexer/contract/${contract}/history/${address.value}?no_cache=${Date.now()}`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.history) {
                        const contractTransfers = data.history.map((transfer: Transfer) => ({
                            ...transfer,
                            contract
                        }));
                        transfers.push(...contractTransfers);
                    }
                }
            } catch (err) {
                console.error(`Error fetching ${contract} transfers:`, err);
            }
        }

        // Sort transfers by timestamp (newest first)
        transfers.sort((a, b) => b.timestamp - a.timestamp);

        addressData.value = {
            address: address.value,
            balances,
            transfers
        };
    } catch (err) {
        console.error('Error fetching address data:', err);
        error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
        loading.value = false;
    }
};

// Update URL when state changes
const updateURL = () => {
    const query: Record<string, string> = {};
    
    if (selectedContracts.value.length !== 3 || !selectedContracts.value.includes('oranj') || !selectedContracts.value.includes('vitamin') || !selectedContracts.value.includes('oxygen')) {
        query.contracts = selectedContracts.value.join(',');
    }
    
    router.replace({ 
        name: 'Address', 
        params: { address: address.value },
        query: Object.keys(query).length > 0 ? query : undefined 
    });
};

// Watch for changes and update URL
let isInitialized = false;
watch([selectedContracts], () => {
    if (isInitialized) {
        updateURL();
        fetchAddressData();
    }
}, { immediate: false });

const toggleContract = (contract: string) => {
    const index = selectedContracts.value.indexOf(contract);
    if (index > -1) {
        selectedContracts.value.splice(index, 1);
    } else {
        selectedContracts.value.push(contract);
    }
};

const formatBalance = (balance: number) => {
    return balance.toLocaleString();
};

const formatTimestamp = (timestamp: number) => {
    return `${getTimeAgo(timestamp)} (${new Date(timestamp).toLocaleString()})`;
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

const getTransferTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
        case 'receive':
            return 'text-green-600';
        case 'send':
            return 'text-red-600';
        default:
            return 'text-secondary';
    }
};

const getContractDisplayName = (contract: string) => {
    return contract.charAt(0).toUpperCase() + contract.slice(1);
};

// Filter transfers by selected contracts
const filteredTransfers = computed(() => {
    if (!addressData.value?.transfers) return [];
    return addressData.value.transfers.filter(transfer => 
        selectedContracts.value.includes(transfer.contract || '')
    );
});

// Total balance across all selected contracts
const totalBalance = computed(() => {
    if (!addressData.value?.balances) return 0;
    return addressData.value.balances.reduce((sum, balance) => sum + balance.balance, 0);
});

// Initialize
onMounted(() => {
    initializeFromURL();
    fetchAddressData();
    
    // Mark as initialized after mount
    setTimeout(() => {
        isInitialized = true;
    }, 100);
});

// Watch for address changes
watch(() => rawAddress.value, () => {
    if (rawAddress.value) {
        // If the raw address ends with @wallet@faucet, redirect to the cleaned version
        if (rawAddress.value.endsWith('@wallet@faucet')) {
            const cleanedAddress = rawAddress.value.replace('@faucet', '');
            router.replace({ 
                name: 'Address', 
                params: { address: cleanedAddress },
                query: route.query
            });
            return;
        }
        fetchAddressData();
    }
}, { immediate: true });
</script>

<template>
    <ExplorerLayout 
        title="Address Details" 
    >
        <template #default>
            <div class="space-y-6">
                <!-- Address Header -->
                <div class="data-card">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold text-primary">Address</h2>
                        <CopyButton :text="address" />
                    </div>
                    <div class="text-mono text-sm break-all">{{ address }}</div>
                </div>

                <!-- Loading State -->
                <div v-if="loading" class="data-card">
                    <div class="flex items-center justify-center py-8">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>

                <!-- Error State -->
                <div v-else-if="error" class="data-card">
                    <div class="text-red-500 text-center py-4">
                        {{ error }}
                    </div>
                </div>

                <!-- Data Display -->
                <div v-else-if="addressData" class="space-y-6">
                    <!-- Total Balance -->
                    <div class="data-card">
                        <h3 class="card-header mb-4">Total Balance</h3>
                        <div class="text-3xl font-bold text-primary">
                            {{ formatBalance(totalBalance) }}
                        </div>
                    </div>

                    <!-- Individual Contract Balances -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div 
                            v-for="balance in addressData.balances" 
                            :key="balance.contract"
                            class="data-card"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <h4 class="text-lg font-semibold text-primary">
                                    {{ getContractDisplayName(balance.contract) }}
                                </h4>
                                <RouterLink 
                                    :to="{ name: 'Contract', params: { contract_name: balance.contract } }"
                                    class="text-sm text-link hover:underline"
                                >
                                    View Contract
                                </RouterLink>
                            </div>
                            <div class="text-2xl font-bold text-primary mb-2">
                                {{ formatBalance(balance.balance) }}
                            </div>
                            <div class="text-sm text-secondary">
                                {{ balance.balance > 0 ? '' : 'No Balance' }}
                            </div>
                        </div>
                    </div>

                    <!-- Transfer History -->
                    <div class="data-card">
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="card-header">Transfer History</h3>
                            <div class="text-sm text-secondary">
                                {{ filteredTransfers.length }} transfers
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2 mb-4">
                            <button 
                                v-for="contract in availableContracts" 
                                :key="contract.value"
                                @click="toggleContract(contract.value)"
                                :class="[
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                    selectedContracts.includes(contract.value)
                                        ? 'bg-primary text-white'
                                        : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                                ]"
                            >
                                {{ contract.label }}
                            </button>
                        </div>

                        <!-- Transfers Table -->
                        <div v-if="filteredTransfers.length > 0" class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b border-secondary/10">
                                        <th class="text-left py-3 px-4 text-sm font-medium text-secondary">Type</th>
                                        <th class="text-left py-3 px-4 text-sm font-medium text-secondary">Contract</th>
                                        <th class="text-left py-3 px-4 text-sm font-medium text-secondary">Amount</th>
                                        <th class="text-left py-3 px-4 text-sm font-medium text-secondary">Status</th>
                                        <th class="text-left py-3 px-4 text-sm font-medium text-secondary">Date</th>
                                        <th class="text-left py-3 px-4 text-sm font-medium text-secondary">Transaction</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr 
                                        v-for="transfer in filteredTransfers" 
                                        :key="transfer.id"
                                        @click="router.push({ name: 'Transaction', params: { tx_hash: transfer.id } })"
                                        class="border-b border-secondary/5 hover:bg-secondary/5 transition-colors cursor-pointer"
                                    >
                                        <td class="py-3 px-4">
                                            <span class="text-sm font-medium" :class="getTransferTypeColor(transfer.type)">
                                                {{ transfer.type }}
                                            </span>
                                        </td>
                                        <td class="py-3 px-4">
                                            <span class="text-sm font-medium text-primary">
                                                {{ getContractDisplayName(transfer.contract || '') }}
                                            </span>
                                        </td>
                                        <td class="py-3 px-4">
                                            <span class="text-sm font-medium text-primary">
                                                {{ formatBalance(transfer.amount) }}
                                            </span>
                                        </td>
                                        <td class="py-3 px-4">
                                            <span class="text-sm font-medium" :class="getStatusColor(transfer.status)">
                                                {{ transfer.status }}
                                            </span>
                                        </td>
                                        <td class="py-3 px-4">
                                            <span class="text-sm text-secondary">
                                                {{ formatTimestamp(transfer.timestamp) }}
                                            </span>
                                        </td>
                                        <td class="py-3 px-4">
                                            <span class="text-sm text-mono font-medium truncate max-w-32 block text-primary">
                                                {{ transfer.id }}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Empty State -->
                        <div v-else class="text-center py-8 text-secondary">
                            No transfers found for the selected contracts
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </ExplorerLayout>
</template> 