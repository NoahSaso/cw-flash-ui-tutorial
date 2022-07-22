# CosmWasm Flash Loan UI Tutorial

**There are really just TWO CosmJS functions that you will use to talk to smart
contracts when building a front end.** (aside from the initial `connect` call).

https://github.com/cosmos/cosmjs/blob/3222172e6a/packages/cosmwasm-stargate/src/cosmwasmclient.ts#L441

```ts
cosmWasmClient.queryContractSmart(
  address: string,
  queryMsg: Record<string, unknown>,
): Promise<JsonObject>
```

https://github.com/cosmos/cosmjs/blob/3222172e6a/packages/cosmwasm-stargate/src/signingcosmwasmclient.ts#L397

```ts
signingCosmWasmClient.execute(
  senderAddress: string,
  contractAddress: string,
  msg: Record<string, unknown>,
  fee: StdFee | "auto" | number,
  memo = "",
  funds?: readonly Coin[],
): Promise<ExecuteResult>
```

## Setup

**Queries**

```ts
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'

// Connect to chain
const cosmWasmClient = await CosmWasmClient.connect(CHAIN_RPC_ENDPOINT)
```

**Executions**

### Manual

```ts
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { GasPrice } from '@cosmjs/stargate'
import { getKeplrFromWindow } from '@keplr-wallet/stores'

// Connect Keplr
const keplr = await getKeplrFromWindow()
await keplr.enable(CHAIN_ID)
const offlineSigner = await keplr.getOfflineSignerAuto(CHAIN_ID)

// Retrieve wallet address
const walletAddress = (await keplr.getKey(CHAIN_ID)).bech32Address

// Connect to chain
const signingCosmWasmClient = await SigningCosmWasmClient.connect(
  CHAIN_RPC_ENDPOINT,
  offlineSigner,
  { gasPrice: GasPrice.fromString('0.0025ujunox') }
)
```

### Automatic

Managing wallet connection, supporting mobile WalletConnect, and setting up
signing clients are patterns that repeat themselves in all Cosmos apps, so
naturally there are libraries to handle all of this for you. I refactored
[cosmodal](https://github.com/chainapsis/cosmodal) (one of those libraries) to
be a bit more stable and contain additional common patterns. As of writing this,
[my version of cosmodal](https://github.com/NoahSaso/cosmodal) is also being
refactored to be more adaptable and support more than just React apps. In the
meantime, my version is a straightforward solution when using React, and we will
use it in this tutorial going forward. There's really no good reason to set up
and maintain wallet connection and signing clients yourself.

Installation instructions and an example can be found on [cosmodal's
README](https://github.com/NoahSaso/cosmodal). It is also implemented in this
repo already. Check out `_app.tsx`.

To access the signing client and wallet address, which are both necessary to use
the `execute` function shown at the beginning, we can simply use the hooks
provided by cosmodal in any component:

```tsx
import { useWallet, useWalletManager } from '@noahsaso/cosmodal'

const Component: () => {
  const { connect, connected, disconnect } = useWalletManager()
  const { signingCosmWasmClient, address } = useWallet()

  const doSomething = () => {
    if (!signingCosmWasmClient || !address) {
      alert("Wallet not connected")
      return
    }

    signingCosmWasmClient.execute(
      address,
      "junoSomeContractAddress",
      ...
    )
  }

  return connected ? (
    <div>
      <button onClick={doSomething}>
        Do something!
      </button>

      <button onClick={disconnect}>
        Disconnect
      </button>
    </div>
  ) : (
    <button onClick={connect}>
      Connect
    </button>
  )
}
```

## Example Usage

### Query

Say we want to determine the current USDC price of the wallet's JUNO. From
[JunoSwap's JSON of its liquidity
pools](https://raw.githubusercontent.com/CosmosContracts/junoswap-asset-list/b750988592fa04d849910e2cb8c12d01af5c6516/pools_list.json),
we find that the JUNO-USDC swap smart contract address is
`juno1ctsmp54v79x7ea970zejlyws50cj9pkrmw49x46085fn80znjmpqz2n642`.

The swap smart contract code can be found
[here](https://github.com/Wasmswap/wasmswap-contracts/tree/1e1eaeca4dd9a65d69c4d5f2406bdb7f56754eb9),
the specific query message variant we care about is
[here](https://github.com/Wasmswap/wasmswap-contracts/blob/1e1eaeca4dd9a65d69c4d5f2406bdb7f56754eb9/src/msg.rs#L67-L69),
and its response is
[here](https://github.com/Wasmswap/wasmswap-contracts/blob/1e1eaeca4dd9a65d69c4d5f2406bdb7f56754eb9/src/msg.rs#L86-L88).

Using these message and response types, and the clients and hooks we saw above,
we can get the USDC value of the JUNO in the connected wallet.

```tsx
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { useWallet, useWalletManager } from '@noahsaso/cosmodal'
import { useEffect, useState } from 'react'

const CHAIN_RPC_ENDPOINT = 'https://rpc-juno.itastakers.com:443'
const JUNO_USDC_SWAP_ADDRESS =
  'juno1ctsmp54v79x7ea970zejlyws50cj9pkrmw49x46085fn80znjmpqz2n642'

const ViewBalance = () => {
  const { connect, connected, disconnect } = useWalletManager()
  // Retrieve wallet address from cosmodal. We don't need the signing client since
  // we're just querying a contract, and don't need to sign any transactions just
  // to ask for data.
  const { name, address } = useWallet()

  const [cosmWasmClient, setCosmWasmClient] = useState<
    CosmWasmClient | undefined
  >()
  // Connect to chain on component mount
  useEffect(() => {
    CosmWasmClient.connect(CHAIN_RPC_ENDPOINT).then((client) =>
      setCosmWasmClient(client)
    )
  }, [])

  const [junoBalance, setJunoBalance] = useState<string | undefined>()
  const [usdcBalance, setUsdcBalance] = useState<string | undefined>()
  useEffect(() => {
    // Cannot load data until these are loaded.
    if (!cosmWasmClient || !address) {
      return
    }

    const fetch = async () => {
      // Retrieve wallet balance of ujuno
      const ujunoBalance = (await cosmWasmClient.getBalance(address, 'ujuno'))
        .amount

      // Query the Juno-USDC swap smart contract for the USDC value.
      // Rust query enum:
      //    QueryMsg::Token1ForToken2Price {
      //        token1_amount: Uint128
      //    }
      // Rust response:
      //    struct Token1ForToken2PriceResponse {
      //        token2_amount: Uint128
      //    }
      const response = await cosmWasmClient.queryContractSmart(
        JUNO_USDC_SWAP_ADDRESS,
        {
          token1_for_token2_price: {
            token1_amount: ujunoBalance,
          },
        }
      )

      // ujuno is the smallest denomination of juno, i.e. 1 ujuno = 0.000001
      // juno (or ujuno = juno * 1e6)
      // Since the contract expects an integer and ujuno has no decimals, we use
      // it as the input, and convert the output by shifting it 6 decimal places
      // only after performing the price conversion. `response.token2_amount`
      // has units of USDC * 1e6 since the input `token1_amount`/`ujunoBalance`
      // has units of JUNO * 1e6. Thus, to get USDC, we divide output by 1e6.
      const usdcBalance = Number(response.token2_amount) / 1e6

      const junoBalance = Number(ujunoBalance) / 1e6
      setJunoBalance(junoBalance.toFixed(6))
      setUsdcBalance(usdcBalance.toFixed(6))
    }

    fetch().catch(console.error)
  }, [cosmWasmClient, address])

  return connected ? (
    <div>
      {junoBalance && usdcBalance ? (
        <p>
          Your wallet named "{name}" contains {junoBalance} JUNO, currently
          worth {usdcBalance} USDC.
        </p>
      ) : (
        <p>Loading...</p>
      )}

      <br />

      <button onClick={disconnect}>Disconnect</button>
    </div>
  ) : (
    <button onClick={connect}>Connect</button>
  )
}
```

A **_really important concept to keep in mind_** about this example is currency
decimals. For native tokens, generally speaking, the denominations we are
familiar with (e.g. `JUNO`, `ATOM`, `STARS`) are just conveniences for our human
brains. In reality, they all exist as integers with `u`-prefixed denoms, such as
`ujuno`, `uatom`, and `ustars`. The number of decimals a token has actually
corresponds to the conversion between its true micro denomination, represented
in smart contracts and the blockchain itself, and the larger denomination we
expect to see. The majority of tokens in the Cosmos use 6 decimals.

### Execute

Now say we want to swap 10% of a wallet's balance for USDC. We use the same swap
smart contract address from the `Query` section above to perform the swap.

The swap smart contract code can be found
[here](https://github.com/Wasmswap/wasmswap-contracts/tree/1e1eaeca4dd9a65d69c4d5f2406bdb7f56754eb9)
and the specific execute message variant we care about is
[here](https://github.com/Wasmswap/wasmswap-contracts/blob/1e1eaeca4dd9a65d69c4d5f2406bdb7f56754eb9/src/msg.rs#L36-L41).

Using these message and response types, and the queries from the last example,
we can add just one `execute` call to make the swap.

```tsx
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { coin } from '@cosmjs/stargate'
import { useWallet, useWalletManager } from '@noahsaso/cosmodal'
import { useCallback, useEffect, useState } from 'react'

const CHAIN_RPC_ENDPOINT = 'https://rpc-juno.itastakers.com:443'
const JUNO_USDC_SWAP_ADDRESS =
  'juno1ctsmp54v79x7ea970zejlyws50cj9pkrmw49x46085fn80znjmpqz2n642'

const Swap = () => {
  const { connect, connected, disconnect } = useWalletManager()
  // Retrieve wallet address from cosmodal. We don't need the signing client since
  // we're just querying a contract, and don't need to sign any transactions just
  // to ask for data.
  const { name, address, signingCosmWasmClient } = useWallet()

  const [cosmWasmClient, setCosmWasmClient] = useState<
    CosmWasmClient | undefined
  >()
  // Connect to chain on Component mount
  useEffect(() => {
    CosmWasmClient.connect(CHAIN_RPC_ENDPOINT).then((client) =>
      setCosmWasmClient(client)
    )
  }, [])

  // Current balances
  const [junoBalance, setJunoBalance] = useState<string | undefined>()
  const [usdcBalance, setUsdcBalance] = useState<string | undefined>()
  // Swap balances
  const [junoBalanceToSwap, setJunoBalanceToSwap] = useState<
    number | undefined
  >()
  const [minUsdcBalanceOutput, setMinUsdcBalanceOutput] = useState<
    number | undefined
  >()

  // Swap transaction response info.
  const [swapTx, setSwapTx] = useState<string | undefined>()
  const [swapError, setSwapError] = useState<string | undefined>()

  // Retrieve current balances.
  useEffect(() => {
    // Cannot load data until these are loaded.
    if (!cosmWasmClient || !address) {
      return
    }

    const fetch = async () => {
      setJunoBalance(undefined)
      setUsdcBalance(undefined)
      setJunoBalanceToSwap(undefined)
      setMinUsdcBalanceOutput(undefined)

      const ujunoBalance = (await cosmWasmClient.getBalance(address, 'ujuno'))
        .amount

      const response = await cosmWasmClient.queryContractSmart(
        JUNO_USDC_SWAP_ADDRESS,
        {
          token1_for_token2_price: {
            token1_amount: ujunoBalance,
          },
        }
      )

      const usdcBalance = Number(response.token2_amount) / 1e6
      const junoBalance = Number(ujunoBalance) / 1e6

      setJunoBalance(junoBalance.toFixed(6))
      setUsdcBalance(usdcBalance.toFixed(6))

      // Calculate balances for 10% swap.
      setJunoBalanceToSwap(Number((junoBalance * 0.1).toFixed(6)))
      // Allow for 1% slippage in price since we checked the swap price.
      setMinUsdcBalanceOutput(Number((usdcBalance * 0.1 * 0.99).toFixed(6)))
    }

    fetch().catch(console.error)
  }, [
    cosmWasmClient,
    address,
    // Refresh balances when a swap transaction succeeds.
    swapTx,
  ])

  const swapTenPercent = useCallback(async () => {
    // Cannot swap until these are loaded.
    if (
      !signingCosmWasmClient ||
      !address ||
      !junoBalanceToSwap ||
      !minUsdcBalanceOutput
    ) {
      return
    }

    setSwapError(undefined)

    // Convert to micro denominations and cut off all decimals.
    const ujunoBalanceToSwap = Math.floor(junoBalanceToSwap * 1e6).toFixed(0)
    const minMicroUsdcBalanceOutput = Math.floor(
      minUsdcBalanceOutput * 1e6
    ).toFixed(0)

    try {
      // Execute the swap message on the Juno-USDC swap smart contract.
      // TokenSelect is "Token1" or "Token2".
      // Option types can be omitted or set to null.
      // Rust execute enum:
      //    ExecuteMsg::Swap {
      //        input_token: TokenSelect
      //        input_amount: Uint128
      //        min_output: Uint128
      //        expiration: Option<Expiration>
      //    }
      const response = await signingCosmWasmClient.execute(
        address,
        JUNO_USDC_SWAP_ADDRESS,
        {
          swap: {
            input_token: 'Token1',
            input_amount: ujunoBalanceToSwap,
            min_output: minMicroUsdcBalanceOutput,
          },
        },
        'auto',
        undefined,
        [coin(ujunoBalanceToSwap, 'ujuno')]
      )

      // Log response to console so we can inspect its data.
      console.log(response)
      setSwapTx(response.transactionHash)
    } catch (error) {
      // Log error to console and update state so we display it.
      console.error(error)
      setSwapError(error instanceof Error ? error.message : `${error}`)
    }
  }, [signingCosmWasmClient, address, junoBalanceToSwap, minUsdcBalanceOutput])

  return connected ? (
    <div>
      {junoBalance && usdcBalance ? (
        <>
          <p>
            Your wallet named "{name}" contains {junoBalance} JUNO, currently
            worth {usdcBalance} USDC.
          </p>

          <br />

          {junoBalanceToSwap !== undefined &&
            minUsdcBalanceOutput !== undefined && (
              <>
                <button onClick={swapTenPercent}>
                  Swap 10% ({junoBalanceToSwap?.toFixed(6)} JUNO) for at least{' '}
                  {minUsdcBalanceOutput?.toFixed(6)} USDC
                </button>
                <br />

                {!!swapTx && (
                  <p>
                    Swap succeeded with transaction hash <b>{swapTx}</b>
                  </p>
                )}
                {!!swapError && (
                  <>
                    <p>Swap failed with error:</p>
                    <pre>{swapError}</pre>
                  </>
                )}
              </>
            )}
        </>
      ) : (
        <p>Loading...</p>
      )}

      <br />
      <button onClick={disconnect}>Disconnect</button>
    </div>
  ) : (
    <button onClick={connect}>Connect</button>
  )
}
```
