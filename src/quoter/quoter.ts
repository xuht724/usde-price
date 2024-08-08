import { mainnet } from "viem/chains";
import { createPublicClient, encodePacked, formatUnits, getAddress, getContract, http,parseEther,parseUnits,PublicClient } from "viem";
import Web3, { HttpProvider } from "web3";
import { uniV3QuoterV2ABI } from "../abi/v3Quoter";
import { UniswapV3QuoterV2Address, USDT,USDE,USDC, CURVE_USDE_USDC, StableCoinDecimalMap, StableCoin, PoolType } from "../constants";
import { ERIGON_URL } from "../config";
import { CurveStableSwapNG_ABI } from "../abi/CurveStableSwapNG";

type UniV3QuoteArgs = {
    isZeroForOne: boolean;
    amountIn: bigint;
    token0: string;
    token1: string;
    fee: bigint;
}

type OptimalRes = {
    tokenIn: StableCoin,
    tokenOut: StableCoin,
    amountIn: bigint,
    amountOut: bigint,
    poolType: PoolType
}

const TRX_GASCOST = 200000n

// const ETSWAP_GASCOST = 200000n 

export class USDEQuoter{
    myWeb3 : Web3
	publicClient: PublicClient;
    constructor(nodeurl: string){
        this.myWeb3 = new Web3(new HttpProvider(nodeurl));
        this.publicClient = createPublicClient({
			chain: mainnet,
			transport: http(nodeurl),
		});
    }

    private async handleETSwap(
        initialAmount: string,
        endAmount: string,
        blockNumber?: bigint,
    ): Promise<OptimalRes[] | null> {
        const bigInitialAmount = Number(initialAmount);
        const initialAmountE = parseUnits(initialAmount, StableCoinDecimalMap["USDe"]);
        const initialAmountT = parseUnits(initialAmount, StableCoinDecimalMap["USDT"]);
        const endAmountE = parseUnits(endAmount,StableCoinDecimalMap["USDe"])
        const endAmountT = parseUnits(endAmount, StableCoinDecimalMap["USDT"]);


        // Quote in both directions for e_t and t_e
        const quoteET = await this.quote_e_t(true, initialAmountE, blockNumber);
        const quoteTE = await this.quote_e_t(false, initialAmountT, blockNumber);

        const formatQuoteET = Number(formatUnits(quoteET, StableCoinDecimalMap.USDT));
        const formatQuoteTE = Number(formatUnits(quoteTE, StableCoinDecimalMap.USDe));

        if (formatQuoteET <= bigInitialAmount && formatQuoteTE <= bigInitialAmount) {
            console.log('No Profit on ET Swap');
            return null;
        } else if (formatQuoteET > bigInitialAmount) {
            return this.calculateOptimalET(true, initialAmountE, endAmountE, blockNumber );
        } else {
            return this.calculateOptimalET(false, initialAmountT, endAmountT, blockNumber );
        }
    }

    private async calculateOptimalET(
        isET: boolean,
        initialAmount: bigint,
        endAmount: bigint,
        blockNumber?: bigint,
    ): Promise<OptimalRes[]> {
        let optimalAmount = initialAmount;
        let maxProfit = 0;
        let bestQuote = 0n;

        let maxRate = 0;
        let optRateAmount = initialAmount;
        let maxRateProfit = 0;
        let bestRateQuote = 0n;


        const tokenIn = isET ? StableCoin.USDe : StableCoin.USDT;
        const tokenOut = isET ? StableCoin.USDT : StableCoin.USDe;
        const inputDecimals = isET ? StableCoinDecimalMap.USDe : StableCoinDecimalMap.USDT;
        const outputDecimals = isET ? StableCoinDecimalMap.USDT : StableCoinDecimalMap.USDe;

        const batchAmount = (endAmount - initialAmount) / 20n;
    
        for (let amount = initialAmount; amount <= endAmount; amount += batchAmount) {
            const quote = isET ? await this.quote_e_t(true, amount, blockNumber) : await this.quote_e_t(false, amount, blockNumber);
            
            let formatIn = Number(formatUnits(amount,inputDecimals));
            let formatOut = Number(formatUnits(quote,outputDecimals))
            let profit = formatOut - formatIn
            let rate = profit / formatIn
            if (profit>maxProfit) {
                maxProfit = profit;
                optimalAmount = amount;
                bestQuote = quote;
            }
            if(rate > maxRate){
                optRateAmount = amount;
                maxRateProfit = profit;
                bestRateQuote = quote;
                maxRate = rate;
            }
        }

        return [{
            tokenIn,
            tokenOut,
            amountIn: optimalAmount,
            amountOut: bestQuote,
            poolType: PoolType.UNISWAP_V3_LIKE_POOL
        },
        {
            tokenIn,
            tokenOut,
            amountIn: optRateAmount,
            amountOut: bestRateQuote,
            poolType: PoolType.UNISWAP_V3_LIKE_POOL
        },
    ];
    }

    private async handleECSwap(
        initialAmount: string,
        endAmount: string,
        blockNumber?: bigint,
    ): Promise<OptimalRes[] | null> {
        const bigInitialAmount = Number(initialAmount);
        const initialAmountE = parseUnits(initialAmount, StableCoinDecimalMap["USDe"]);
        const initialAmountC = parseUnits(initialAmount, StableCoinDecimalMap["USDC"]);
        const endAmountE = parseUnits(endAmount,StableCoinDecimalMap["USDe"])
        const endAmountC = parseUnits(endAmount, StableCoinDecimalMap["USDC"]);
        // Quote in both directions for e_c and c_e
        const quoteEC = await this.quote_e_c(true, initialAmountE, blockNumber);
        const quoteCE = await this.quote_e_c(false, initialAmountC, blockNumber);

        const formatQuoteEC = Number(formatUnits(quoteEC, StableCoinDecimalMap.USDC));
        const formatQuoteCE = Number(formatUnits(quoteCE, StableCoinDecimalMap.USDe));

        if (formatQuoteEC <= bigInitialAmount && formatQuoteCE <= bigInitialAmount) {
            console.log('No Profit on EC Swap');
            return null;
        } else if (formatQuoteEC > bigInitialAmount) {
            return this.calculateOptimalEC(true, initialAmountE, endAmountE, blockNumber );
        } else {
            return this.calculateOptimalEC(false, initialAmountC, endAmountC, blockNumber );
        }
    }

    private async calculateOptimalEC(
        isEC: boolean,
        initialAmount: bigint,
        endAmount: bigint,
        blockNumber?: bigint,
    ): Promise<OptimalRes[]> {

        let optimalAmount = initialAmount;
        let maxProfit = 0;
        let bestQuote = 0n;

        let maxRate = 0;
        let optRateAmount = initialAmount;
        let maxRateProfit = 0;
        let bestRateQuote = 0n;

        const tokenIn = isEC ? StableCoin.USDe : StableCoin.USDC;
        const tokenOut = isEC ? StableCoin.USDC : StableCoin.USDe;
        const inputDecimals = isEC ? StableCoinDecimalMap.USDe : StableCoinDecimalMap.USDC;
        const outputDecimals = isEC ? StableCoinDecimalMap.USDC : StableCoinDecimalMap.USDe;
        const batchAmount = (endAmount - initialAmount) / 20n;
  
        for (let amount = initialAmount; amount <= endAmount; amount += batchAmount) {
            const quote = isEC ? await this.quote_e_c(true, amount, blockNumber) : await this.quote_e_c(false, amount, blockNumber);
            
            let formatIn = Number(formatUnits(amount,inputDecimals));
            let formatOut = Number(formatUnits(quote,outputDecimals))
            let profit = formatOut - formatIn
            let rate = profit / formatIn
            if (profit>maxProfit) {
                maxProfit = profit;
                optimalAmount = amount;
                bestQuote = quote;
            }
            if(rate > maxRate){
                optRateAmount = amount;
                maxRateProfit = profit;
                bestRateQuote = quote
                maxRate = rate;
            }
        }

        return [{
            tokenIn,
            tokenOut,
            amountIn: optimalAmount,
            amountOut: bestQuote,
            poolType: PoolType.CURVE
        },
        {
            tokenIn,
            tokenOut,
            amountIn: optRateAmount,
            amountOut: bestRateQuote,
            poolType: PoolType.CURVE
        }];
    }

    public async handleBlockOptPath(blockNumber: bigint, nativePrice?: number, basefee?: bigint) {
        console.log(`Processing block: ${blockNumber}`);

        // Initial input amount (example: 1000 USDE)
        const initialAmount = '100000';
        const endAmount = '500000';

        // Handle ET Swap
        const optimalResET = await this.handleETSwap(initialAmount, endAmount, blockNumber);
        
        // Handle EC Swap
        const optimalResEC = await this.handleECSwap(initialAmount, endAmount, blockNumber);

        let estimaetGasCost = 0
        if(basefee && nativePrice ){
            estimaetGasCost = Number(formatUnits(basefee * TRX_GASCOST, 18)) * nativePrice
        }
        // console.log(estimaetGasCost);
        if(optimalResET){
            this.logOptimalResult(blockNumber, optimalResET[0], estimaetGasCost,nativePrice);
            this.logOptimalResult(blockNumber, optimalResET[1], estimaetGasCost,nativePrice);
        }
        // Log results
        if(optimalResEC){
            this.logOptimalResult(blockNumber, optimalResEC[0], estimaetGasCost,nativePrice);
            this.logOptimalResult(blockNumber, optimalResEC[1], estimaetGasCost,nativePrice);
    
        }

    }

    private logOptimalResult(
        blockNumber: bigint, 
        result: OptimalRes | null, 
        estimateGasCost: number,
        nativePrice?: number
    ) {
        if (result) {
            const amountIn = Number(formatUnits(result.amountIn, StableCoinDecimalMap[result.tokenIn]));
            const amountOut = Number(formatUnits(result.amountOut, StableCoinDecimalMap[result.tokenOut]));
            const profit = amountOut - amountIn;
            const rate = ((amountOut-amountIn) / amountIn);
            console.log(
                `Block: ${blockNumber}, ` +
                `${result.tokenIn} -> ${result.tokenOut}: ` +
                `Optimal Input: ${amountIn}, ` +
                `Max Profit: ${profit}, ` +
                `Estimate Base Cost: ${estimateGasCost},` + 
                `Native Price: ${nativePrice},` + 
                `Rate: ${rate}, ` +
                `TokenIn: ${result.tokenIn}, ` +
                `TokenOut: ${result.tokenOut}`  
            );
        } else {
            console.log(`Block: ${blockNumber} - No optimal result`);
        }
    }

    public async quote_e_t(
        inputUSDe: boolean,
        amountIn: bigint,
        blockNumber?: bigint
    ){
        let isZeroForOne = inputUSDe
        let args : UniV3QuoteArgs = {
            isZeroForOne,
            amountIn,
            token0: USDE,
            token1: USDT,
            fee: 100n
        }
        let out = await this.V3Quote(args, blockNumber);
        return out;
    }  
    
    public async quote_e_c(
        inputUSDe: boolean,
        amountIn: bigint,
        blockNumber?: bigint,
    ){
        let inputIndex = inputUSDe ? 0: 1;
        let outputIndex = inputUSDe ? 1: 0;
        let out = await this.curveStableTokenQuote(
            CURVE_USDE_USDC,
            inputIndex,
            outputIndex,
            amountIn,
            blockNumber
        )
        return out;
    }
    

    // return quote out
    public async V3Quote(args: UniV3QuoteArgs, blockNumber?: bigint){
        let path = this.encodePath(
            args.isZeroForOne,
            args.token0,
            args.token1,
            Number(args.fee)
        );
        try{
            let quoteContract = new this.myWeb3.eth.Contract(
                uniV3QuoterV2ABI,
                UniswapV3QuoterV2Address
            );
            let res = await quoteContract.methods
                .quoteExactInput(path, args.amountIn)
                .call(undefined, blockNumber);
            let out = BigInt(res.amountOut)
            return out;
        }catch(error){
            console.log('Fail to quote v3 price',args.token0,args.token1,args.fee);
            console.log(error);
            let res = 0n;
            return res;
        }
    }

    public async curveStableTokenQuote(
        poolAddress: string,
        inIndex: number,
        outIndex: number,
        amountIn: bigint,
        blockNumber?: bigint,
    ){
        const contract = getContract({
            address: getAddress(poolAddress),
            abi: CurveStableSwapNG_ABI,
            client: this.publicClient
        })
        try{
            let out = await contract.read.get_dy([BigInt(inIndex),BigInt(outIndex),amountIn],{blockNumber:blockNumber})
            return out;
        }catch(error){
            console.log('Fail to quote curve price');
            console.log(error);
            let res = 0n;
            return res;
        }
    }

    private encodePath(
        isZeroForOne: boolean,
        token0: string,
        token1: string,
        fee: number
    ) {
        let type_list = ['address', 'uint24', 'address'];
        let token_fee_list: any[] = [];
        if (isZeroForOne) {
            token_fee_list = [token0, fee, token1];
        } else {
            token_fee_list = [token1, fee, token0];
        }
        const path = encodePacked(type_list, token_fee_list);
        return path;
    }
}

// let quoter = new USDEQuoter(ERIGON_URL);
// async function test(){
//     let blockNumber = await quoter.publicClient.getBlockNumber();
//     await quoter.handleBlockOptPath(blockNumber);
// }
// test();
// async function testCurveQuote(){
//     let amount = 100000
//     const eIn = parseUnits(amount.toString(), 6); // USDE has 18 decimals
//     let out = await quoter.curveStableTokenQuote(
//         CURVE_USDE_USDC,
//         1,
//         0,
//         eIn
//     )
//     console.log(formatUnits(out,18));
// }

// testCurveQuote();

// async function testQuotes() {
//     const start = 10000;
//     const end = 1000000;
//     const parts = 20;
//     const increment = (end - start) / (parts - 1);

//     const tasks = [];

//     for (let i = 0; i < parts; i++) {
//         const amount = start + i * increment;
//         const eIn = parseUnits(amount.toString(), 18); // USDE has 18 decimals
//         const tIn = parseUnits(amount.toString(), 6);  // USDT has 6 decimals

//         tasks.push(async () => {
//             try {
//                 const forwardOut = await quoter.quote_e2t(true, eIn); // USDE to USDT
//                 const reverseOut = await quoter.quote_e2t(false, tIn); // USDT to USDE

//                 const forwardInFormatted = formatUnits(eIn, 18);
//                 const forwardOutFormatted = formatUnits(forwardOut, 6);
//                 const reverseInFormatted = formatUnits(tIn, 6);
//                 const reverseOutFormatted = formatUnits(reverseOut, 18);

//                 console.log(
//                     `Forward Swap In: ${forwardInFormatted} USDE - Out: ${forwardOutFormatted} USDT`
//                 );
//                 console.log(
//                     `Reverse Swap In: ${reverseInFormatted} USDT - Out: ${reverseOutFormatted} USDE`
//                 );

//                 return {
//                     forward: {
//                         in: forwardInFormatted,
//                         out: forwardOutFormatted,
//                         tokenIn: 'USDE',
//                         tokenOut: 'USDT',
//                         profit: Number(forwardOutFormatted) - Number(forwardInFormatted),
//                         rate: (Number(forwardOutFormatted) - Number(forwardInFormatted))/Number(forwardInFormatted)
//                     },
//                     reverse: {
//                         in: reverseInFormatted,
//                         out: reverseOutFormatted,
//                         tokenIn: 'USDT',
//                         tokenOut: 'USDE',
//                         profit: Number(reverseOutFormatted) - Number(reverseInFormatted),
//                         rate: (Number(reverseOutFormatted) - Number(reverseInFormatted))/Number(reverseInFormatted)
//                     }
//                 };
//             } catch (error) {
//                 console.log('Failed to quote for input:', amount);
//             }
//         });
//     }

//     const results = await Promise.all(tasks.map(task => task()));

//     return results;
// }

// Execute the function
// testQuotes().then(results => {
//     console.log('All results:', results);
// }).catch(error => {
//     console.error('Error testing quotes:', error);
// });
// async function main(){

// }
// main();