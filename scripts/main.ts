import { USDEQuoter } from "../src/quoter/quoter";
import {
    createPublicClient,
    formatUnits,
    getContract,
    NumberToBytesErrorType,
    webSocket,
    type Log,
    type PublicClient,
} from "viem";
import { mainnet } from "viem/chains";
import { CURVE_USDE_USDC, ETH_CHAINLINK_ORACLE, V3_USDT_USDE_100 } from "../src/constants";
import { ERIGON_URL, ERIGON_WS_URL } from "../src/config";
import { ChainLink_Oracle_ABI } from "../src/abi/ChainLinkOracle";

export class Tracer {
    private wsUrl: string;
    private httpUrl: string;
    public wsClient: PublicClient;
    public quoter: USDEQuoter;

    private NativePrice: number = 0;
    private LastUpdate: number = 0;
    private baseFee:bigint = 0n;

    constructor(nodeHttpUrl: string, nodeWsUrl: string) {
        this.httpUrl = nodeHttpUrl;
        this.wsUrl = nodeWsUrl;
        this.wsClient = createPublicClient({
            chain: mainnet,
            transport: webSocket(nodeWsUrl),
        });
        this.quoter = new USDEQuoter(nodeHttpUrl);
    }

    public init() {
        console.log("Begin to trace");
        this.watchEvents();
    }

    private watchEvents() {
        this.wsClient.watchBlockNumber({
            onBlockNumber: async (blockNumber) => {
                console.log("Received BlockNumber", blockNumber);
                try {
                    await this.updateBlockFee()
                    await this.updateNativePrice();
                    let flag = await this.monitorPoolEvents(blockNumber);
                    if (flag) {
                        await this.quoter.handleBlockOptPath(blockNumber,this.NativePrice,this.baseFee);
                    }
                    console.log("===");
                } catch (error) {
                    console.log("Error handling block number:", error);
                }
            },
            onError: (error) => {
                console.log("WebSocket error:", error);
                // Reconnect immediately
                // this.reconnect();
            },
        });
    }

    private async monitorPoolEvents(blockNumber: bigint): Promise<boolean> {
        try {
            let curveLogs = await this.wsClient.getLogs({
                address: CURVE_USDE_USDC,
                fromBlock: blockNumber,
                toBlock: blockNumber,
            });
            if (curveLogs.length > 0) {
                return true;
            }
            let v3Logs = await this.wsClient.getLogs({
                address: V3_USDT_USDE_100,
                fromBlock: blockNumber,
                toBlock: blockNumber,
            });
            if (v3Logs.length > 0) {
                return true;
            }
            console.log("No related logs");
            return false;
        } catch (error) {
            console.log("Fail to filter logs", error);
            return false;
        }
    }

    public async updateNativePrice(){
        let contract = getContract({
            address: ETH_CHAINLINK_ORACLE,
            abi: ChainLink_Oracle_ABI,
            client: this.wsClient
        });
        try{
            let res = await contract.read.latestRoundData();
            let [roundId, answer,startedAt, updatedAt, answeredInRound] = res;
            let price = Number(formatUnits(answer,8));
            if (Number(updatedAt) != this.LastUpdate){
                this.NativePrice = price;
                let time = new Date(Number(updatedAt * 1000n))
                console.log('Update native price on',time.toISOString(), 'new price', this.NativePrice);
            }
        }catch(error){
            console.log('Fail to update weth price');
        }
    }

    public async updateBlockFee(){
        try{
            let fee = await this.wsClient.estimateFeesPerGas();
            this.baseFee = fee.maxFeePerGas!
        }catch(error){
            console.log('Fail to update block price');
        }
    }

    // private reconnect() {
    //     console.log("Reconnecting...");
    //     this.wsClient = createPublicClient({
    //         chain: mainnet,
    //         transport: webSocket(this.wsUrl),
    //     });
    //     this.quoter = new USDEQuoter(this.httpUrl);
    //     this.watchEvents();
    // }
}

async function main() {
    let tracer = new Tracer(ERIGON_URL, ERIGON_WS_URL);
    tracer.init();
    // tracer.estimateBlockFee()
}

await main();
