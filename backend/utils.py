import requests
from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()
ONE_INCH_API_KEY = os.getenv("ONE_INCH_API_KEY")

headers = { "Authorization": f"Bearer {ONE_INCH_API_KEY}", "accept": "application/json" }

def createWeb3Client(chainId, web3RpcUrl):
    apiBaseUrl = f"https://api.1inch.dev/swap/v6.0/{chainId}"
    web3 = Web3(web3RpcUrl)
    return web3, apiBaseUrl

# Construct full API request URL
def apiRequestUrl(apiBaseUrl, methodName, queryParams):
    return f"{apiBaseUrl}{methodName}?{'&'.join([f'{key}={value}' for key, value in queryParams.items()])}"

# Function to check token allowance
def checkAllowance(tokenAddress, walletAddress, apiBaseUrl):
    url = apiRequestUrl(apiBaseUrl, "/approve/allowance", {"tokenAddress": tokenAddress, "walletAddress": walletAddress})
    response = requests.get(url, headers=headers)
    data = response.json()
    return data.get("allowance")

# Sign and post a transaction, return its hash
async def signAndSendTransaction(web3, transaction, private_key):
    signed_transaction = web3.eth.account.signTransaction(transaction, private_key)
    return await broadCastRawTransaction(signed_transaction.rawTransaction) # type: ignore

# Prepare approval transaction, considering gas limit
async def buildTxForApproveTradeWithRouter(web3,wallet_address,token_address, amount=None):
    # Assuming you have defined apiRequestUrl() function to construct the URL
    url = apiRequestUrl("/approve/transaction", {"tokenAddress": token_address, "amount": amount} if amount else {"tokenAddress": token_address})
    response = requests.get(url, headers=headers)
    transaction = response.json()

    # Estimate gas limit
    gas_limit = web3.eth.estimateGas(transaction, from_address=wallet_address)

    return {**transaction, "gas": gas_limit}

def buildTxForSwap(apiBaseUrl, swapParams):
    url = apiRequestUrl(apiBaseUrl,"/swap", swapParams)
    print(url)
    swapTransaction = requests.get(url,  headers={'Authorization': f'Bearer {ONE_INCH_API_KEY}'}).json()["tx"]
    return swapTransaction