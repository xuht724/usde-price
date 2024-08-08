import {createPublicClient, encodePacked, getContract, http} from 'viem'
import { mainnet } from 'viem/chains'
import { ERIGON_URL } from '../config'
import { uniswapV3PoolABI } from '../abi/uniswapV3pool'
import { UniswapV3QuoterV2Address, USDC, USDE } from '../constants'
import { uniV3QuoterV2ABI } from '../abi/v3Quoter'

function encodePath(
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

async function main(){
    let client = createPublicClient({
        chain: mainnet,
        transport: http(ERIGON_URL),
    })

    let v3Quoter = getContract({
        address: UniswapV3QuoterV2Address,
        abi: uniV3QuoterV2ABI,
        client: client
    })

    let flag = true;
    let fee = 100;

    let path = encodePath(
        flag,
        USDE,
        USDC,
        fee
    );

}