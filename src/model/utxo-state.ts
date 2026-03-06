export interface HyliUtxoBlob {
    output_note0: number[];
    output_note1: number[];
    input_nullifier0: number[];
    input_nullifier1: number[];
}

export interface HyliSmtInclusionProofBlob {
    input_nullifier0: number[];
    input_nullifier1: number[];
    notes_root: number[];
}

export const deserializeUtxoStateAction = (_data: number[]) => {
    return {
        UtxoStateAction: "no blob data",
    };
};

export const deserializeUtxoBlob = (data: number[]): HyliUtxoBlob => {
    if (data.length !== 128) {
        throw new Error(`Expected 128 bytes for utxo blob, got ${data.length}`);
    }
    return {
        output_note0: data.slice(0, 32),
        output_note1: data.slice(32, 64),
        input_nullifier0: data.slice(64, 96),
        input_nullifier1: data.slice(96, 128),
    };
};

export const deserializeSmtInclusionProof = (data: number[]): HyliSmtInclusionProofBlob => {
    if (data.length < 96) {
        throw new Error(`Expected at least 96 bytes for SMT inclusion proof, got ${data.length}`);
    }
    return {
        input_nullifier0: data.slice(0, 32),
        input_nullifier1: data.slice(32, 64),
        notes_root: data.slice(64, 96),
    };
};
