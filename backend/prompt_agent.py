from openai import OpenAI
from dotenv import load_dotenv
from flask import jsonify
import web3
import json

load_dotenv()
client = OpenAI()

erc20_abi = '''
[
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
]
'''

def determine_target_contract(user_request):
    prompt = (
        f"This is an action that a user would like to make: {user_request}"
        f"Based on this action, what is the address of the contract that will need to be called?"
    )

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You detect the target contract address based on the user's request. You should only state the address, no formatting or other words are required"}, 
            {"role": "user", "content": prompt},
        ]
    )
    return completion.choices[0].message.content

def determine_function_call_structure(user_request, functions):
    prompt = (
        f"This is an on chain action that a user would like to complete: {user_request}.\n"
        f"Given a list of the following functions:"
    )

    for function in functions:
        prompt += f"\n{function}"

    prompt += f"\n\nWhich function should be called and what is the structure of the function call?"
    prompt += f'\nYou should format your answer as follows: `"function_name(param1_type,param2_type,...)" param1_value param2_value ...`'
    prompt += f'\nFor example: `"transfer(address,uint256)" 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599 100`'
    prompt += f"\n\n You should only respond with the call structure, no other words are required. The quotes around the function name and types are necessary, as well as the argument values after, Do not include the '`' backticks"

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You analyze a users request and determine the appropriate function call, as well as fill in the arguments based on their request following a specific structure"}, 
            {"role": "user", "content": prompt},
        ]
    )

    return completion.choices[0].message.content

def check_balance(wallet_address, messages):
    print("check_balance")
    # Could be eth balance or token balance
    messages.append({"role": "user", "content": f"Parse the user request and figure out if the user wants to check their eth balance or the balance of a specific token, if its eth return 'eth' else return the token address"}) #or the token name and then we get the address with token_lookup
    answer = client.chat.completions.create(
        model="gpt-4o",
        messages=messages
    )
    answer = answer.choices[0].message.content
    print(answer)
    if answer == 'eth':
        if not web3.isConnected():
            return jsonify({"error": "Error: Failed to connect to the Ethereum network"}), 400 
        # Get the balance in Wei
        balance_wei = web3.eth.get_balance(wallet_address)
    
        # Convert the balance to Ether
        balance_eth = web3.fromWei(balance_wei, 'ether')
    
        return "Balance: {balance_eth} ETH"
    else:
        #read the balance of the token
        token_contract = web3.eth.contract(address=answer, abi=erc20_abi)
        balance = token_contract.functions.balanceOf(wallet_address).call()
        balance_token = web3.fromWei(balance, 'ether')  # Adjust the unit if the token has different decimals
        return f"Balance : {balance_token}"
    
def swap():

    print("swap")   

    pass
# Transfer :
def transfer():  
    print("transfer")
    pass
# Approve :
def approve():
    print("approve")
    pass
# Mint :
def mint():
    print("mint")
    pass
# Bridge :
def bridge():
    print("bridge")
    pass
# Generic
# Pass user input
# figure out the action
# figure out the contract addresses
# figure out the token addresses
def default(user_request):  
    old_prompt = (
    f"User wants to perform the following onchain action: {user_request}. "
    f'Based on the user request figure out the action, the chain id, the contract addresses involved and the receiver address.'
    f"craft your answer striclty in this json format, example :"
    '{"user_request": "Transfer 10 USDT to 0x55A714eD22b8FB916f914D83d4285802A22B1Dc8", "action":"transfer", "amount":"10", "to":"0x55A714eD22b8FB916f914D83d4285802A22B1Dc8", "contract_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48", "chainid":1}'
    )
    messages = [
        {"role": "system", "content": "You are an onchain action tool, given a user request, detect the requested onchain action, analyze it then build calldata to execute it."}, 
        {"role": "user", "content": old_prompt},
    ]
    completion = client.chat.completions.create(
    model="gpt-4o",
    messages=messages
)

    answer = completion.choices[0].message.content
    answer.replace('```json','').replace('```','')

    answer = json.loads(answer)
    is_verified = is_contract_source_verified(answer['chainid'], answer['contract_address']) # type: ignore
    contract_abi_functions =  get_abi_functions(get_contract_abi_etherscan(answer['contract_address'])) # type: ignore


    #return response_json

# flow recieves 
# add a route here 
def prompt_model(user_request):
    #Not connected prompt
    intro_prompt = (
        'Based on the following user request: "{user_request}",'
        'figure out the action requested, the supported actions are : check_balance, swap, transfer, approve, mint, bridge, if the action is not supported return default'
        'Your response should be a json with the following format, example : {"action": "check_balance"}'
    )
    messages = [
        {"role": "system", "content": "You are an onchain action tool, given a user request, detect the requested onchain action, analyze it then build calldata to execute it."}, 
        {"role": "user", "content": intro_prompt},
    ]
    completion = client.chat.completions.create(        
        model="gpt-4o",
        messages=messages
    )
    answer = completion.choices[0].message.content
    answer.replace('```json','').replace('```','')
    print(answer)
    answer = json.loads(answer)
    action = answer['action']
    if action == 'check_balance':
        return check_balance()
    elif action == 'swap':
        return swap()
    elif action == 'transfer':
        return transfer()
    elif action == 'approve':
        return approve()
    elif action == 'mint':
        return mint()
    elif action == 'bridge':
        return bridge() 
    else:
        return default(user_request)
