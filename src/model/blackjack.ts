import {  BorshSchema, borshDeserialize } from "borsher";
import {  StructuredBlobData, structuredBlobDataSchema } from "hyle";

export const blackjackContractName = "blackjack";

//
// Types
//

export type BlackJackAction =
    | { Init: {} }
    | { Hit: {} }
    | { Stand: {} }
    | { DoubleDown: {} }
    | { Claim: {} }
    | { Withdraw: {
        amount: number;
    } };



export const deserializeBlackJackAction = (data: number[]): StructuredBlobData<BlackJackAction> => {
    return borshDeserialize(structuredBlobDataSchema(schema), new Uint8Array(data)) as StructuredBlobData<BlackJackAction>;
};

const schema = 
     BorshSchema.Enum({
        Init: BorshSchema.Struct({}),
        Hit: BorshSchema.Struct({}),
        Stand: BorshSchema.Struct({}),
        DoubleDown: BorshSchema.Struct({}),
        Claim: BorshSchema.Struct({}),
        Withdraw: BorshSchema.Struct({
            amount: BorshSchema.u128,
        }),
}); 