import { getNetworkIndexerApiUrl } from "@/state/network";

export type BlockInfo = {
    hash: string;
    parent_hash: string;
    height: number;
    timestamp: Date;
    total_txs: number;
};

export class BlockStore {
    network: string;
    data: Record<string, BlockInfo> = {};
    latest: string[] = [];

    constructor(network: string) {
        this.network = network;
    }

    handleNewBlock(block: BlockInfo) {
        // Add new block to store
        this.data[block.hash] = block;

        // Add to latest blocks list
        this.latest.unshift(block.hash);

        // Keep only the last 10 blocks in latest
        if (this.latest.length > 10) {
            this.latest.pop();
        }
    }

    async loadLatest() {
        const response = await fetch(`${getNetworkIndexerApiUrl(this.network)}/v1/indexer/blocks?no_cache=${Date.now()}`);
        let resp = await response.json();
        this.latest = resp.map((block: BlockInfo) => block.hash);
        for (let item of resp) {
            this.data[item.hash] = item;
        }
    }

    async load(hash: string) {
        if (this.data[hash]) {
            return;
        }
        const response = await fetch(`${getNetworkIndexerApiUrl(this.network)}/v1/indexer/block/hash/${hash}?no_cache=${Date.now()}`);
        let item = await response.json();
        this.data[item.hash] = item;
    }

    async loadBlocks(startBlock: number, pageSize: number) {
        const response = await fetch(
            `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/blocks?start_block=${startBlock}&nb_results=${pageSize}&no_cache=${Date.now()}`,
        );
        const blocks = await response.json();
        for (let block of blocks) {
            this.data[block.hash] = block;
        }
        return blocks;
    }

    async loadByHeight(height: number) {
        const response = await fetch(`${getNetworkIndexerApiUrl(this.network)}/v1/indexer/block/height/${height}?no_cache=${Date.now()}`);
        const block = await response.json();
        this.data[block.hash] = block;
        return block;
    }
}
