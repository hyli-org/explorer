import { BorshSchema, borshDeserialize } from "borsher";

export type OrderType = "Market" | "Limit" | "Stop" | "StopLimit" | "StopMarket";
export type OrderSide = "Bid" | "Ask";

export type Pair = {
    base: string;
    quote: string;
};

export type PairInfo = {
    base: AssetInfo;
    quote: AssetInfo;
};

export type AssetInfo = {
    scale: number;
    contract_name: string;
};

export type WithdrawDestination = {
    network: string;
    address: string;
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
              destination: WithdrawDestination;
          };
      }
    | {
          UpgradeContract: Uint8Array;
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
                info: BorshSchema.Struct({
                    base: BorshSchema.Struct({
                        scale: BorshSchema.u64,
                        contract_name: BorshSchema.String,
                    }),
                    quote: BorshSchema.Struct({
                        scale: BorshSchema.u64,
                        contract_name: BorshSchema.String,
                    }),
                }),
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
                price: BorshSchema.Option(BorshSchema.u64),
                pair: BorshSchema.Struct({
                    base: BorshSchema.String,
                    quote: BorshSchema.String,
                }),
                quantity: BorshSchema.u64,
            }),
            Cancel: BorshSchema.Struct({
                order_id: BorshSchema.String,
            }),
            Withdraw: BorshSchema.Struct({
                symbol: BorshSchema.String,
                amount: BorshSchema.u64,
                destination: BorshSchema.Struct({
                    network: BorshSchema.String,
                    address: BorshSchema.String,
                }),
            }),
            UpgradeContract: BorshSchema.Struct({
                new_program_id: BorshSchema.Vec(BorshSchema.u8),
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
