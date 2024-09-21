from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()

# Define user request and contract details
user_request = "Transfer 10 USDC to 0xRecipientAddress"
contract_address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48"  # USDC contract address on Ethereum
contract_function = "transfer"

# Crafting the new prompt
new_prompt = (
    f"User wants to perform the following onchain action: {user_request}. "
    f"The contract address is {contract_address}, and the function to call is {contract_function}. "
    f"Please analyze this action and build the calldata needed for an Ethereum transaction."
)

completion = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are an onchain action tool, given a user request, detect the requested onchain action, analyze it then build calldata to execute it."}, 
        {"role": "user", "content": new_prompt},
    ]
)

print(completion.choices[0].message)
with open("output.md", "w") as f:
    f.write(completion.choices[0].message.content)
