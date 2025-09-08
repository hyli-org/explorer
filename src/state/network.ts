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

// Parse URL parameters and save ports to localStorage
const parseUrlAndSavePorts = () => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const network = urlParams.get('network');
    const indexerPort = urlParams.get('indexer');
    const nodePort = urlParams.get('node');
    const wsPort = urlParams.get('ws');
    const walletPort = urlParams.get('wallet');
    
    if (network === 'localhost') {
        if (indexerPort) localStorage.setItem('localhost_indexer_port', indexerPort);
        if (nodePort) localStorage.setItem('localhost_node_port', nodePort);
        if (wsPort) localStorage.setItem('localhost_ws_port', wsPort);
        if (walletPort) localStorage.setItem('localhost_wallet_port', walletPort);
    }
};

// Initialize ports from URL on module load
parseUrlAndSavePorts();

// Helper function to get localhost port from localStorage
const getLocalhostPort = (service: 'indexer' | 'node' | 'ws' | 'wallet', defaultPort: string): string => {
    const port = localStorage.getItem(`localhost_${service}_port`);
    return port || defaultPort;
};

export const persistentRef = <T>(key: string, initialValue: T): Ref<T> => {
    // First check URL parameters
    let urlValue: T | null = null;
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const paramValue = urlParams.get(key);
        if (paramValue !== null) {
            try {
                // Try to parse as JSON first, fallback to string
                urlValue = JSON.parse(paramValue) as T;
            } catch {
                // If not valid JSON, treat as string (for simple string values)
                urlValue = paramValue as T;
            }
        }
    }
    
    // Then check localStorage, then fallback to initial value
    const storedValue = LocalStorageService.load<T>(key);
    const dataRef = ref<T>(urlValue ?? storedValue ?? initialValue);

    watchEffect(() => {
        LocalStorageService.save(key, dataRef.value);
    });

    return dataRef as any;
};

export const network = persistentRef("network", "devnet" as "localhost" | "fibrace" | "first-testnet" | "devnet");

watchEffect(() => {
    if (
        network.value !== "localhost" &&
        network.value !== "first-testnet" &&
        network.value !== "devnet" &&
        network.value !== "fibrace"
    ) {
        // Default to devnet if an unsupported network is set
        network.value = "devnet";
    }
});

export const getNetworkIndexerApiUrl = (network: string) => {
    if (network === "localhost") {
        const port = getLocalhostPort('indexer', '4321');
        return `http://localhost:${port}`;
    }
    return {
        devnet: "https://indexer.devnet.hyli.org",
        "fibrace": "https://indexer.testnet.hyli.org",
        "first-testnet": "https://first.testnet.hyli.org",
    }[network];
};

export const getNetworkNodeApiUrl = (network: string) => {
    if (network === "localhost") {
        const port = getLocalhostPort('node', '4321');
        return `http://localhost:${port}`;
    }
    return {
        devnet: "https://node.devnet.hyli.org",
        "fibrace": "https://node.testnet.hyli.org",
        "first-testnet": "https://doesnotexist.testnet.hyli.org",
    }[network];
};

export const getNetworkWebSocketUrl = (network: string) => {
    if (network === "localhost") {
        const port = getLocalhostPort('ws', '8080');
        return `ws://localhost:${port}`;
    }
    return {
        devnet: "wss://indexer.devnet.hyli.org",
        "fibrace": "wss://indexer.testnet.hyli.org",
        "first-testnet": "wss://first.testnet.hyli.org",
    }[network];
};

export const getNetworkWalletApiUrl = (network: string) => {
    if (network === "localhost") {
        const port = getLocalhostPort('wallet', '4000');
        return `http://localhost:${port}`;
    }
    return {
        devnet: "https://wallet.devnet.hyli.org",
        "fibrace": "https://wallet.testnet.hyli.org",
        "first-testnet": "https://wallet.testnet.hyli.org",
    }[network];
};
