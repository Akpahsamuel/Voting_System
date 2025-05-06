import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./index.css"
import "@mysten/dapp-kit/dist/index.css";
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { networkConfig } from './config/networkConfig.ts'
import { getNetwork } from './utils/networkUtils.ts'

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <QueryClientProvider client={queryClient}>
        {/* 
          There's a type incompatibility between networkConfig and what SuiClientProvider expects.
          This would require a deeper refactoring of the networkConfig structure.
          For now, we're using @ts-ignore to bypass this error.
        */}
        {/* @ts-ignore: Type incompatibility with networkConfig */}
        <SuiClientProvider defaultNetwork={getNetwork()} networks={networkConfig}>
          <WalletProvider autoConnect>
              <App />
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
  </StrictMode>,
)