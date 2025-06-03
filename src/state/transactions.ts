import { getNetworkIndexerApiUrl } from "@/state/network";

export type HyleOutput = {
    blobs: number[];
    identity: string;
    index: number;
    initial_state: number[];
    next_state: number[];
    onchain_effects: any[];
    program_outputs: number[];
    success: boolean;
    tx_ctx: any;
    tx_hash: string;
    version: number;
};

export type BlobInfo = {
    contract_name: string;
    data: string;
    proof_outputs: HyleOutput[];
};

export type EventInfo = {
    name: string;
    block_hash: string;
    metadata?: Record<string, any>;
};

export type TransactionInfo = {
    tx_hash: string;
    block_hash: string;
    transaction_type: string;
    transaction_status: string | "Success";
    parent_dp_hash: string;
    timestamp: number;
    index?: number;
    identity?: string;
    blobs?: BlobInfo[];
    events?: EventInfo[];
};

export class TransactionStore {
    network: string;
    data: Record<string, TransactionInfo> = {};
    latest: string[] = [];
    transactionsByBlock: Record<string, string[]> = {};
    transactionsByContract: Record<string, string[]> = {};

    constructor(network: string) {
        this.network = network;
    }

    private updateTransactionsByBlock(transaction: TransactionInfo) {
        if (transaction.block_hash) {
            if (!this.transactionsByBlock[transaction.block_hash]) {
                this.transactionsByBlock[transaction.block_hash] = [];
            }
            if (!this.transactionsByBlock[transaction.block_hash].includes(transaction.tx_hash)) {
                this.transactionsByBlock[transaction.block_hash].push(transaction.tx_hash);
            }
        }
    }

    private updateTransactionsByContract(transaction: TransactionInfo) {
        if (transaction.blobs) {
            for (const blob of transaction.blobs) {
                if (blob.contract_name) {
                    if (!this.transactionsByContract[blob.contract_name]) {
                        this.transactionsByContract[blob.contract_name] = [];
                    }
                    if (!this.transactionsByContract[blob.contract_name].includes(transaction.tx_hash)) {
                        this.transactionsByContract[blob.contract_name].push(transaction.tx_hash);
                    }
                }
            }
        }
    }

    async loadLatest() {
        const response = await fetch(`${getNetworkIndexerApiUrl(this.network)}/v1/indexer/transactions?no_cache=${Date.now()}`);
        let resp = await response.json();
        this.latest = resp.map((tx: TransactionInfo) => tx.tx_hash);
        for (let item of resp) {
            this.data[item.tx_hash] = item;
            this.updateTransactionsByBlock(item);
        }
    }

    private async loadBlobsAndEvents(tx: TransactionInfo) {
        // Load blobs
        const blobsResponse = await fetch(
            `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/blobs/hash/${tx.tx_hash}?no_cache=${Date.now()}`,
        );
        const blobs = await blobsResponse.json();
        tx.blobs = blobs;

        // Load events if we have a block hash
        if (tx.block_hash) {
            const eventsResponse = await fetch(
                `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/transaction/hash/${tx.tx_hash}/events?no_cache=${Date.now()}`,
            );
            const eventsData = await eventsResponse.json();
            // Preserve block_hash and other metadata when flattening events
            tx.events = eventsData.flatMap((eventEntry: { block_hash: string; events: Omit<EventInfo, "block_hash">[] }) =>
                (eventEntry.events || []).map((event) => ({
                    ...event,
                    block_hash: eventEntry.block_hash,
                })),
            );
        }
    }

    async load(tx_hash: string) {
        let item: TransactionInfo;

        if (tx_hash in this.data) {
            item = this.data[tx_hash];
        } else {
            try {
                const response = await fetch(
                    `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/transaction/hash/${tx_hash}?no_cache=${Date.now()}`,
                );
                item = await response.json();
                this.data[item.tx_hash] = item;
                this.updateTransactionsByBlock(item);
            } catch (error) {
                return;
            }
        }

        // Load blobs and events if they are not already loaded
        if (!item.blobs) {
            await this.loadBlobsAndEvents(item);
            // Update the store with the new data
            this.data[item.tx_hash] = { ...item };
            this.updateTransactionsByContract(item);
        }
    }

    handleNewTx(tx: TransactionInfo) {
        this.data[tx.tx_hash] = tx;
        this.latest.unshift(tx.tx_hash);
        this.updateTransactionsByBlock(tx);
        this.updateTransactionsByContract(tx);
    }

    async getTransactionsByBlockHeight(height: number): Promise<string[]> {
        const response = await fetch(
            `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/transactions/block/${height}?no_cache=${Date.now()}`,
        );
        const transactions = await response.json();
        const txHashes = transactions.map((tx: TransactionInfo) => tx.tx_hash);

        // Cache the transactions data and update transactionsByBlock
        for (const tx of transactions) {
            await this.loadBlobsAndEvents(tx);
            this.data[tx.tx_hash] = tx;
            this.updateTransactionsByBlock(tx);
            this.updateTransactionsByContract(tx);
        }

        return txHashes;
    }

    async getTransactionsByBlockHash(blockHash: string, height: number): Promise<string[]> {
        if (this.transactionsByBlock[blockHash]) {
            return this.transactionsByBlock[blockHash];
        }

        const txHashes = await this.getTransactionsByBlockHeight(height);
        return txHashes;
    }

    async getTransactionsByContract(contractName: string): Promise<string[]> {
        // Fetch transactions for this contract from the API
        const response = await fetch(
            `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/transactions/contract/${contractName}?nb_results=100&no_cache=${Date.now()}`,
        );
        const transactions = await response.json();
        const txHashes = transactions.map((tx: TransactionInfo) => tx.tx_hash);

        // Cache the transactions data and update transactionsByContract
        for (const tx of transactions) {
            this.data[tx.tx_hash] = tx;
            this.updateTransactionsByContract(tx);
        }

        return txHashes;
    }

    async getPaginatedTransactions(
        startBlock: number,
        pageSize: number,
    ): Promise<{ transactions: TransactionInfo[]; lastBlock: number | null }> {
        const response = await fetch(
            `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/transactions?start_block=${startBlock}&nb_results=${pageSize}&no_cache=${Date.now()}`,
        );
        const transactions = await response.json();
        for (const tx of transactions) {
            this.data[tx.tx_hash] = tx;
            this.updateTransactionsByBlock(tx);
            this.updateTransactionsByContract(tx);
        }
        const lastBlock = transactions.length > 0 ? transactions[transactions.length - 1].block_hash : null;
        return { transactions, lastBlock };
    }
}
