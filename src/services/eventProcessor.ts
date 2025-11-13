/**
 * Event processor for handling Rust TxEvent variants
 * Maps complex Rust event structures to readable JavaScript objects
 */

import { EventInfo } from "@/state/transactions";

export interface ProcessedEvent {
    type: string;
    txHash?: string;
    laneId?: string;
    sequenceNumber?: number;
    contractName?: string;
    programId?: string;
    error?: string;
    blobIndex?: number;
    success?: boolean;
    reason?: string;
    additionalData?: Record<string, any>;
}

export class TxEventProcessor {
    /**
     * Process a raw event metadata object based on the event name
     */
    static processEvent(event: EventInfo): ProcessedEvent {
        const { event_name: eventName, metadata } = event;
        if (!metadata) {
            return { type: eventName };
        }
        switch (eventName) {
            case 'RejectedBlobTransaction':
                return this.processRejectedBlobTransaction(metadata);
            
            case 'DuplicateBlobTransaction':
                return this.processDuplicateBlobTransaction(metadata);
            
            case 'SequencedBlobTransaction':
                return this.processSequencedBlobTransaction(metadata);
            
            case 'SequencedProofTransaction':
                return this.processSequencedProofTransaction(metadata);
            
            case 'Settled':
                return this.processSettled(metadata);
            
            case 'SettledAsFailed':
                return this.processSettledAsFailed(metadata);
            
            case 'TimedOut':
                return this.processTimedOut(metadata);
            
            case 'TxError':
                return this.processTxError(metadata);
            
            case 'NewProof':
                return this.processNewProof(metadata);
            
            case 'BlobSettled':
                return this.processBlobSettled(metadata);
            
            case 'ContractDeleted':
                return this.processContractDeleted(metadata);
            
            case 'ContractRegistered':
                return this.processContractRegistered(metadata);
            
            case 'ContractStateUpdated':
                return this.processContractStateUpdated(metadata);
            
            case 'ContractProgramIdUpdated':
                return this.processContractProgramIdUpdated(metadata);
            
            case 'ContractTimeoutWindowUpdated':
                return this.processContractTimeoutWindowUpdated(metadata);
            
            default:
                return {
                    type: eventName,
                    additionalData: metadata
                };
        }
    }

    private static processRejectedBlobTransaction(metadata: Record<string, any>): ProcessedEvent {
        // RejectedBlobTransaction(&'a TxHash, &'a LaneId, u32, &'a BlobTransaction, &'a Arc<TxContext>)
        return {
            type: 'RejectedBlobTransaction',
            txHash: this.extractTxHash(metadata, 0),
            laneId: this.extractLaneId(metadata, 1),
            reason: 'Transaction rejected during blob processing',
            additionalData: {
                context: this.extractTxContext(metadata, 4)
            }
        };
    }

    private static processDuplicateBlobTransaction(metadata: Record<string, any>): ProcessedEvent {
        // DuplicateBlobTransaction(&'a TxHash)
        return {
            type: 'DuplicateBlobTransaction',
            txHash: this.extractTxHash(metadata, 0),
            reason: 'Duplicate blob transaction detected'
        };
    }

    private static processSequencedBlobTransaction(metadata: Record<string, any>): ProcessedEvent {
        // SequencedBlobTransaction(&'a TxHash, &'a LaneId, u32, &'a BlobTransaction, &'a Arc<TxContext>)
        return {
            type: 'SequencedBlobTransaction',
            txHash: this.extractTxHash(metadata, 0),
            laneId: this.extractLaneId(metadata, 1),
            additionalData: {
                // context: this.extractTxContext(metadata, 4)
            }
        };
    }

    private static processSequencedProofTransaction(metadata: Record<string, any>): ProcessedEvent {
        // SequencedProofTransaction(&'a TxHash, &'a LaneId, u32, &'a VerifiedProofTransaction)
        return {
            type: 'SequencedProofTransaction',
            txHash: this.extractTxHash(metadata, 0),
            laneId: this.extractLaneId(metadata, 1),
            additionalData: {
            }
        };
    }

    private static processSettled(metadata: Record<string, any>): ProcessedEvent {
        // Settled(&'a TxHash, &'a UnsettledBlobTransaction)
        return {
            type: 'Settled',
            txHash: this.extractTxHash(metadata, 0),
            additionalData: {
            }
        };
    }

    private static processSettledAsFailed(metadata: Record<string, any>): ProcessedEvent {
        // SettledAsFailed(&'a TxHash, &'a UnsettledBlobTransaction, &'a str)
        return {
            type: 'SettledAsFailed',
            txHash: this.extractTxHash(metadata, 0),
            error: this.extractString(metadata, 2),
            additionalData: {
            }
        };
    }

    private static processTimedOut(metadata: Record<string, any>): ProcessedEvent {
        // TimedOut(&'a TxHash, &'a UnsettledBlobTransaction)
        return {
            type: 'TimedOut',
            txHash: this.extractTxHash(metadata, 0),
            reason: 'Transaction timed out',
            additionalData: {
                unsettledBlobTransaction: this.extractUnsettledBlobTransaction(metadata, 1)
            }
        };
    }

    private static processTxError(metadata: Record<string, any>): ProcessedEvent {
        // TxError(&'a TxHash, &'a str)
        return {
            type: 'TxError',
            txHash: this.extractTxHash(metadata, 0),
            error: this.extractString(metadata, 1)
        };
    }

    private static processNewProof(metadata: Record<string, any>): ProcessedEvent {
        // NewProof(&'a TxHash, &'a Blob, BlobIndex, &'a (ProgramId, Verifier, TxHash, HyliOutput), usize)
        // const hyliOutputTuple = this.extractTuple(metadata, 3);
        return {
            type: 'NewProof',
            txHash: this.extractTxHash(metadata, 0),
            blobIndex: this.extractBlobIndex(metadata, 2),
            additionalData: {
                // blob: this.extractBlob(metadata, 1),
                // verifier: hyliOutputTuple?.[1],
                // relatedTxHash: hyliOutputTuple?.[2],
                // hyliOutput: hyliOutputTuple?.[3],
                // proofIndex: this.extractUsize(metadata, 4)
            }
        };
    }

    private static processBlobSettled(metadata: Record<string, any>): ProcessedEvent {
        // BlobSettled(&'a TxHash, &'a UnsettledBlobTransaction, &'a Blob, BlobIndex, Option<&'a (ProgramId, Verifier, TxHash, HyliOutput)>, usize)
        // const hyliOutputTuple = this.extractOptionalTuple(metadata, 4);
        return {
            type: 'BlobSettled',
            txHash: this.extractTxHash(metadata, 0),
            blobIndex: this.extractBlobIndex(metadata, 3),
            additionalData: {
                // unsettledBlobTransaction: this.extractUnsettledBlobTransaction(metadata, 1),
                // blob: this.extractBlob(metadata, 2),
                // verifier: hyliOutputTuple?.[1],
                // relatedTxHash: hyliOutputTuple?.[2],
                // hyliOutput: hyliOutputTuple?.[3],
                // proofIndex: this.extractUsize(metadata, 5)
            }
        };
    }

    private static processContractDeleted(metadata: Record<string, any>): ProcessedEvent {
        // ContractDeleted(&'a TxHash, &'a ContractName)
        return {
            type: 'ContractDeleted',
            txHash: this.extractTxHash(metadata, 0),
            contractName: this.extractContractName(metadata, 1),
        };
    }

    private static processContractRegistered(metadata: Record<string, any>): ProcessedEvent {
        // ContractRegistered(&'a TxHash, &'a ContractName, &'a Contract, &'a Option<Vec<u8>>)
        return {
            type: 'ContractRegistered',
            txHash: this.extractTxHash(metadata, 0),
            contractName: this.extractContractName(metadata, 1),
            additionalData: {
                contract: this.extractContract(metadata, 2),
                initData: this.extractOptionalBytes(metadata, 3)
            }
        };
    }

    private static processContractStateUpdated(metadata: Record<string, any>): ProcessedEvent {
        // ContractStateUpdated(&'a TxHash, &'a ContractName, &'a Contract, &'a StateCommitment)
        return {
            type: 'ContractStateUpdated',
            txHash: this.extractTxHash(metadata, 0),
            contractName: this.extractContractName(metadata, 1),
            additionalData: {
                contract: this.extractContract(metadata, 2),
                stateCommitment: this.extractStateCommitment(metadata, 3)
            }
        };
    }

    private static processContractProgramIdUpdated(metadata: Record<string, any>): ProcessedEvent {
        // ContractProgramIdUpdated(&'a TxHash, &'a ContractName, &'a Contract, &'a ProgramId)
        return {
            type: 'ContractProgramIdUpdated',
            txHash: this.extractTxHash(metadata, 0),
            contractName: this.extractContractName(metadata, 1),
            programId: this.extractProgramId(metadata, 3),
            additionalData: {
                contract: this.extractContract(metadata, 2)
            }
        };
    }

    private static processContractTimeoutWindowUpdated(metadata: Record<string, any>): ProcessedEvent {
        // ContractTimeoutWindowUpdated(&'a TxHash, &'a ContractName, &'a Contract, &'a TimeoutWindow)
        return {
            type: 'ContractTimeoutWindowUpdated',
            txHash: this.extractTxHash(metadata, 0),
            contractName: this.extractContractName(metadata, 1),
            additionalData: {
                contract: this.extractContract(metadata, 2),
                timeoutWindow: this.extractTimeoutWindow(metadata, 3)
            }
        };
    }

    // Helper methods for extracting typed data from metadata
    private static extractTxHash(metadata: Record<string, any>, index: number): string | undefined {
        return metadata[index][1]?.toString();
    }

    private static extractLaneId(metadata: Record<string, any>, index: number): string | undefined {
        return metadata[index]?.toString();
    }

    private static extractUsize(metadata: Record<string, any>, index: number): number | undefined {
        const value = metadata[index];
        return typeof value === 'number' ? value : undefined;
    }

    private static extractString(metadata: Record<string, any>, index: number): string | undefined {
        return metadata[index]?.toString();
    }

    private static extractContractName(metadata: Record<string, any>, index: number): string | undefined {
        return metadata[index]?.toString();
    }

    private static extractProgramId(metadata: Record<string, any>, index: number): string | undefined {
        return metadata[index]?.toString();
    }

    private static extractBlobIndex(metadata: Record<string, any>, index: number): number | undefined {
        const value = metadata[index];
        return typeof value === 'number' ? value : undefined;
    }

    private static extractTxContext(metadata: Record<string, any>, index: number): any {
        return metadata[index];
    }

    private static extractVerifiedProofTransaction(metadata: Record<string, any>, index: number): any {
        return metadata[index];
    }

    private static extractUnsettledBlobTransaction(metadata: Record<string, any>, index: number): any {
        return metadata[index];
    }

    private static extractBlob(metadata: Record<string, any>, index: number): any {
        return metadata[index];
    }

    private static extractContract(metadata: Record<string, any>, index: number): any {
        return metadata[index];
    }

    private static extractStateCommitment(metadata: Record<string, any>, index: number): any {
        return metadata[index];
    }

    private static extractTimeoutWindow(metadata: Record<string, any>, index: number): any {
        return metadata[index];
    }

    private static extractTuple(metadata: Record<string, any>, index: number): any[] | undefined {
        const value = metadata[index];
        return Array.isArray(value) ? value : undefined;
    }

    private static extractOptionalTuple(metadata: Record<string, any>, index: number): any[] | undefined {
        const value = metadata[index];
        return value && Array.isArray(value) ? value : undefined;
    }

    private static extractOptionalBytes(metadata: Record<string, any>, index: number): number[] | undefined {
        const value = metadata[index];
        return value && Array.isArray(value) ? value : undefined;
    }

    /**
     * Get a human-readable description of the event
     */
    static getEventDescription(processedEvent: ProcessedEvent): string {
        switch (processedEvent.type) {
            case 'RejectedBlobTransaction':
                return `Blob transaction ${processedEvent.txHash} was rejected`;
            
            case 'DuplicateBlobTransaction':
                return `Duplicate blob transaction detected: ${processedEvent.txHash}`;
            
            case 'SequencedBlobTransaction':
                return `Blob transaction ${processedEvent.txHash} was successfully sequenced`;
            
            case 'SequencedProofTransaction':
                return `Proof transaction ${processedEvent.txHash} was successfully sequenced`;
            
            case 'Settled':
                return `Transaction ${processedEvent.txHash} was settled successfully`;
            
            case 'SettledAsFailed':
                return `Transaction ${processedEvent.txHash} was settled as failed: ${processedEvent.error}`;
            
            case 'TimedOut':
                return `Transaction ${processedEvent.txHash} timed out`;
            
            case 'TxError':
                return `Transaction ${processedEvent.txHash} encountered an error: ${processedEvent.error}`;
            
            case 'NewProof':
                return `New proof generated for transaction ${processedEvent.txHash}`;
            
            case 'BlobSettled':
                return `Blob settled for transaction ${processedEvent.txHash}`;
            
            case 'ContractDeleted':
                return `Contract ${processedEvent.contractName} was deleted`;
            
            case 'ContractRegistered':
                return `Contract ${processedEvent.contractName} was registered`;
            
            case 'ContractStateUpdated':
                return `State updated for contract ${processedEvent.contractName}`;
            
            case 'ContractProgramIdUpdated':
                return `Program ID updated for contract ${processedEvent.contractName}`;
            
            case 'ContractTimeoutWindowUpdated':
                return `Timeout window updated for contract ${processedEvent.contractName}`;
            
            default:
                return `Event: ${processedEvent.type}`;
        }
    }

    /**
     * Get the status/severity level of the event
     */
    static getEventStatus(processedEvent: ProcessedEvent): 'success' | 'error' | 'warning' | 'info' {
        if (processedEvent.success === false || processedEvent.error) {
            return 'error';
        }
        
        switch (processedEvent.type) {
            case 'RejectedBlobTransaction':
            case 'DuplicateBlobTransaction':
                return 'warning';
            
            case 'SettledAsFailed':
            case 'TimedOut':
            case 'TxError':
                return 'error';
            
            case 'Settled':
            case 'SequencedBlobTransaction':
            case 'SequencedProofTransaction':
            case 'NewProof':
            case 'BlobSettled':
            case 'ContractRegistered':
                return 'success';
            
            default:
                return 'info';
        }
    }
}