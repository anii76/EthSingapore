import requests

base_url = "https://api.1inch.dev/token"
headers = { "Authorization": "Bearer qXACGHiobI0HYUSK5DHkAeCbZ8xWVJJA", "accept": "application/json" }

def lookup_token_to_address(query, chain_id, limit=1, ignore_listed="false"):
    endpoint = f"/v1.2/{chain_id}/search"
    params = {
        "query": query,
        "limit": limit,
        "ignore_listed": ignore_listed
    }
    response = requests.get(base_url + endpoint, params=params, headers=headers)
    if response.status_code == 200:
        return response.json()[0]["address"]
    else:
        print(f"Failed to search tokens. Status code: {response.status_code}")
        return None

#example
returned = lookup_token_to_address("USDC", 1)
print(returned)
    