import { selector, atom, selectorFamily } from 'recoil'

import { cosmWasmClientSelector } from './chain'

import { CONTRACT_ADDR, FEE_DENOM } from '../util/constants'

export const stateUpdatesAtom = atom({
  key: 'stateUpdatesAtom',
  default: 0,
})

export const nativeTVLSelector = selector({
  key: 'junoTVLSelector',
  get: async ({ get }) => {
    get(stateUpdatesAtom)
    const client = get(cosmWasmClientSelector)
    const locked = await client.getBalance(CONTRACT_ADDR, FEE_DENOM)
    return locked.amount
  },
})

export const feeSelector = selector({
  key: 'feeSelector',
  get: async ({ get }) => {
    get(stateUpdatesAtom)
    const client = get(cosmWasmClientSelector)

    // TODO: Get CONTRACT_ADDR's QueryMsg::GetConfig response
    // QueryMsg variant:
    // https://github.com/ezekiiel/cw-flash-loan/blob/3b77e6bc2c1c02f359c3430329c77917e3b9b3fc/contracts/cw-flash-loan/src/msg.rs#L35
    // Response:
    // https://github.com/ezekiiel/cw-flash-loan/blob/3b77e6bc2c1c02f359c3430329c77917e3b9b3fc/contracts/cw-flash-loan/src/msg.rs#L43-L48
    const config = await client.queryContractSmart(CONTRACT_ADDR, {
      get_config: {},
    })

    return config.fee
  },
})

export const providedSelector = selectorFamily<string, string>({
  key: 'walletProvidedSelector',
  get:
    (address) =>
    async ({ get }) => {
      get(stateUpdatesAtom)
      const client = get(cosmWasmClientSelector)

      // TODO: Get CONTRACT_ADDR's QueryMsg::Provided response
      // QueryMsg variant:
      // https://github.com/ezekiiel/cw-flash-loan/blob/3b77e6bc2c1c02f359c3430329c77917e3b9b3fc/contracts/cw-flash-loan/src/msg.rs#L36
      // Function definition, no custom struct response:
      // https://github.com/ezekiiel/cw-flash-loan/blob/3b77e6bc2c1c02f359c3430329c77917e3b9b3fc/contracts/cw-flash-loan/src/contract.rs#L362
      const provided = await client.queryContractSmart(CONTRACT_ADDR, {
        provided: { address },
      })

      return provided
    },
})
