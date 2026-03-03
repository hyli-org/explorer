import { BorshSchema, borshDeserialize } from "borsher";

export interface HyliUtxoStateBlob {
    output_note_commit0: number[];
    output_note_commit1: number[];
    nullifier0: number[];
    nullifier1: number[];
}

export interface HyliUtxoBlob {
    input_note_commit0: number[];
    input_note_commit1: number[];
    nullifier0: number[];
    nullifier1: number[];
}

export interface HyliSmtInclusionProofBlob {
    input_note_commit0: number[];
    input_note_commit1: number[];
    notes_root: number[];
}

export const deserializeUtxoStateAction = (data: number[]): HyliUtxoStateBlob => {
    if (data.length !== 128) {
        throw new Error(`Expected 128 bytes for utxo blob, got ${data.length}`);
    }
    return {
        output_note_commit0: data.slice(0, 32),
        output_note_commit1: data.slice(32, 64),
        nullifier0: data.slice(64, 96),
        nullifier1: data.slice(96, 128),
    };
};

export const deserializeUtxoBlob = (data: number[]): HyliUtxoBlob => {
    if (data.length !== 128) {
        throw new Error(`Expected 128 bytes for utxo blob, got ${data.length}`);
    }
    return {
        input_note_commit0: data.slice(0, 32),
        input_note_commit1: data.slice(32, 64),
        nullifier0: data.slice(64, 96),
        nullifier1: data.slice(96, 128),
    };
};

export const deserializeSmtInclusionProof = (data: number[]): HyliSmtInclusionProofBlob => {
    if (data.length < 96) {
        throw new Error(`Expected at least 96 bytes for SMT inclusion proof, got ${data.length}`);
    }
    return {
        input_note_commit0: data.slice(0, 32),
        input_note_commit1: data.slice(32, 64),
        notes_root: data.slice(64, 96),
    };
};
