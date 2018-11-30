import EthjsHttpProvider = require('ethjs-provider-http');
import EthjsQuery = require('ethjs-query');
import BN = require('bn.js');
import { NetworkConfiguration } from './NetworkConfiguration';
import { sleep } from './HelperFunctions';

export interface Log {
    removed: boolean;
    logIndex: BN;
    transactionIndex: BN;
    transactionHash: string;
    blockHash: string;
    blockNumber: BN;
    address: string;
    data: string;
    topics: Array<string>;
}

export interface TransactionReceipt {
    transactionHash: string;
    transactionIndex: BN;
    blockHash: string;
    blockNumber: BN;
    cumulativeGasUsed: BN;
    gasUsed: BN;
    contractAddress: string;
    logs: Array<Log>;
    status: number|string;
}

export class Connector {
    public readonly ethjsQuery: EthjsQuery;
    public readonly gasPrice: BN;

    constructor(configuration: NetworkConfiguration) {
        const ethjsHttpProvider = new EthjsHttpProvider(configuration.http);
        this.ethjsQuery = new EthjsQuery(ethjsHttpProvider);
        this.gasPrice = configuration.gasPrice;
    }

    public async waitUntilConnected(): Promise<EthjsQuery> {
        while (true) {
            try {
                await this.ethjsQuery.net_version();
                break;
            } catch {
                // swallow the error, we just want to loop until the net_version call above succeeds.
            }
        }
        return this.ethjsQuery;
    }

    waitForTransactionReceipt = async (transactionHash: string, failureDetails: string): Promise<TransactionReceipt>  => {
        let pollingInterval = 10;
        let receipt = await this.ethjsQuery.getTransactionReceipt(transactionHash);
        while (!receipt || !receipt.blockHash) {
            await sleep(pollingInterval);
            receipt = await this.ethjsQuery.getTransactionReceipt(transactionHash);
            pollingInterval = Math.min(pollingInterval*2, 5000);
        }
        const status = (typeof receipt.status === 'number') ? receipt.status : parseInt(receipt.status, 16);
        if (!status) {
            throw new Error(`Transaction failed.  ${failureDetails}`);
        }
        return receipt;
    }
}