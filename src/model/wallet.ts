import { BorshSchema, borshDeserialize } from "borsher";

export type AuthMethod = {
    Password: {
        hash: string;
    };
};

export type WalletAction =
    | {
          RegisterIdentity: {
              account: string;
              nonce: number;
              auth_method: AuthMethod;
              salt: string;
              invite_code: string;
          };
      }
    | {
          VerifyIdentity: {
              account: string;
              nonce: number;
          };
      }
    | {
          AddSessionKey: {
              account: string;
              key: string;
              expiration_date: number;
              whitelist: string[];
              lane_id: string;
          };
      }
    | {
          RemoveSessionKey: {
              account: string;
              key: string;
          };
      }
    | {
          UseSessionKey: {
              account: string;
              nonce: number;
          };
      }
    | {
          AddSessionKey: {
              account: string;
              key: string;
              expiration: number;
              whitelist?: string[];
              laneId?: string;
          };
      }
    | {
          RemoveSessionKey: {
              account: string;
              key: string;
          };
      }
    | {
          UseSessionKey: {
              account: string;
              nonce: number;
          };
      };

export const deserializeWalletAction = (data: number[]): WalletAction => {
    let action: WalletAction =  borshDeserialize(schema, new Uint8Array(data));
    if ("RegisterIdentity" in action) {
        action.RegisterIdentity.salt = "***";
        action.RegisterIdentity.invite_code = "***";
    }
    return action
};

const schema = BorshSchema.Enum({
    RegisterIdentity: BorshSchema.Struct({
        account: BorshSchema.String,
        nonce: BorshSchema.u128,
        auth_method: BorshSchema.Enum({
            Password: BorshSchema.Struct({
                hash: BorshSchema.String,
            }),
        }),
        salt: BorshSchema.String,
        invite_code: BorshSchema.String,
    }),
    VerifyIdentity: BorshSchema.Struct({
        account: BorshSchema.String,
        nonce: BorshSchema.u128,
    }),
    AddSessionKey: BorshSchema.Struct({
        account: BorshSchema.String,
        key: BorshSchema.String,
        expiration: BorshSchema.u128,
        whitelist: BorshSchema.Option(BorshSchema.Vec(BorshSchema.String)),
        lane_id: BorshSchema.Option(BorshSchema.String),
    }),
    RemoveSessionKey: BorshSchema.Struct({
        account: BorshSchema.String,
        key: BorshSchema.String,
    }),
    UseSessionKey: BorshSchema.Struct({
        account: BorshSchema.String,
        nonce: BorshSchema.u128,
    }),
});
