import { BorshSchema, borshDeserialize } from "borsher";
import { Identity, structuredBlobDataSchema } from "hyli";

// --- Types ---

export type GameAction =
    | { EndGame: {} }
    | { Initialize: { minigames: string[]; random_seed: number } }
    | { RegisterPlayer: { name: string; deposit: number } }
    | { StartGame: {} }
    | { PlaceBet: { amount: number } }
    | { SpinWheel: {} }
    | { StartMinigame: { minigame: string; players: [Identity, string, number][] } }
    | { EndMinigame: { result: MinigameResult } }
    | { EndTurn: {} }
    | { DistributeRewards: {} };

export type ChainAction =
    | { InitMinigame: { players: [Identity, string, number][]; time: number } }
    | { Start: { time: number } }
    | { CashOut: { player_id: Identity; multiplier: number } }
    | { Crash: { final_multiplier: number } }
    | { Done: {} };

export type MinigameResult = {
    contract_name: string;
    player_results: {
        player_id: Identity;
        coins_delta: number;
    }[];
};

// --- Borsh Schemas ---

export const gameActionSchema = BorshSchema.Enum({
    EndGame: BorshSchema.Struct({}),
    Initialize: BorshSchema.Struct({
        minigames: BorshSchema.Vec(BorshSchema.String),
        random_seed: BorshSchema.u64,
    }),
    RegisterPlayer: BorshSchema.Struct({
        name: BorshSchema.String,
        deposit: BorshSchema.u64,
    }),
    StartGame: BorshSchema.Struct({}),
    PlaceBet: BorshSchema.Struct({
        amount: BorshSchema.u64,
    }),
    SpinWheel: BorshSchema.Struct({}),
    StartMinigame: BorshSchema.Struct({
        minigame: BorshSchema.String,
        players: BorshSchema.Vec(
            BorshSchema.Struct({
                0: BorshSchema.String, // Identity as string
                1: BorshSchema.String,
                2: BorshSchema.u64,
            }),
        ),
    }),
    EndMinigame: BorshSchema.Struct({
        result: BorshSchema.Struct({
            contract_name: BorshSchema.String,
            player_results: BorshSchema.Vec(
                BorshSchema.Struct({
                    player_id: BorshSchema.String, // Identity as string
                    coins_delta: BorshSchema.i64,
                }),
            ),
        }),
    }),
    EndTurn: BorshSchema.Struct({}),
    DistributeRewards: BorshSchema.Struct({}),
});

export const chainActionSchema = BorshSchema.Enum({
    InitMinigame: BorshSchema.Struct({
        players: BorshSchema.Vec(
            BorshSchema.Struct({
                0: BorshSchema.String, // Identity as string
                1: BorshSchema.String,
                2: BorshSchema.u64,
            }),
        ),
        time: BorshSchema.u64,
    }),
    Start: BorshSchema.Struct({
        time: BorshSchema.u64,
    }),
    CashOut: BorshSchema.Struct({
        player_id: BorshSchema.String, // Identity as string
        multiplier: BorshSchema.f64,
    }),
    Crash: BorshSchema.Struct({
        final_multiplier: BorshSchema.f64,
    }),
    Done: BorshSchema.Struct({}),
});

// --- Serialization Helpers ---
const withUuidSchema = (schema: BorshSchema): BorshSchema => {
    return BorshSchema.Struct({
        0: BorshSchema.u128,
        1: schema,
    });
};

export const deserializeBoardGameAction = (data: number[]): GameAction => {
    console.log(structuredBlobDataSchema(gameActionSchema));
    return borshDeserialize<any>(structuredBlobDataSchema(withUuidSchema(gameActionSchema)), new Uint8Array(data)).parameters[1];
};

export const deserializeCrashGameAction = (data: number[]): ChainAction => {
    return borshDeserialize<any>(structuredBlobDataSchema(withUuidSchema(chainActionSchema)), new Uint8Array(data)).parameters[1];
};
