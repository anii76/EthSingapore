from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()


def determine_target_contract(user_request):
    prompt = (
        f"This is an action that a user would like to make: {user_request}"
        f"Based on this action, what is the address of the contract that will need to be called?"
    )

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You detect the target contract address based on the user's request. You should only state the address, no formatting or other words are required",
            },
            {"role": "user", "content": prompt},
        ],
    )
    return completion.choices[0].message.content


def determine_function_call_structure(user_request, functions):
    prompt = (
        f"This is the action that a user would like to complete: {user_request}.\n"
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
                "role": "system",
                "content": "You analyze a users request and determine the appropriate function call, as well as fill in the arguments based on their request following a specific structure",
            },
            {"role": "user", "content": prompt},
        ],
    )

    return completion.choices[0].message.content
