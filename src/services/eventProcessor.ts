/**
 * Event processor for handling Rust TxEvent variants
 * Maps complex Rust event structures to readable JavaScript objects
 */

import { EventInfo } from "@/state/transactions";

export interface ProcessedEvent {
    type?: string;
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
        const { name: name, metadata } = event;
        if (!metadata) {
            return { type: name };
        }
        switch (name) {
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
                    type: name,
                    additionalData: metadata
                };
        }
    }

    private static processRejectedBlobTransaction(metadata: Record<string, any>): ProcessedEvent {
        // RejectedBlobTransaction(&'a TxHash, &'a LaneId, u32, &'a BlobTransaction, &'a Arc<TxContext>)
        return {
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
            txHash: this.extractTxHash(metadata, 0),
            reason: 'Duplicate blob transaction detected'
        };
    }

    private static processSequencedBlobTransaction(metadata: Record<string, any>): ProcessedEvent {
        // SequencedBlobTransaction(&'a TxHash, &'a LaneId, u32, &'a BlobTransaction, &'a Arc<TxContext>)
        return {
            txHash: this.extractTxHash(metadata, 0),
            laneId: this.extractLaneId(metadata, 1),
            additionalData: {
                context: this.extractTxContext(metadata, 4)
            }
        };
    }

    private static processSequencedProofTransaction(metadata: Record<string, any>): ProcessedEvent {
        // SequencedProofTransaction(&'a TxHash, &'a LaneId, u32, &'a VerifiedProofTransaction)
        return {
            txHash: this.extractTxHash(metadata, 0),
            laneId: this.extractLaneId(metadata, 1),
            additionalData: {
            }
        };
    }

    private static processSettled(metadata: Record<string, any>): ProcessedEvent {
        // Settled(&'a TxHash, &'a UnsettledBlobTransaction)
        return {
            txHash: this.extractTxHash(metadata, 0),
            additionalData: {
            }
        };
    }

    private static processSettledAsFailed(metadata: Record<string, any>): ProcessedEvent {
        // SettledAsFailed(&'a TxHash, &'a UnsettledBlobTransaction, &'a str)
        return {
            txHash: this.extractTxHash(metadata, 0),
            error: this.extractString(metadata, 2),
            additionalData: {
            }
        };
    }

    private static processTimedOut(metadata: Record<string, any>): ProcessedEvent {
        // TimedOut(&'a TxHash, &'a UnsettledBlobTransaction)
        return {
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
            txHash: this.extractTxHash(metadata, 0),
            error: this.extractString(metadata, 1)
        };
    }

    private static processNewProof(metadata: Record<string, any>): ProcessedEvent {
        // NewProof(&'a TxHash, &'a Blob, BlobIndex, &'a (ProgramId, Verifier, TxHash, HyliOutput), usize)
        const hyliOutputTuple = this.extractTuple(metadata, 3);
        return {
            txHash: this.extractTxHash(metadata, 0),
            blobIndex: this.extractBlobIndex(metadata, 2),
            additionalData: {
                blob: this.extractBlob(metadata, 1),
                verifier: hyliOutputTuple?.[1],
                hyliOutput: hyliOutputTuple?.[3],
                proofIndex: this.extractUsize(metadata, 4)
            }
        };
    }

    private static processBlobSettled(metadata: Record<string, any>): ProcessedEvent {
        // BlobSettled(&'a TxHash, &'a UnsettledBlobTransaction, &'a Blob, BlobIndex, Option<&'a (ProgramId, Verifier, TxHash, HyliOutput)>, usize)
        const hyliOutputTuple = this.extractOptionalTuple(metadata, 4);
        return {
            txHash: this.extractTxHash(metadata, 0),
            blobIndex: this.extractBlobIndex(metadata, 3),
            additionalData: {
                blob: this.extractBlob(metadata, 2),
                verifier: hyliOutputTuple?.[1],
                proofIndex: this.extractUsize(metadata, 5)
            }
        };
    }

    private static processContractDeleted(metadata: Record<string, any>): ProcessedEvent {
        // ContractDeleted(&'a TxHash, &'a ContractName)
        return {
            txHash: this.extractTxHash(metadata, 0),
            contractName: this.extractContractName(metadata, 1),
        };
    }

    private static processContractRegistered(metadata: Record<string, any>): ProcessedEvent {
        // ContractRegistered(&'a TxHash, &'a ContractName, &'a Contract, &'a Option<Vec<u8>>)
        return {
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

    private static extractUnsettledBlobTransaction(metadata: Record<string, any>, index: number): any {
        return metadata[index];
    }

    private static extractBlob(metadata: Record<string, any>, index: number): any {
        let blob = metadata[index];
        console.log(blob);
        if (blob && blob.data) {
            blob.data = Array.isArray(blob.data) 
                ? blob.data.map((byte: { toString: (arg0: number) => string; }) => byte.toString(16).padStart(2, '0')).join('')
                : blob.data;
        }
        return blob;
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
     * Get the status/severity level of the event
     */
    static getEventStatus(processedEvent: ProcessedEvent): 'success' | 'error' | 'warning' | 'info' {
        if (processedEvent.success === false || processedEvent.error) {
            return 'error';
        }
        
        switch (processedEvent.type) {
            case 'RejectedBlobTransaction':
            case 'DuplicateBlobTransaction':
            case 'TxError':
                return 'warning';
            
            case 'SettledAsFailed':
            case 'TimedOut':
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