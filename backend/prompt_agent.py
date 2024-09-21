from openai import OpenAI
from dotenv import load_dotenv
from backend import *
import json

load_dotenv()
client = OpenAI()

# Define user request and contract details
user_request = "Transfer 10 USDC to 0x3a52F12E0dbBf46876AdBFcA2c17C0b3a6dBe3d7"
contract_address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48"  # USDC contract address on Ethereum
contract_function = "transfer"

#Crafting the new prompt
#Check my balance
#Transfer this amount to this 
#Trade ...
old_prompt = (
    f"User wants to perform the following onchain action: {user_request}. "
    f'Based on the user request figure out the action, the chain id, the contract addresses involved and the reciever address.'
    f"craft your answer striclty in this json format, example :"
    '{"user_request": "Transfer 10 USDT to 0x55A714eD22b8FB916f914D83d4285802A22B1Dc8", "action":"transfer", "amount":"10", "to":"0x55A714eD22b8FB916f914D83d4285802A22B1Dc8", "contract_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48", "chainid":1}'
)

messages = [
    {"role": "system", "content": "You are an onchain action tool, given a user request, detect the requested onchain action, analyze it then build calldata to execute it."}, 
    {"role": "user", "content": old_prompt},
]

print(messages)
completion_1 = client.chat.completions.create(
    model="gpt-4o",
    messages=messages
)

answer = completion_1.choices[0].message.content
answer.replace('```json','').replace('```','')
print(answer)
answer = json.loads(answer)
is_verified = is_contract_source_verified(answer['chainid'], answer['contract_address']) # type: ignore
contract_abi_functions =  get_abi_functions(get_contract_abi_etherscan(answer['contract_address'])) # type: ignore
print(is_verified)
print(contract_abi_functions)

new_prompt = (
    f"Based on the following contract abi functions : {contract_abi_functions} figure out the appropriate function to do the action and build the calldata needed for an Ethereum transaction."
    f"craft your answer striclty in this json format, example :"
    "{'to': '0xblahblahblahblahblah', 'calldata': '0x1238291372819378291372891321932132132132131231231232131','chainid': 1}"
)

messages.append({"role": "assistant", "content": completion_1.choices[0].message.content})
messages.append({"role": "user", "content": new_prompt})

completion_2 = client.chat.completions.create(
    model="gpt-4o",
    messages=messages
)   


#parse model answer
answer = completion_2.choices[0].message.content
answer.replace('```json','').replace('```','')
print(answer)
answer = json.loads(answer)


print(completion_1.choices[0].message)
with open("output.json", "w") as f:
    f.write(completion_2.choices[0].message.content)

# Templates :
def check_balance():
    print("check_balance")
    pass
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
#Pass user input
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
    model="o1-preview-2024-09-12",
    messages=messages
)

    answer = completion.choices[0].message.content
    answer.replace('```json','').replace('```','')
    print(answer)
    answer = json.loads(answer)
    is_verified = is_contract_source_verified(answer['chainid'], answer['contract_address']) # type: ignore
    contract_abi_functions =  get_abi_functions(get_contract_abi_etherscan(answer['contract_address'])) # type: ignore
    print(is_verified)
    print(contract_abi_functions)



    return response_json

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
    model="o1-preview-2024-09-12",
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
