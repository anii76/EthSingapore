import { useState } from 'react'

// My imports
import Background from './Background.jsx';
import TextBox from './TextBox.jsx';
import './ButtonContainer.css';

// Walletconnect imports
import { createAppKit } from '@reown/appkit/react';
import { mainnet } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'


const queryClient = new QueryClient()
const projectId = "9906b8e57582f23e8d6306eef55f38fe";

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [mainnet]
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  metadata: {
    name: 'AppKit',
    description: 'AppKit React Wagmi Example',
    url: '',
    icons: []
  },
  projectId,
  themeMode: 'light',
  themeVariables: {
    '--w3m-color-mix': '#00DCFF',
    '--w3m-color-mix-strength': 20
  }
})

function App() {
  const [count, setCount] = useState(0)
  
  
  return (
    <div className="App">
      <WagmiProvider config={wagmiAdapter.wagmiConfig}> 
        <QueryClientProvider client={queryClient}>  
          <Background />
          <div className="button-container">
            <w3m-button />
          </div>
          <TextBox />
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
}

export default App