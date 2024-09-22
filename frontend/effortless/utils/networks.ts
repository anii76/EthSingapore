import { CaipNetwork } from "@reown/appkit-common";

export const hedara:CaipNetwork = {
  name: "Hedera MAINNET",
  currency: "HBAR",
  id: "eip155:295",
  chainNamespace: "eip155",
  chainId: "295",
  rpcUrl: "https://mainnet.hashio.io/api",
  imageUrl: "https://logowik.com/content/uploads/images/t_hedera-hashgraph-hbar7723.jpg",
  explorerUrl: "https://mainnet.hashio.io"
} // 

export const oasis:CaipNetwork = {
    name: "Oasis Emerald Mainnet",
    currency: "ROSE",
    id: "eip155:23295",
    chainNamespace: "eip155",
    chainId: "23295",
    rpcUrl: "https://1rpc.io/oasis/sapphire",
    imageUrl: "https://assets.coingecko.com/coins/images/13162/standard/rose.png?1696512946",
    explorerUrl: "https://explorer.oasis.io/mainnet/sapphire"
} //
  
export const arbitrum:CaipNetwork = {
    name: "Arbitrum ONE",
    currency: "ETH",
    id: "eip155:42161",
    chainNamespace: "eip155",
    chainId: "42161",
    rpcUrl: "https://arbitrum-mainnet.infura.io",
    imageUrl: "https://arbiscan.io/assets/arbitrum/images/svg/logos/token-secondary-light.svg?v=24.9.2.0",
    explorerUrl: "https://explorer.arbitrum.io"
}

// https://testnet-rpcUrl.sign.global/api/scan/addresses/0x0000000000000000000000000000000000000000/statistics
export const sepolia_testnet:CaipNetwork = {
    name: "Base Sepolia Testnet",
    currency: "ETH",
    id: "eip155:84532",
    chainNamespace: "eip155",
    chainId: "84532",
    rpcUrl: "https://arbitrum-goerli-rpcUrl.publicnode.com",
    imageUrl: "",
    explorerUrl: "https://arbiscan.io/"
} //