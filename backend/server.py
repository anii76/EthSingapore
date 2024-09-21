from flask import Flask, request, jsonify
from prompt_agent import *
from backend import get_abi_functions, get_contract_abi_etherscan, is_contract_source_verified, translate_ens_to_address, run_bash_command


app = Flask(__name__)

@app.route('/json', methods=['POST'])
def handle_json():

    # Get the JSON data from the request
    data = request.get_json()
    
    # Check if the data is valid JSON
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON"}), 400
    
    user_request = data["user_request"]

    print("Raw request:", user_request)

    # Convert the ens names to actual addresses
    user_request = translate_ens_to_address(user_request)

    print("Ens resolved:", user_request)

    # LLM analyze the request to look for the contract that we will be interacting with
    contract_address = determine_target_contract(user_request)

    print("Target contract:", contract_address)

    # Check that the source code is verified, otherwise we cannot process
    if not is_contract_source_verified(1, contract_address):
        print("source code not verified")
        return jsonify({"error": "Contract source code not verified"}), 400
    
    # Get the contract ABI from Etherscan
    contract_abi = get_contract_abi_etherscan(contract_address)

    # Get the functions from the contract ABI
    contract_functions = get_abi_functions(contract_abi)

    # Ask LLM which function best suits the user request and to format the call structure appropriately
    function_call_structure = determine_function_call_structure(user_request, contract_functions)

    print("Call structure:", function_call_structure)

    # Run the command to generate the transaction data
    calldata = run_bash_command(f"cast calldata {function_call_structure}")

    print("Calldata:", calldata)

    # Return the modified data as JSON response
    return jsonify({
        "to": contract_address,
        "calldata": calldata,
        "chainid": 1
    })

@app.route('/check_balance', methods=['GET'])
def check_balance_route():
    wallet_address = request.args.get('wallet_address')
    if wallet_address:
        return check_balance(wallet_address)
    else:
        return "Wallet address is required", 400

if __name__ == '__main__':
    app.run(debug=True)
