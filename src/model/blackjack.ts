import {  BorshSchema, borshDeserialize } from "borsher";
import {  StructuredBlobData, structuredBlobDataSchema } from "hyli";

export const blackjackContractName = "blackjack";

//
// Types
//

export type BlackJackAction =
    | { Init: {
        bet: number;
    } }
    | { Hit: {} }
    | { Stand: {} }
    | { DoubleDown: {} }
    | { Deposit: {
        deposit: number;} }
    | { Withdraw: {
        withdraw: number;
    } };



export const deserializeBlackJackAction = (data: number[]): StructuredBlobData<BlackJackAction> => {
    return borshDeserialize(structuredBlobDataSchema(schema), new Uint8Array(data)) as StructuredBlobData<BlackJackAction>;
};

const schema = 
     BorshSchema.Enum({
        Init: BorshSchema.Struct({
            bet: BorshSchema.u32,
        }),
        Hit: BorshSchema.Struct({}),
        Stand: BorshSchema.Struct({}),
        DoubleDown: BorshSchema.Struct({}),
        Deposit: BorshSchema.Struct({
            deposit: BorshSchema.u32,
        }),
        Withdraw: BorshSchema.Struct({
            amount: BorshSchema.u32,
        }),
}); 