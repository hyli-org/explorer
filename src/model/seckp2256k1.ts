import { borshSerialize, BorshSchema, borshDeserialize } from "borsher";
import { Blob, Identity } from "hyli";

export const secp256k1ContractName = "secp256k1";

//
// Types
//

export type Secp256k1BlobType = {
    identity: Identity;
    data: Uint8Array; // Array of 32 bytes
    public_key: Uint8Array; // Array of 33 bytes
    signature: Uint8Array; // Array of 64 bytes
};

//
// Builders
//

export const createSecp256k1Blob = (identity: Identity, data: Uint8Array, publicKey: Uint8Array, signature: Uint8Array): Blob => {
    const secp256k1Blob: Secp256k1BlobType = {
        identity,
        data,
        public_key: publicKey,
        signature,
    };

    const blob: Blob = {
        contract_name: secp256k1ContractName,
        data: serializeSecp256k1Blob(secp256k1Blob),
    };
    return blob;
};

//
// Serialisation
//

const serializeSecp256k1Blob = (blob: Secp256k1BlobType): number[] => {
    return Array.from(borshSerialize(schema, blob));
};

export const deserializeSecp256k1Blob = (data: number[]): Secp256k1BlobType => {
    return borshDeserialize(schema, new Uint8Array(data));
};

const schema = BorshSchema.Struct({
    identity: BorshSchema.String,
    data: BorshSchema.Array(BorshSchema.u8, 32),
    public_key: BorshSchema.Array(BorshSchema.u8, 33),
    signature: BorshSchema.Array(BorshSchema.u8, 64),
});