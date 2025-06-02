import { BorshSchema, borshDeserialize } from "borsher";

export type OrderType = "Buy" | "Sell";

export type TokenPair = {
    base: string;
    quote: string;
};

export type OrderbookAction =
    | {
          CreateOrder: {
              order_id: string;
              order_type: OrderType;
              price?: number;
              pair: TokenPair;
              quantity: number;
          };
      }
    | {
          Cancel: {
              order_id: string;
          };
      }
    | {
          Deposit: {
              token: string;
              amount: number;
          };
      }
    | {
          Withdraw: {
              token: string;
              amount: number;
          };
      };
//
// Serialisation
//

export const deserializeOrderbookAction = (data: number[]): OrderbookAction => {
    return borshDeserialize(schema, new Uint8Array(data));
};

const schema = BorshSchema.Enum({
    CreateOrder: BorshSchema.Struct({
        order_id: BorshSchema.String,
        order_type: BorshSchema.Enum({
            Buy: BorshSchema.Unit,
            Sell: BorshSchema.Unit,
        }),
        price: BorshSchema.Option(BorshSchema.u32),
        pair: BorshSchema.Struct({
            base: BorshSchema.String,
            quote: BorshSchema.String,
        }),
        quantity: BorshSchema.u32,
    }),
    Cancel: BorshSchema.Struct({
        order_id: BorshSchema.String,
    }),
    Deposit: BorshSchema.Struct({
        token: BorshSchema.String,
        amount: BorshSchema.u32,
    }),
    Withdraw: BorshSchema.Struct({
        token: BorshSchema.String,
        amount: BorshSchema.u32,
    }),
});
