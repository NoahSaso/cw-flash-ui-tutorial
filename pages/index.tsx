import { useEffect, useState } from 'react'

import type { NextPage } from 'next'
import Image from 'next/image'

import { toast } from 'react-hot-toast'

import { useRecoilValueLoadable, useSetRecoilState } from 'recoil'

import { ExecuteResult, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'

import { Background } from '../components/Background'
import { BigCard } from '../components/BigCard'
import { CardRow } from '../components/CardRow'
import { Header } from '../components/Header'
import { Title } from '../components/Title'
import { Mono } from '../components/Mono'
import { ActionCard } from '../components/ActionButton'
import { TVL, TVLLoading } from '../components/TVL'
import { Loader } from '../components/Loader'

import { nativeTVLSelector, stateUpdatesAtom } from '../selectors/contract'
import { ExecuteCard, LoadingExecuteCard } from '../components/ExecuteCard'
import {
  convertDenomToMicroDenom,
  convertMicroDenomToDenom,
} from '../util/conversion'
import { isValidContractAddress } from '../util/validation'
import { CONTRACT_ADDR, DENOM_NAME } from '../util/constants'
import { TXHash } from '../components/TXHash'
import { useWalletManager, WalletConnectionStatus } from '@noahsaso/cosmodal'

const Home: NextPage = () => {
  const { connect, status } = useWalletManager()

  const [loading, setLoading] = useState(false)

  const setStateUpdates = useSetRecoilState(stateUpdatesAtom)
  const tvl = useRecoilValueLoadable(nativeTVLSelector)

  const [validate, setValidate] = useState(false)

  const [amount, setAmount] = useState(0)
  const [receiver, setReceiver] = useState('')

  const [amountError, setAmountError] = useState<undefined | string>(undefined)
  const [receiverError, setReceiverError] = useState<undefined | string>(
    undefined
  )

  const validateAmount = (amount: number): string | undefined => {
    if (tvl.state !== 'hasValue') {
      return
    }
    if (isNaN(amount)) {
      return 'Unspecified'
    }
    if (amount > convertMicroDenomToDenom(tvl.contents)) {
      return 'Greater than TVL.'
    } else if (amount <= 0) {
      return 'Not positive.'
    } else {
      return undefined
    }
  }

  const validateReceiver = (receiver: string) => {
    if (!isValidContractAddress(receiver, 'juno')) {
      return 'Not a contract address.'
    } else {
      return undefined
    }
  }

  const executeLoan = (
    client: SigningCosmWasmClient | undefined,
    walletAddress: string | undefined
  ) => {
    if (validateReceiver(receiver) || validateAmount(amount)) {
      setValidate(true)
      return
    }
    if (!client || !walletAddress) {
      toast.error('Wallet not connected.')
      return
    }

    setLoading(true)

    // TODO: Execute CONTRACT_ADDR's ExecuteMsg::Loan action
    // ExecuteMsg variant:
    // https://github.com/ezekiiel/cw-flash-loan/blob/3b77e6bc2c1c02f359c3430329c77917e3b9b3fc/contracts/cw-flash-loan/src/msg.rs#L25
    const execution: Promise<ExecuteResult> = Promise.reject(
      new Error('TODO: Implement execute call')
    )
    // const execution = ...

    execution
      .catch((e) => toast.error(e.message))
      .then((r) => {
        if (typeof r !== 'string') {
          toast.success('', { icon: <TXHash hash={r.transactionHash} /> })
        }
      })
      .finally(() => {
        setLoading(false)
        setValidate(false)
        setStateUpdates((n) => n + 1)
      })
  }

  useEffect(
    () => setAmountError(validate ? validateAmount(amount) : undefined),
    [amount, validate]
  )

  useEffect(
    () => setReceiverError(validate ? validateReceiver(receiver) : undefined),
    [receiver, validate]
  )

  return (
    <Background theme="loan">
      <Header title="Flash Loan" />
      <CardRow>
        <BigCard>
          <Title>Loan amount</Title>
          <div className="flex flex-col gap-3">
            <input
              className={`font-header w-full px-1 ${
                amountError
                  ? 'rounded border-2 border-accent'
                  : 'border-2 border-transparent border-b-white'
              } bg-card text-[52px] text-white outline-none`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.valueAsNumber)}
            />
            {!amountError ? (
              <div className="flex flex-row items-center gap-2">
                <Image
                  layout="fixed"
                  src="/juno.png"
                  alt="juno logo"
                  width={16}
                  height={16}
                />
                <Mono>{DENOM_NAME}</Mono>
              </div>
            ) : (
              <Mono>{amountError}</Mono>
            )}
          </div>
        </BigCard>
        <BigCard>
          <Title>Receiving contract</Title>
          <div className="flex flex-col gap-3">
            <input
              className={`font-header w-full px-1 ${
                receiverError
                  ? 'rounded border-2 border-accent'
                  : 'border-2 border-transparent border-b-white'
              } bg-card text-[52px] text-white outline-none`}
              type="string"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
            />
            {receiverError && <Mono>{receiverError}</Mono>}
          </div>
        </BigCard>
      </CardRow>
      <CardRow>
        <Loader fallback={<TVLLoading />}>
          <TVL />
        </Loader>
        {status !== WalletConnectionStatus.Connected && (
          <ActionCard onClick={connect}>
            <Title>Connect wallet</Title>
          </ActionCard>
        )}
        {status === WalletConnectionStatus.Connected &&
          (!amountError && !receiverError ? (
            <Loader
              loading={tvl.state === 'loading' || loading}
              fallback={<LoadingExecuteCard />}
            >
              <ExecuteCard onClick={executeLoan}>
                <Title>Execute loan</Title>{' '}
              </ExecuteCard>
            </Loader>
          ) : (
            <ActionCard striped>
              <Title>Execute loan</Title>
            </ActionCard>
          ))}
      </CardRow>
    </Background>
  )
}

export default Home
