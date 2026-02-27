import { BorshSchema, borshDeserialize } from "borsher";

export type AuthMethod = {
    Password: {
        hash: string;
    };
    Jwt: {
        hash: number[];
    };
    Ethereum: {
        address: string;
    };
    Uninitialized: {};
    HyliApp: {
        address: string;
    };
};

export type WalletAction =
    | {
          RegisterIdentity: {
              account: string;
              nonce: number;
              salt: string;
              auth_method: AuthMethod;
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
              whitelist?: string[];
              laneId?: string;
              nonce: number;
          };
      }
    | {
          RemoveSessionKey: {
              account: string;
              key: string;
              nonce: number;
          };
      }
    | {
          UseSessionKey: {
              account: string;
              nonce: number;
          };
      }
    | {
          UpdateInviteCodePublicKey: {
              invite_code_public_key: number[];
              smt_root: number[];
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
        salt: BorshSchema.String,
        auth_method: BorshSchema.Enum({
            Password: BorshSchema.Struct({
                hash: BorshSchema.String,
            }),
            Jwt: BorshSchema.Struct({
                hash: BorshSchema.Array(BorshSchema.u8, 32),
            }),
            Ethereum: BorshSchema.Struct({
                address: BorshSchema.String,
            }),
            Uninitialized: BorshSchema.Unit,
            HyliApp: BorshSchema.Struct({
                address: BorshSchema.String,
            }),
        }),
        invite_code: BorshSchema.String,
    }),
    VerifyIdentity: BorshSchema.Struct({
        account: BorshSchema.String,
        nonce: BorshSchema.u128,
    }),
    AddSessionKey: BorshSchema.Struct({
        account: BorshSchema.String,
        key: BorshSchema.String,
        expiration_date: BorshSchema.u128,
        whitelist: BorshSchema.Option(BorshSchema.Vec(BorshSchema.String)),
        lane_id: BorshSchema.Option(BorshSchema.String),
        nonce: BorshSchema.u128,
    }),
    RemoveSessionKey: BorshSchema.Struct({
        account: BorshSchema.String,
        key: BorshSchema.String,
        nonce: BorshSchema.u128,
    }),
    UseSessionKey: BorshSchema.Struct({
        account: BorshSchema.String,
        nonce: BorshSchema.u128,
    }),
    UpdateInviteCodePublicKey: BorshSchema.Struct({
        invite_code_public_key: BorshSchema.Array(BorshSchema.u8, 33),
        smt_root: BorshSchema.Array(BorshSchema.u8, 32),
    }),
});
