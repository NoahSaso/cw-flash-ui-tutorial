import { FC } from 'react'

import Image from 'next/image'

import { useRecoilValue } from 'recoil'
import { nativeTVLSelector } from '../selectors/contract'
import { convertMicroDenomToDenom } from '../util/conversion'
import { BigCard } from './BigCard'
import { LoadingMono, Mono } from './Mono'
import { LoadingTitle, Title } from './Title'
import { FEE_DENOM } from '../util/constants'

export interface TVLProps {}

export const TVL: FC<TVLProps> = ({}) => {
  const nativeTVL = useRecoilValue(nativeTVLSelector)

  return (
    <BigCard>
      <div className="flex flex-col gap-2">
        <Title>TVL</Title>
        <div className="flex flex-row items-center gap-2">
          <Image
            layout="fixed"
            src="/juno.png"
            alt="juno logo"
            width={16}
            height={16}
          />
          <Mono>
            {convertMicroDenomToDenom(nativeTVL).toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}{' '}
            ${FEE_DENOM.slice(1).toUpperCase()} provided
          </Mono>
        </div>
      </div>
    </BigCard>
  )
}

export const TVLLoading: FC<TVLProps> = ({}) => (
  <BigCard>
    <div className="flex animate-pulse flex-col gap-2">
      <LoadingTitle>$ ?? TVL</LoadingTitle>
      <div className="flex flex-row items-center gap-2">
        <Image
          layout="fixed"
          src="/juno.png"
          alt="juno logo"
          width={16}
          height={16}
        />
        <LoadingMono>?? Juno provided</LoadingMono>
      </div>
    </div>
  </BigCard>
)
