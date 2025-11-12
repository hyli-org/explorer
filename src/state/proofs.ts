import { getNetworkIndexerApiUrl } from "@/state/network";

export type ProofInfo = {
    tx_hash: string;
    parent_dp_hash: string;
    version: number;
    transaction_type: string;
    transaction_status: string;
    block_hash: string;
    block_height: number;
    index: number;
    timestamp: number;
    proof_outputs: [string, number, number, any][];
};

export class ProofStore {
    network: string;
    data: Record<string, ProofInfo> = {};
    latest: string[] = [];

    constructor(network: string) {
        this.network = network;
    }

    async loadLatest() {
        const response = await fetch(`${getNetworkIndexerApiUrl(this.network)}/v1/indexer/proofs?no_cache=${Date.now()}`);
        let resp = await response.json();
        this.latest = resp.map((proof: ProofInfo) => proof.tx_hash);
        for (let item of resp) {
            this.data[item.tx_hash] = item;
        }
    }

    async load(tx_hash: string) {
        // In this function we want to fully load data
        if (tx_hash in this.data && "proof_outputs" in this.data[tx_hash]) {
            return;
        }
        try {
            const response = await fetch(
                `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/proof/hash/${tx_hash}?no_cache=${Date.now()}`,
            );
            let item = await response.json();
            this.data[item.tx_hash] = item;
        } catch (_) {
            return;
        }
    }

    async getPaginatedProofs(startBlock: number, pageSize: number): Promise<{ proofs: ProofInfo[]; lastBlock: number | null }> {
        const response = await fetch(
            `${getNetworkIndexerApiUrl(this.network)}/v1/indexer/proofs?start_block=${startBlock}&nb_results=${pageSize}&no_cache=${Date.now()}`,
        );
        const proofs = await response.json();
        for (const proof of proofs) {
            this.data[proof.tx_hash] = proof;
        }
        const lastBlock = proofs.length > 0 ? proofs[proofs.length - 1].block_hash : null;
        return { proofs, lastBlock };
    }
}
