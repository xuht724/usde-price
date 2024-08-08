import { keccak256, encodeAbiParameters } from 'viem/utils';
import fs from 'fs';

const MINTICK = -887272;
const MAXTICK = 887272;
const slotIndex = 5n;

const tickToKeyMap:any = {};

for (let key = MINTICK; key <= MAXTICK; key += 1) {
    const slotKey = encodeAbiParameters(
        [
            { type: 'int24' },
            { type: 'uint256' },
        ],
        [
            key, slotIndex
        ]
    );
    const keyHash = keccak256(slotKey);
    tickToKeyMap[key] = keyHash;
}

// Save the map to a JSON file
fs.writeFileSync('tickToKeyMap.json', JSON.stringify(tickToKeyMap, null, 2), 'utf-8');
