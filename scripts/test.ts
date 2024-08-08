import { createPublicClient, getContract, http } from 'viem';
import { mainnet } from 'viem/chains';
import { keccak256, toBytes, encodeAbiParameters, decodeAbiParameters, getAddress, toHex } from 'viem/utils';
import { ERIGON_URL } from '../src/config';
import { uniswapV3PoolABI } from '../src/abi/uniswapV3pool';

// 创建一个公共客户端
const client = createPublicClient({
  chain: mainnet,
  transport: http(ERIGON_URL),
});

const contractAddress = getAddress("0x7858E59e0C01EA06Df3aF3D20aC7B0003275D4Bf");
const key = 0; // 你的 key
const slotIndex = 5n; // 假设 ticks 是第 12 个变量，因此 slotIndex = 12 - 1

const slotKey = encodeAbiParameters(
  [
    { type: 'int24' },
    { type: 'uint256'},
  ],
  [
    key, slotIndex
  ]
);
const baseStoragePosition = keccak256(slotKey);
console.log(baseStoragePosition);

// 获取并解析存储数据
async function getTickInfo(basePosition:any) {

  const positions = Array.from({ length: 4 }, (_, i) => 
    `0x${(BigInt(basePosition) + BigInt(i)).toString(16)}`
  );

  // console.log(positions);

  let begin = performance.now();
  const values = await Promise.all(
    positions.map(position => client.getStorageAt({ address: contractAddress, slot: position as any }))
  );
  let end = performance.now();
  console.log('request cost',end - begin);

  const decodedValues:any = values.map((value, index) => {
    if (value === undefined) {
      // 提供默认值
      switch (index) {
        case 0: return [BigInt(0), BigInt(0)]; // liquidityNet, liquidityGross (int128, uint128)
        case 1: return BigInt(0); // feeGrowthOutside0X128 (uint256)
        case 2: return BigInt(0); // feeGrowthOutside1X128 (uint256)
        case 3: return [false, BigInt(0), BigInt(0), BigInt(0)]; // initialized, secondsOutside, secondsPerLiquidityOutsideX128, tickCumulativeOutside (bool, uint32, uint160, int56)
        default: return BigInt(0);
      }
    } else {
      // 手动解码值
      switch (index) {
        case 0:
          // 解码slot0 (int128, uint128)
          const liquidityNet = BigInt.asIntN(128, BigInt(value) >> BigInt(128));
          const liquidityGross = BigInt(value) & BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
          return [liquidityNet, liquidityGross];
        case 1:
          // 解码slot1 (uint256)
          return BigInt(value);
        case 2:
          // 解码slot2 (uint256)
          return BigInt(value);
        case 3:
          // 解码slot3 (bool, uint32, uint160, int56)
          const boolValue = (BigInt(value) >> BigInt(248)) === BigInt(1);
          const uint32Value = (BigInt(value) >> BigInt(216)) & BigInt("0xFFFFFFFF");
          const uint160Value = (BigInt(value) >> BigInt(56)) & BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
          const int56Value = BigInt.asIntN(56, BigInt(value) & BigInt("0xFFFFFFFFFFFFFF"));
          return [boolValue, uint32Value, uint160Value, int56Value];
        default:
          return BigInt(0);
      }
    }
  });
  let end2 = performance.now()
  console.log('decode cost',end2 - end);

  return {
    liquidityNet: decodedValues[0][0].toString(),
    liquidityGross: decodedValues[0][1].toString(),
    feeGrowthOutside0X128: decodedValues[1].toString(),
    feeGrowthOutside1X128: decodedValues[2].toString(),
    initialized: decodedValues[3][0],
    secondsOutside: parseInt(decodedValues[3][1].toString()),
    secondsPerLiquidityOutsideX128: decodedValues[3][2].toString(),
    tickCumulativeOutside: decodedValues[3][3].toString()
  };
  
}

async function getTickInfoUsingCall(){
  let contract = getContract({
    address: contractAddress,
    abi: uniswapV3PoolABI,
    client: client
  })

  let begin = performance.now();
  let tick = await contract.read.ticks([0])
  let end = performance.now();
  console.log('end-begin',end-begin);
  console.log(tick);
}
getTickInfoUsingCall();

getTickInfo(baseStoragePosition)
  .then(console.log)
  .catch(console.error);
