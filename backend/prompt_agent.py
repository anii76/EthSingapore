from openai import OpenAI
from dotenv import load_dotenv
from flask import jsonify
from web3 import Web3
import json
from backend import *
import os
from resolve_ens import get_rpc_provider

load_dotenv()

# Set up your OpenAI client
client = OpenAI(base_url="https://api.red-pill.ai/v1", api_key=os.getenv("API_KEY"))

INFURA_URL = "https://rpc.ankr.com/eth"
# Initialize a Web3 instance
w3 = get_rpc_provider()

try:
    # Load the ABI from a file
    # Get the directory of the current script
    script_dir = os.path.dirname(__file__)

    # Construct the relative path to the ABI file
    abi_path = os.path.join(script_dir, "erc20.abi.json")

    # Load the ABI from the file
    with open("erc20.abi.json", "r") as abi_file:
        erc20_abi = json.load(abi_file)
except FileNotFoundError:
    print("ABI file not found. There will raise error")


# Action functions
def determine_target_contract(user_request):
    prompt = (
        f"""This is an action that a user would like to make: {user_request}"""
        "Based on this action, what is the address of the contract that will need to be called?"
        "return only the contract address, no other words are required"
    )

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "assistant",
                "content": "You detect the target contract address based on the user's request. You should only state the address, no formatting or other words are required",
            },
            {"role": "user", "content": prompt},
        ],
    )
    address = completion.choices[0].message.content
    return address


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
            {
                "role": "assistant",
                "content": "You analyze a users request and determine the appropriate function call, as well as fill in the arguments based on their request following a specific structure",
            },
            {"role": "user", "content": prompt},
        ],
    )

    return completion.choices[0].message.content


# Improve check_balance, check what the user is holding in their wallet accross chain (Tokens, ETH and NFTs)
def check_balance(wallet_address, messages):
    print("check_balance")
    # Could be eth balance or token balance
    messages.append(
        {
            "role": "user",
            "content": (
                f"Parse the user request and figure out if the user wants to check their eth balance or the balance of a specific token, if its eth return 'eth' else return the token address"
            ),
        }
    )  # or the token name and then we get the address with token_lookup
    answer = client.chat.completions.create(model="gpt-4o", messages=messages)
    answer = answer.choices[0].message.content
    answer = answer.replace("```json", "").replace("```", "")
    print(answer)

    # Check if the connection is successful
    if not w3.is_connected():
        print("Unable to connect to the Ethereum network.")
        exit(1)
    answer = json.loads(answer)
    if answer["token"] == "eth":
        # Get the balance in Wei
        balance_wei = w3.eth.get_balance(wallet_address)

        # Convert the balance to Ether
        balance_eth = w3.from_wei(balance_wei, "ether")

        return f"Balance: {balance_eth} ETH"
    else:
        # read the balance of the token
        answer = answer.replace("```", "")
        print(answer)
        # Convert the address to its checksummed version
        token_address = Web3.to_checksum_address(answer)
        token_contract = w3.eth.contract(address=token_address, abi=erc20_abi)
        balance = token_contract.functions.balanceOf(wallet_address).call()
        # Get the number of decimals for the token
        decimals = token_contract.functions.decimals().call()
        print(decimals)

        # Adjust the balance based on the number of decimals
        balance_token = balance / (10**decimals)
        return f"Balance : {balance_token}"


def swap():
    # I'm gonna use uniswap V3 anyway
    # Use 1inch api

    print("swap")

    pass


# Transfer :
# Improve to handle diffirent transfer logics
def transfer(user_request):
    # eth or token
    messages= [
        {
            "role": "user",
            "content": (
                f"Parse the user request and figure out if the user wants to transfer eth balance or a specific token, if its eth return 'eth' else return the token address and the amount."
                "craft your response in the following json format :"
                "If multiple transfers are detected, return a list of transfers."
                "Example 1 : {'transfers':[{'token':'USDC', 'token_address': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48', 'amount':19, 'to':'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'chainId': 1}]}"
                "Example 2 : {'transfers':[{'token':'ETH', 'token_address': '0x0', 'amount':19, 'to':'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'chainId': 1}]}"
                f"Here is the user request : {user_request}"
            ),
        }
     ] # or the token name and then we get the address with token_lookup
    answer = client.chat.completions.create(model="gpt-4o", messages=messages)
    answer = answer.choices[0].message.content
    answer = answer.replace("```json", "").replace("```", "")
    print(answer)
    answer = json.loads(answer)

    for transfer in answer['transfers']:
        if transfer["token"] == "ETH":
            # Send eth
            # Convert the amount to Wei
            amount_wei = w3.to_wei(transfer["amount"], 'ether')

            # Build the transaction
            response = {
                'to': transfer["to"],
                'calldata':"",
                'value': amount_wei,
                'chainId': transfer["chainId"]
            }

            return jsonify(response)
        else:  # Construct the calldata or whatever to transfer the erc20 token
            #TransferERC20
            token_address = Web3.to_checksum_address(transfer['token_address'])
            token_contract = w3.eth.contract(address=token_address, abi=erc20_abi)
            # Get the number of decimals for the token
            decimals = token_contract.functions.decimals().call()
            print(decimals)
            response = {
                'to': transfer['to'],
                'calldata': run_bash_command(f"cast calldata transfer(address,uint256) {transfer['to']} {transfer['amount']}"), 
                'value': transfer["amount"] * (10** decimals),
                'chainId':  transfer["chainId"]
            }
            return jsonify(response)


def send_message(user_request):
    # Get the target address that will receive the message
    target = determine_target_contract(user_request)

    # Figure out the message that the user wants to send
    intro_prompt = (
        f'Based on the following user request: "{user_request}"'
        "Extract what exact message the user intends to send, and only the message, no other words are required"
    )
    messages = [
        {
            "role": "assistant",
            "content": "You are a parser that reads requests and extracts the relevant information",
        },
        {"role": "user", "content": intro_prompt},
    ]
    completion = client.chat.completions.create(model="gpt-4o", messages=messages)
    message = completion.choices[0].message.content

    # Convert the message to hexadecimal
    hex_message = "0x" + message.encode("utf-8").hex()

    return {
        "to": target,
        "calldata": hex_message,
        "value": 0,
        "chainid": 1,
    }


# Approve :
def approve():
    print("NOT IMPLEMENTED")
    pass


# Bridge :
def bridge():
    print("NOT IMPLEMENTED")
    pass


def default(user_request):
    old_prompt = (
        f"User wants to perform the following onchain action: {user_request}. "
        "Based on the user request figure out the action, the chain id, the contract addresses involved and the receiver address."
        "craft your answer striclty in this json format, example :"
        '{"user_request": "Transfer 10 USDT to 0x55A714eD22b8FB916f914D83d4285802A22B1Dc8", "action":"transfer", "amount":"10", "to":"0x55A714eD22b8FB916f914D83d4285802A22B1Dc8", "contract_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48", "chainid":1}'
        "where you would replace the different elements with the relevant parts."
    )
    messages = [
        {
            "role": "assistant",
            "content": "You are an onchain action tool, given a user request, detect the requested onchain action, analyze it then build calldata to execute it.",
        },
        {"role": "user", "content": old_prompt},
    ]

    completion = client.chat.completions.create(model="gpt-4o", messages=messages)

    answer = completion.choices[0].message.content
    answer = answer.replace("```json", "").replace("```", "")
    print(answer)
    answer = json.loads(answer)
    is_verified = is_contract_source_verified(answer["chainid"], answer["contract_address"])  # type: ignore
    contract_abi_functions = get_abi_functions(get_contract_abi_etherscan(answer["contract_address"]))  # type: ignore
    print(is_verified)
    print(contract_abi_functions)


# flow recieves
# add a route here
def prompt_model(user_request):
    # Not connected prompt
    intro_prompt = (
        f'Based on the following user request: "{user_request}"'
        "Determine if the action requested is supported. The supported actions are: [swap, transfer, approve, mint, bridge, send_message, irrelevant]"
        "If the action is not supported then return default"
        "Your response should be a single word which is one of the supported actions. If it is not supported, then simply say 'default'"
    )
    messages = [
        {
            "role": "assistant",
            "content": "You are an onchain action tool, given a user request, detect the requested onchain action, analyze it then build calldata to execute it.",
        },
        {"role": "user", "content": intro_prompt},
    ]

    completion = client.chat.completions.create(model="gpt-4o", messages=messages)
    action = completion.choices[0].message.content

    # Txdata should always follow this format
    tx_data = {
        "to": "",
        "calldata": "",
        "value": 0,
        "chainid": 1,
    }

    if action == "swap":
        tx_data = swap(user_request)
    elif action == "transfer":
        tx_data = transfer(user_request)
    elif action == "approve":
        tx_data = approve(user_request)
    elif action == "bridge":
        tx_data = bridge(user_request)
    elif action == "send_message":
        tx_data = send_message(user_request)
    else:
        tx_data = default(user_request)

    return tx_data


def ai_agent():
    print("Welcome to the AI Assistant. Type 'exit' to quit.")
    while True:
        user_input = input("User: ")
        if user_input.lower() == "exit":
            print("AI Assistant: Goodbye!")
            break
        # Process the user's request using prompt_model
        prompt_model(user_input)


if __name__ == "__main__":
    ai_agent()
