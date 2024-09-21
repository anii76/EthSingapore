from web3 import Web3

def get_address_from_ens(ens_name):
    # Replace with your own Infura or Alchemy endpoint or any other Ethereum node provider.
    INFURA_URL = 'https://rpc.ankr.com/eth'

    # Initialize a Web3 instance
    w3 = Web3(Web3.HTTPProvider(INFURA_URL))

    # Check if the connection is successful
    if not w3.is_connected():
        print("Unable to connect to the Ethereum network.")
        exit(1)

    return w3.ens.address(ens_name)