import { borshSerialize, BorshSchema, borshDeserialize } from "borsher";
import { Blob } from "hyli";

export const hydentityContractName = "hydentity";

//
// Types
//

export type HydentityAction =
    | {
          RegisterIdentity: {
              account: string;
          };
      }
    | {
          VerifyIdentity: {
              account: string;
              nonce: number;
          };
      }
    | {
          GetIdentityInfo: {
              account: string;
          };
      };

//
// Builders
//

export const registerIdentity = (account: string): Blob => {
    const action: HydentityAction = {
        RegisterIdentity: { account },
    };
    const blob: Blob = {
        contract_name: hydentityContractName,
        data: serializeHydentityAction(action),
    };
    return blob;
};

export const verifyIdentity = (account: string, nonce: number): Blob => {
    const action: HydentityAction = {
        VerifyIdentity: { account, nonce },
    };
    const blob: Blob = {
        contract_name: hydentityContractName,
        data: serializeHydentityAction(action),
    };
    return blob;
};

export const getIdentityInfo = (account: string): Blob => {
    const action: HydentityAction = {
        GetIdentityInfo: { account },
    };
    const blob: Blob = {
        contract_name: hydentityContractName,
        data: serializeHydentityAction(action),
    };
    return blob;
};

//
// Serialisation
//

const serializeHydentityAction = (action: HydentityAction): number[] => {
    return Array.from(borshSerialize(schema, action));
};

export const deserializeHydentityAction = (data: number[]): HydentityAction => {
    return borshDeserialize(schema, new Uint8Array(data));
};

const schema = BorshSchema.Enum({
    RegisterIdentity: BorshSchema.Struct({
        account: BorshSchema.String,
    }),
    VerifyIdentity: BorshSchema.Struct({
        account: BorshSchema.String,
        nonce: BorshSchema.u32,
    }),
    GetIdentityInfo: BorshSchema.Struct({
        account: BorshSchema.String,
    }),
}); 