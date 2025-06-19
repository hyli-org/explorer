import * as hyle from "hyle/model";
import { deserializeHydentityAction } from "@/model/hydentity";
import { deserializeBlackJackAction } from "@/model/blackjack";
import { deserializeSecp256k1Blob } from "@/model/seckp2256k1";
import { deserializeWalletAction } from "@/model/wallet";
import { deserializeHyleAction } from "@/model/hyle";
import { deserializeSmtTokenAction } from "@/model/smt_token";
import { deserializeFaucetAction } from "@/model/faucet";
import { deserializeOrderbookAction } from "@/model/orderbook";
import { deserializeBoardGameAction, deserializeCrashGameAction } from "@/model/orange_trail";

export const parseHexToVec = (hex: string): number[] | null => {
    const tokens = hex.match(/[0-9a-f]{2}/gi);
    return tokens?.map((t) => parseInt(t, 16)) || null;
};

export const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "bigint") return value.toString();
    if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
        // Convert to Uint8Array and preserve byte order
        const bytes = new Uint8Array(value);
        let result = "";
        for (let i = 0; i < bytes.length; i++) {
            result += bytes[i].toString(16).padStart(2, "0");
        }
        return result;
    }
    if (typeof value === "object") return formatObject(value);
    return String(value);
};

const formatObject = (obj: any): string => {
    if (obj === null || obj === undefined) return "null";

    // Handle enum-like objects (objects with a single key)
    const keys = Object.keys(obj);
    if (keys.length === 1) {
        const key = keys[0];
        const value = obj[key];
        if (typeof value === "object" && value !== null) {
            return `${key} {\n${Object.entries(value)
                .map(([k, v]) => `    ${k}: ${formatValue(v)}`)
                .join("\n")}\n}`;
        }
        return `${key}: ${formatValue(value)}`;
    }

    // Handle regular objects
    return Object.entries(obj)
        .map(([key, value]) => `${key}: ${formatValue(value)}`)
        .join("\n");
};

export const decodeBlobData = (hex: string, contractName: string): string => {
    try {
        const data = parseHexToVec(hex);
        if (data === null) return "Invalid hex data";

        switch (contractName) {
            case "hyle":
                const hyleAction = deserializeHyleAction(data);
                return formatObject(hyleAction);
            case "hyllar":
                const erc20Action = hyle.token.deserializeERC20Action(data);
                return formatObject(erc20Action);
            case "amm":
                const ammAction = hyle.amm.deserializeAmmAction(data);
                return formatObject(ammAction);
            case "mmid":
                const identityAction = hyle.mmid.deserializeIdentityAction(data);
                return formatObject(identityAction);
            case "hydentity":
                const hydentityAction = deserializeHydentityAction(data);
                return formatObject(hydentityAction);
            case "blackjack":
                const blackjackAction = deserializeBlackJackAction(data);
                return formatObject(blackjackAction);
            case "secp256k1":
                const secp256k1Blob = deserializeSecp256k1Blob(data);
                return formatObject(secp256k1Blob);
            case "board_game":
                return formatObject(deserializeBoardGameAction(data));
            case "crash_game":
                return formatObject(deserializeCrashGameAction(data));
            case "oranj":
                const oranjBlob = deserializeSmtTokenAction(data);
                return formatObject(oranjBlob);
            case "vitamin":
                const vitaminBlob = deserializeSmtTokenAction(data);
                return formatObject(vitaminBlob);
            case "oxygen":
                const oxygenBlob = deserializeSmtTokenAction(data);
                return formatObject(oxygenBlob);
            case "faucet":
                const faucetBlob = deserializeFaucetAction(data);
                return formatObject(faucetBlob);
            case "staking":
                const stakingAction = hyle.staking.deserializeStakingAction(data);
                return formatObject(stakingAction);
            case "check_secret":
                return `Check secret for hash ${hex}`;
            case "wallet":
                const walletAction = deserializeWalletAction(data);
                return formatObject(walletAction);
            case "orderbook":
                const orderbookAction = deserializeOrderbookAction(data);
                return formatObject(orderbookAction);
            default:
                if (contractName.startsWith("wallet")) {
                    const walletAction = deserializeWalletAction(data);
                    return formatObject(walletAction);
                }
                return hex;
        }
    } catch (e) {
        console.error("error when decoding blob data for contract", contractName, e);
        return "Unable to decode hex data";
    }
};
