import { getNetworkIndexerApiUrl } from "@/state/network";

export type HyliOutput = {
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
    proof_outputs: HyliOutput[];
};

export type EventInfo = {
    name: string;
    block_hash: string;
    block_height: number;
    index: number;
    metadata?: any;
    raw?: any;
};

export type TransactionInfo = {
    tx_hash: string;
    block_hash: string;
    block_height: number;
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

    private compareTransactions(txA?: TransactionInfo, txB?: TransactionInfo) {
        const heightA = txA?.block_height ?? -Infinity;
        const heightB = txB?.block_height ?? -Infinity;

        if (heightA !== heightB) {
            return heightB - heightA; // Higher block height first
        }

        const indexA = txA?.index ?? -Infinity;
        const indexB = txB?.index ?? -Infinity;

        if (indexA !== indexB) {
            return indexB - indexA; // Higher index first within the block
        }

        const timeA = txA?.timestamp ?? 0;
        const timeB = txB?.timestamp ?? 0;
        return timeB - timeA;
    }

    private sortLatest() {
        this.latest.sort((a, b) => this.compareTransactions(this.data[a], this.data[b]));
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
        resp.sort((a: TransactionInfo, b: TransactionInfo) => this.compareTransactions(a, b));

        this.latest = [];
        for (let item of resp) {
            this.latest.push(item.tx_hash);
            this.data[item.tx_hash] = item;
            this.updateTransactionsByBlock(item);
        }
        this.sortLatest();
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

            const events = eventsData.flatMap((eventEntry: { block_hash: string; block_height: number; events: any[] }) =>
                (eventEntry.events || []).map((event) => {
                    const hasTypedEvent = typeof event?.type === "string" && event.type.length > 0;
                    const eventName = hasTypedEvent ? event.type : Object.keys(event).find((key) => key !== "index") || "";
                    const metadata = hasTypedEvent
                        ? Object.fromEntries(Object.entries(event).filter(([key]) => key !== "type" && key !== "index"))
                        : event[eventName];
                    return {
                        name: eventName,
                        block_hash: eventEntry.block_hash,
                        block_height: eventEntry.block_height,
                        index: event.index || 0,
                        metadata,
                        raw: event,
                    };
                }),
            );
            tx.events = events.sort((a: EventInfo, b: EventInfo) => {
                const heightDiff = (a.block_height ?? 0) - (b.block_height ?? 0);
                if (heightDiff !== 0) {
                    return heightDiff;
                }
                return (a.index ?? 0) - (b.index ?? 0);
            });
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
        if (!this.latest.includes(tx.tx_hash)) {
            this.latest.push(tx.tx_hash);
        }
        this.sortLatest();
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
            `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/transactions/contract/${contractName}?nb_results=200&no_cache=${Date.now()}`,
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
