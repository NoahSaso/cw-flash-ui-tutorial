import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { StargateClient } from '@cosmjs/stargate'
import { selector } from 'recoil'

import { CHAIN_RPC_ENDPOINT } from '../util/constants'

export const stargateClientSelector = selector({
  key: 'stargateClient',
  get: () => StargateClient.connect(CHAIN_RPC_ENDPOINT),
})

export const cosmWasmClientSelector = selector({
  key: 'cosmWasmClient',
  get: () => CosmWasmClient.connect(CHAIN_RPC_ENDPOINT),
})

export const blockHeightSelector = selector({
  key: 'blockHeight',
  get: async ({ get }) => {
    const client = get(cosmWasmClientSelector)
    return await client.getHeight()
  },
})
