import { BorshSchema, borshDeserialize } from "borsher";

export interface CommitmentSnapshot {
    notes_root: number[];
    nullified_notes_root: number[];
}

export interface UtxoBlob {
    commit0: number[];
    commit1: number[];
    nullifier0: number[];
    nullifier1: number[];
}

const commitmentSnapshotSchema = BorshSchema.Struct({
    notes_root: BorshSchema.Array(BorshSchema.u8, 32),
    nullified_notes_root: BorshSchema.Array(BorshSchema.u8, 32),
});

export const deserializeUtxoStateAction = (data: number[]): CommitmentSnapshot => {
    return borshDeserialize(commitmentSnapshotSchema, new Uint8Array(data));
};

export const deserializeUtxoBlob = (data: number[]): UtxoBlob => {
    if (data.length !== 128) {
        throw new Error(`Expected 128 bytes for utxo blob, got ${data.length}`);
    }
    return {
        commit0: data.slice(0, 32),
        commit1: data.slice(32, 64),
        nullifier0: data.slice(64, 96),
        nullifier1: data.slice(96, 128),
    };
};
