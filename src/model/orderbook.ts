import { BorshSchema, borshDeserialize } from "borsher";

export type OrderType = "Market" | "Limit" | "Stop" | "StopLimit" | "StopMarket";
export type OrderSide = "Bid" | "Ask";

export type Pair = {
    base: string;
    quote: string;
};

export type PairInfo = {
    // Add fields as needed based on the actual Rust struct
    [key: string]: any;
};

export type Order = {
    order_id: string;
    order_type: OrderType;
    order_side: OrderSide;
    price?: number;
    pair: Pair;
    quantity: number;
};

export type PermissionnedOrderbookAction =
    | { Identify: {} }
    | { AddSessionKey: {} }
    | {
          CreatePair: {
              pair: Pair;
              info: PairInfo;
          };
      }
    | {
          Deposit: {
              symbol: string;
              amount: number;
          };
      }
    | {
          CreateOrder: Order;
      }
    | {
          Cancel: {
              order_id: string;
          };
      }
    | {
          Withdraw: {
              symbol: string;
              amount: number;
              destination_address: string;
          };
      };

export type PermissionlessOrderbookAction = {
    Escape: {
        user_key: number[]; // [u8; 32] represented as number array
    };
};

export type OrderbookAction =
    | {
          PermissionnedOrderbookAction: PermissionnedOrderbookAction;
      }
    | {
          PermissionlessOrderbookAction: PermissionlessOrderbookAction;
      };

//
// Serialisation
//

export const deserializeOrderbookAction = (data: number[]): OrderbookAction => {
    return borshDeserialize(schema, new Uint8Array(data));
};

const schema = BorshSchema.Enum({
    PermissionnedOrderbookAction: BorshSchema.Struct({
        action: BorshSchema.Enum({
            Identify: BorshSchema.Struct({}),
            AddSessionKey: BorshSchema.Struct({}),
            CreatePair: BorshSchema.Struct({
                pair: BorshSchema.Struct({
                    base: BorshSchema.String,
                    quote: BorshSchema.String,
                }),
                info: BorshSchema.Struct({}), // Adjust based on actual PairInfo structure
            }),
            Deposit: BorshSchema.Struct({
                symbol: BorshSchema.String,
                amount: BorshSchema.u64,
            }),
            CreateOrder: BorshSchema.Struct({
                order_id: BorshSchema.String,
                order_type: BorshSchema.Enum({
                    Market: BorshSchema.Unit,
                    Limit: BorshSchema.Unit,
                    Stop: BorshSchema.Unit,
                    StopLimit: BorshSchema.Unit,
                    StopMarket: BorshSchema.Unit,
                }),
                order_side: BorshSchema.Enum({
                    Bid: BorshSchema.Unit,
                    Ask: BorshSchema.Unit,
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
            Withdraw: BorshSchema.Struct({
                symbol: BorshSchema.String,
                amount: BorshSchema.u64,
                destination_address: BorshSchema.String,
            }),
        }),
        global_nonce: BorshSchema.u32,
    }),
    PermissionlessOrderbookAction: BorshSchema.Struct({
        action: BorshSchema.Enum({
            Escape: BorshSchema.Struct({
                user_key: BorshSchema.Array(BorshSchema.u8, 32),
            }),
            global_nonce: BorshSchema.u32,
        }),
    }),
});
