import { FC, useState } from 'react'

import { Mono } from './Mono'

import {
  DuplicateIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
} from '@heroicons/react/outline'
import { MINTSCAN_TXS_PREFIX } from '../util/constants'

export interface TXHashProps {
  hash: string
}

const displayableHash = (address: string) => {
  const first = address.slice(0, 7)
  const last = address.substring(address.length - 7)
  return `${first}...${last}`
}

export const TXHash: FC<TXHashProps> = ({ hash }) => {
  const [copied, setCopied] = useState(false)

  return (
    <>
      <button
        type="button"
        className="flex flex-row items-center gap-2"
        onClick={() => {
          navigator.clipboard.writeText(hash)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? (
          <CheckCircleIcon className="w-6 text-white" />
        ) : (
          <DuplicateIcon className="w-6 text-white" />
        )}
        <Mono>TX {displayableHash(hash)}</Mono>
      </button>

      <a href={`${MINTSCAN_TXS_PREFIX}${hash}`} target="_blank" rel="noopener">
        <ExternalLinkIcon className="w-6 text-white" />
      </a>
    </>
  )
}
