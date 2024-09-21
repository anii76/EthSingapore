import requests
import json
import re
import subprocess
from resolve_ens import get_address_from_ens
import os

ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY", "S6DR3RDU85Q2X1SCDB8F883I67Z8ID7BEE")


def is_contract_source_verified(chainid, address):
    if chainid == 1:
        url = f"https://api.etherscan.io/api?module=contract&action=getsourcecode&address={address}&apikey={ETHERSCAN_API_KEY}"
        response = requests.get(url)
        abi = response.json()["result"][0]["ABI"]

        if abi == "Contract source code not verified":
            return False
        else:
            return True


def get_contract_abi_etherscan(address):
    url = f"https://api.etherscan.io/api?module=contract&action=getabi&address={address}&apikey={ETHERSCAN_API_KEY}"
    response = requests.get(url)
    return json.loads(response.json()["result"])


def get_abi_functions(abi):
    string_functions = []
    for entry in abi:
        if entry["type"] == "function":
            function_name = entry["name"]
            inputs = entry["inputs"]

            # Construct the function signature
            parameters = []
            for input_param in inputs:
                # Use placeholder name if 'name' is empty
                param_name = input_param["name"] if input_param["name"] else "param"
                parameters.append(f"{input_param['type']} {param_name}")

            # Join parameters and format as Solidity function definition
            parameters_str = ", ".join(parameters)
            string_functions.append(f"{function_name}({parameters_str})")
    return string_functions


def translate_ens_to_address(input_string):
    # Regular expression to find any string ending with ".ens"
    pattern = r"\b\w+\.eth\b"
    count = 0

    # Function to use in re.sub that increments the counter
    def replacement(match):
        return get_address_from_ens(match.group(0))

    # Replace matched pattern with "hellothere" followed by the count
    replaced_string = re.sub(pattern, replacement, input_string)
    return replaced_string


def resolve_ens_to_address(ens_name):
    return "ENS_RESOLUTION_TODO"


def run_bash_command(command):
    try:
        # Run the command and capture the output
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        # Check if the command was successful
        if result.returncode == 0:
            return result.stdout.strip()  # Return the output as a string
        else:
            return f"Error: {result.stderr.strip()}"  # Return the error message
    except Exception as e:
        return str(e)
