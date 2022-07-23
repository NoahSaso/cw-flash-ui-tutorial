import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { RecoilRoot } from 'recoil'

import { WalletManagerProvider, WalletType } from '@noahsaso/cosmodal'
import { GasPrice } from '@cosmjs/stargate'
import { CHAIN_ID } from '../util/constants'
import { useRouter } from 'next/router'

const LOCAL_STORAGE_KEY = 'connectedWalletId'

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const pathName = router.asPath.slice(1) || 'loan'

  return (
    <WalletManagerProvider
      walletConnectClientMeta={{
        name: 'cw-flash-ui-tutorial',
        description:
          'A tutorial of an example frontend for CosmWasm flash loans.',
        url: 'https://cw-flash-ui.vercel.app',
        icons: ['https://moonphase.is/image.svg'],
      }}
      enabledWalletTypes={[WalletType.Keplr, WalletType.WalletConnectKeplr]}
      renderLoader={() => <p>Loading...</p>}
      localStorageKey={LOCAL_STORAGE_KEY}
      defaultChainId={CHAIN_ID}
      getSigningCosmWasmClientOptions={(chainInfo) => ({
        gasPrice: GasPrice.fromString(
          '0.0025' + chainInfo.feeCurrencies[0].coinMinimalDenom
        ),
      })}
      getSigningStargateClientOptions={(chainInfo) => ({
        gasPrice: GasPrice.fromString(
          '0.0025' + chainInfo.feeCurrencies[0].coinMinimalDenom
        ),
      })}
      classNames={{
        modalContent: '!p-6 !max-w-md !bg-background !rounded ' + pathName,
        modalCloseButton:
          '!p-1 hover:!opacity-60 !rounded-full !transition !absolute !top-2 !right-2 !text-accent',
        modalHeader: '!text-white !font-header !uppercase',
        modalSubheader: '!text-white',
        wallet: '!rounded !bg-card !p-4 !shadow-none',
        walletImage: '!rounded-full',
        walletName: '!text-white !font-header',
        walletDescription: '!text-white/60',
        textContent: '!text-white',
      }}
    >
      <RecoilRoot>
        <Component {...pageProps} />
      </RecoilRoot>
    </WalletManagerProvider>
  )
}

export default MyApp
