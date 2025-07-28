import { Ref, ref, watchEffect } from "vue";

class LocalStorageService {
    static save(key: string, value: any): void {
        localStorage.setItem(key, JSON.stringify(value));
    }

    static load<T>(key: string): T | null {
        try {
            const jsonValue = localStorage.getItem(key);
            if (jsonValue) return JSON.parse(jsonValue) as T;
        } catch (_) {
            // Might not exist in test envs
            try {
                localStorage.removeItem(key);
            } catch (_) {}
        }
        return null;
    }
}

export const persistentRef = <T>(key: string, initialValue: T): Ref<T> => {
    const storedValue = LocalStorageService.load<T>(key);
    const dataRef = ref<T>(storedValue ?? initialValue);

    watchEffect(() => {
        LocalStorageService.save(key, dataRef.value);
    });

    return dataRef as any;
};

export const network = persistentRef("network", "devnet" as "localhost" | "first-testnet" | "devnet");

watchEffect(() => {
    if (network.value !== "localhost" && network.value !== "first-testnet" && network.value !== "devnet") {
        // Default to devnet if an unsupported network is set
        network.value = "devnet";
    }
});

export const getNetworkIndexerApiUrl = (network: string) => {
    return {
        localhost: "http://localhost:4321",
        devnet: "https://indexer.devnet.hyli.org",
        "first-testnet": "https://indexer.testnet.hyli.org",
    }[network];
};
export const getNetworkNodeApiUrl = (network: string) => {
    return {
        localhost: "http://localhost:4321",
        devnet: "https://node.devnet.hyli.org",
        "first-testnet": "https://node.testnet.hyli.org",
    }[network];
};
export const getNetworkWebSocketUrl = (network: string) => {
    return {
        localhost: "ws://localhost:8080",
        devnet: "wss://indexer.devnet.hyli.org",
        "first-testnet": "wss://indexer.testnet.hyli.org",
    }[network];
};

export const getNetworkWalletApiUrl = (network: string) => {
    return {
        localhost: "http://localhost:4000",
        devnet: "https://wallet.devnet.hyli.org",
        "first-testnet": "https://wallet.testnet.hyli.org",
    }[network];
};
