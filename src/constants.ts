export const HubTokens = [
    // WETH
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    // USDC
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    // USDT
    "0xdac17f958d2ee523a2206206994597c13d831ec7",
    // DAI
    '0x6b175474e89094c44da98b954eedeac495271d0f',
    // WBTC
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    // USDE
    '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
    // sDAI
    "0x83F20F44975D03b1b09e64809B757c47f942BEeA",
]

export const v2factoryList = [
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",// uniswapv2
    "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",// sushiswapv2
    "0x1097053Fd2ea711dad45caCcc45EfF7548fCB362", // pancakeswapv2
    "0x115934131916C8b277DD010Ee02de363c09d037c" // shibaswap
]
export const v3factoryList = [
    "0x1F98431c8aD98523631AE4a59f267346ea31F984", // uniswapv3
    "0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4F", // sushiswapv3
    "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865" // pancakeswapv3
]

export const USDE = '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3';
export const sUSDE = '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497';
export const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
export const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
export const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

export const V3_USDT_USDE_100 = '0x435664008F38B0650fBC1C9fc971D0A3Bc2f1e47';
export const V3_USDC_USDE_100 = '0xE6D7EbB9f1a9519dc06D557e03C522d53520e76A';

export const CURVE_USDE_USDC = '0x02950460e2b9529d0e00284a5fa2d7bdf3fa4d72';
export const CURVE_USDE_crvUSD = '0xf55b0f6f2da5ffddb104b58a60f2862745960442';
export const CURVE_FRAX_USDe = '0x5dc1bf6f1e983c0b21efb003c105133736fa0743';

export const CURVE_sUSDE_sDAI = '0x167478921b907422F8E88B43C4Af2B8BEa278d3A';


export const UniswapV3QuoterV2Address =
'0x61fFE014bA17989E743c5F6cB21bF9697530B21e';


export const StableCoinDecimalMap = {
    "USDC": 6,
    "USDT": 6,
    "USDe": 18,
    "DAI": 18
} as const

export enum StableCoin {
    USDT = 'USDT',
    USDC = 'USDC',
    DAI = 'DAI',
    USDe = 'USDe'
}

export enum PoolType {
	UNISWAP_V2_LIKE_POOL = 'uniswap_v2_like_pool',
	UNISWAP_V3_LIKE_POOL = 'uniswap_v3_like_pool',
    CURVE = 'curve',
	UNI_LIMIT_ORDER = 'uni_limit_order',
	V6_LIMIT_ORDER = 'v6_limit_order',
	ZEROX_LIMIT_ORDER = 'zero_limit_order',

	UNKNOWN = 'unknown'
}

export const ETH_CHAINLINK_ORACLE = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';