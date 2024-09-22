import '@phala/wapo-env'
import { Hono } from 'hono/tiny'
import { handle } from '@phala/wapo-env/guest'
import { privateKeyToAccount } from 'viem/accounts'
import {
    keccak256,
    http,
    type Address,
    createPublicClient,
    PrivateKeyAccount,
    verifyMessage,
    createWalletClient,
    parseGwei
} from 'viem'
import { baseSepolia } from 'viem/chains'
import superjson from 'superjson'
import { Web3 } from "web3"; // Import Web3 if it's not already imported
import { erc20Abi } from "./erc20Abi"; // Import the ERC20 ABI if you have it in a separate file


// Infura or any other RPC provider URL
const INFURA_URL = "https://rpc.ankr.com/eth";

// Initialize a Web3 instance
const web3 = new Web3(new Web3.providers.HttpProvider(INFURA_URL));


// Define the ERC20 ABI directly in the file
const erc20Abi = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
];

// Example: Now you can use the ABI with web3
if (erc20Abi) {
    const tokenAddress = '0xYourTokenAddress';
    const tokenContract = new web3.eth.Contract(erc20Abi, tokenAddress);

    // Example usage: Call a function from the contract
    tokenContract.methods.name().call().then((name: string) => {
        console.log('Token Name:', name);
    }).catch((error: any) => {
        console.error('Error:', error);
    });
}


export const app = new Hono()

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
})
const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(),
})

function getECDSAAccount(salt: string): PrivateKeyAccount {
    const derivedKey = Wapo.deriveSecret(salt)
    const keccakPrivateKey = keccak256(derivedKey)
    return privateKeyToAccount(keccakPrivateKey)
}

async function signData(account: PrivateKeyAccount, data: string): Promise<any> {
    let result = {
        derivedPublicKey: account.address,
        data: data,
        signature: ''
    }
    const publicKey = account.address
    console.log(`Signing data [${data}] with Account [${publicKey}]`)
    const signature = await account.signMessage({
        message: data,
    })
    console.log(`Signature: ${signature}`)
    result.signature = signature
    return result
}

async function verifyData(account: PrivateKeyAccount, data: string, signature: any): Promise<any> {
    let result = {
        derivedPublicKey: account.address,
        data: data,
        signature: signature,
        valid: false
    }
    const publicKey = account.address
    console.log("Verifying Signature with PublicKey ", publicKey)
    const valid = await verifyMessage({
        address: publicKey,
        message: data,
        signature,
    })
    console.log("Is signature valid? ", valid)
    result.valid = valid
    return result
}

async function sendTransaction(account: PrivateKeyAccount, to: Address, gweiAmount: string): Promise<any> {
    let result = {
        derivedPublicKey: account.address,
        to: to,
        gweiAmount: gweiAmount,
        hash: '',
        receipt: {}
    }
    console.log(`Sending Transaction with Account ${account.address} to ${to} for ${gweiAmount} gwei`)
    // @ts-ignore
    const hash = await walletClient.sendTransaction({
        account,
        to,
        value: parseGwei(`${gweiAmount}`),
    })
    console.log(`Transaction Hash: ${hash}`)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Transaction Status: ${receipt.status}`)
    result.hash = hash
    result.receipt = receipt
    return result
}

app.get('/', async (c) => {
    let vault: Record<string, string> = {}
    let queries = c.req.queries() || {}
    let result = {};
    try {
        vault = JSON.parse(process.env.secret || '')
    } catch (e) {
        console.error(e)
        return c.json({ error: "Failed to parse secrets" })
    }
    const secretSalt = (vault.secretSalt) ? vault.secretSalt as string : 'SALTY_BAE'
    const getType = (queries.type) ? queries.type[0] as string : ''
    const account = getECDSAAccount(secretSalt)
    const data = (queries.data) ? queries.data[0] as string : ''
    console.log(`Type: ${getType}, Data: ${data}`)
    try {
        if (getType == 'sendTx') {
            result = (queries.to && queries.gweiAmount) ?
              await sendTransaction(account, queries.to[0] as Address, queries.gweiAmount[0]) :
              { message: 'Missing query [to] or [gweiAmount] in URL'}
        } else if (getType == 'sign') {
            result = (data) ? await signData(account, data) : { message: 'Missing query [data] in URL'}
        } else if (getType == 'verify') {
            if (data && queries.signature) {
                result = await verifyData(account, data, queries.signature[0] as string)
            } else {
                result = { message: 'Missing query [data] or [signature] in URL'}
            }
        } else {
            result = { derivedPublicKey: account.address }
        }
    } catch (error) {
        console.error('Error:', error)
        result = { message: error }
    }
    const { json, meta } = superjson.serialize(result)
    return c.json(json)
})



function swap(chatQuery: string): any {
    console.log("swap function called");
    return {}; // return dummy tx_data object
}

// function transfer(chatQuery: string): any {
//     console.log("transfer function called");
//     return {}; // return dummy tx_data object
// }

async function transfer(apiKey: string, chatQuery: string): Promise<any> {
    const messages = [
        {
            role: "user",
            content: `Parse the user request and figure out if the user wants to transfer eth balance or a specific token. If it's ETH, return 'eth'; otherwise, return the token address and the amount. Craft your response in the following JSON format: If multiple transfers are detected, return a list of transfers. Example 1: {'transfers':[{'token':'USDC', 'token_address': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48', 'amount':19, 'to':'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'chainId': 1}]} Example 2: {'transfers':[{'token':'ETH', 'token_address': '0x0', 'amount':19, 'to':'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'chainId': 1}]} Here is the user request: ${chatQuery}`,
        },
    ];

    const response = await fetch('https://api.red-pill.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`, // Replace with your OpenAI API key
        },
        body: JSON.stringify({
            model: "o1-preview",
            messages: messages
        })
    });

    let answer = await response.json();
    answer = answer.choices[0].message.content.trim();
    answer = answer.replace("```json", "").replace("```", "");
    const parsedAnswer = JSON.parse(answer);

    for (const transfer of parsedAnswer.transfers) {
        if (transfer.token === "ETH") {
            // Send ETH
            const amountWei = Web3.utils.toWei(transfer.amount.toString(), "ether");

            // Build the transaction for ETH transfer
            const ethTransaction = {
                to: transfer.to,
                calldata: "",
                value: amountWei,
                chainId: transfer.chainId,
            };

            return ethTransaction;
        } else {
            // Transfer ERC20 Token
            const tokenAddress = Web3.utils.toChecksumAddress(transfer.token_address);
            // Use the dynamically loaded `erc20Abi`
            const tokenContract = new web3.eth.Contract(erc20Abi, tokenAddress);

            // Get the token decimals
            const decimals = await tokenContract.methods.decimals().call();

            async function getCalldata() {
                try {
                    const calldata = await runBashCommand(`cast calldata transfer(address,uint256) 0xAddress 100`);
                    console.log("Calldata:", calldata);
                } catch (error) {
                    console.error("Failed to execute bash command:", error);
                }
                return calldata;
            }
            

            // Build the calldata for ERC20 transfer
            const calldata = await getCalldata();

            // Build the transaction for ERC20 token transfer
            let erc20Transaction = {
                to: transfer.to,
                calldata: calldata,
                value: transfer.amount * (10 ** decimals),
                chainId: transfer.chainId,
            };

            return erc20Transaction;
        }
    }
}


function approve(chatQuery: string): any {
    console.log("approve function called");
    return {}; // return dummy tx_data object
}

function bridge(chatQuery: string): any {
    console.log("bridge function called");
    return {}; // return dummy tx_data object
}

function send_message(chatQuery: string): any {
    console.log("send_message function called");
    return {}; // return dummy tx_data object
}

function default_call(chatQuery: string): any {
    console.log("default function called");
    return {}; // return dummy tx_data object
}




async function getChatCompletion(apiKey: string, model: string, chatQuery: string) {
    let result = ''
    try {
      const response = await fetch('https://api.red-pill.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [{
            "role": "assistant",
            "content": "You are an onchain action tool, given a user request, detect the requested onchain action, analyze it then build calldata to execute it.",
        },
        { role: "user", content: `${chatQuery}` }],
          model: `${model}`,
        })
      });
      const responseData = await response.json();
      result = (responseData.error) ? responseData.error : responseData.choices[0].message.content
    } catch (error) {
      console.error('Error fetching chat completion:', error)
      result = error as string
    }
    return result
  }



  app.post('/', async (c) => {
    let vault: Record<string, string> = {}
    const data = await c.req.json()
    console.log('user payload in JSON:', data)
    try {
      vault = JSON.parse(process.env.secret || '')
    } catch (e) {
      console.error(e)
      return c.json({ error: "Failed to parse secrets" })
    }
    const apiKey = (vault.apiKey) ? vault.apiKey : 'sk-qVBlJkO3e99t81623PsB0zHookSQJxU360gDMooLenN01gv2'
    const model = (data.model) ? data.model : 'gpt-4o'
    const chatQuery = (data.conversation && data.conversation.length > 0) ? data.conversation[data.conversation.length - 1] : 'Say 123 I love chocolate'
    // Concatenate the user query with the additional instruction
    const combinedQuery = `Based on the following user request: "${chatQuery}" Determine if the action requested is supported. The supported actions are: [swap, transfer, approve, mint, bridge, send_message, irrelevant]. If the action is not supported then return 'default'. Your response should be a single word which is one of the supported actions. If it is not supported, then simply say 'default'.`;

    let tx_data = {

        to: "",
        calldata: "",
        value: 0,
        chainId: 1,
    };



    const action = await getChatCompletion(apiKey, model, combinedQuery)
    // Txdata should always follow this format


    if (action === "swap") {
        tx_data = swap(chatQuery);
    } else if (action === "transfer") {
        tx_data = transfer(apiKey, chatQuery);
    } else if (action === "approve") {
        tx_data = approve(chatQuery);
    } else if (action === "bridge") {
        tx_data = bridge(chatQuery);
    } else if (action === "send_message") {
        tx_data = send_message(chatQuery);
    } else {
        tx_data = default_call(chatQuery);
    }

    // result.message = action

    let result = {
        model,
        chatQuery: chatQuery,  // Keep the original user query here for reference
        message: action,
        tx_data: tx_data
    };

    // result.tx_data = tx_data

    return c.json(result)

  });


export default handle(app)
