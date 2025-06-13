import { BlockInfo } from "@/state/blocks";
import { TransactionInfo } from "@/state/transactions";
import { blockStore, transactionStore } from "@/state/data";

export interface Event {
    NewBlock: BlockInfo;
    NewTx: TransactionInfo;
}

export class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectTimeout: number | null = null;
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    connect() {
        return;
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log("WebSocket connected");
            // Register for new blocks topic
            this.ws?.send(JSON.stringify({ RegisterTopic: "new_block" }));
            this.ws?.send(JSON.stringify({ RegisterTopic: "new_tx" }));
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        };

        this.ws.onmessage = (event) => {
            const parsed: Event = JSON.parse(event.data);
            if (parsed.NewBlock) {
                this.handleNewBlock(parsed.NewBlock);
            }
            if (parsed.NewTx) {
                this.handleNewTx(parsed.NewTx);
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        this.ws.onclose = () => {
            console.log("WebSocket disconnected");
            this.reconnect();
        };
    }

    private handleNewBlock(block: BlockInfo) {
        console.log("New block:", block);
        blockStore.value.handleNewBlock(block);
    }

    private handleNewTx(tx: TransactionInfo) {
        if (tx.transaction_type === "BlobTransaction") {
            transactionStore.value.handleNewTx(tx);
        }
    }

    private reconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
        }, 5000);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
}

