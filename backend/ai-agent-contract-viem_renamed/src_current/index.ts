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

import { OpenAI } from 'openai'
import { ethers } from 'ethers'

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

app.post('/', async (c) => {
    const data = await c.req.json()
    console.log('user payload in JSON:', data)

    const { address, conversation } = data

    if (!address || !Array.isArray(conversation)) {
        return c.json({ error: "Invalid input. Expected 'address' and 'conversation' array." }, 400)
    }

    const client = new OpenAI({
        baseURL: 'https://api.red-pill.ai/v1',
        apiKey: process.env.API_KEY
    })

    const erc20Abi = [
        {
            constant: true,
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            type: "function"
        }
    ]

    async function checkBalance(walletAddress: string, messages: any[]): Promise<string> {
        console.log("check_balance")
        messages.push({ role: "user", content: "Parse the user request and figure out if the user wants to check their eth balance or the balance of a specific token, if its eth return 'eth' else return the token address" })
        const answer = await client.chat.completions.create({
            model: "o1-preview",
            messages: messages
        })
        const content = answer.choices[0].message.content || ''
        console.log(content)

        const provider = new ethers.providers.JsonRpcProvider()

        if (content === 'eth') {
            try {
                const balanceWei = await provider.getBalance(walletAddress)
                const balanceEth = ethers.utils.formatEther(balanceWei)
                return `Balance: ${balanceEth} ETH`
            } catch (error) {
                return "Error: Failed to connect to the Ethereum network"
            }
        } else {
            const tokenContract = new ethers.Contract(content, erc20Abi, provider)
            const balance = await tokenContract.balanceOf(walletAddress)
            const balanceToken = ethers.utils.formatEther(balance)
            return `Balance: ${balanceToken}`
        }
    }

    function swap(): void {
        console.log("swap")
    }

    function transfer(): void {
        console.log("transfer")
    }

    function approve(): void {
        console.log("approve")
    }

    function mint(): void {
        console.log("mint")
    }

    function bridge(): void {
        console.log("bridge")
    }

    async function defaultAction(userRequest: string): Promise<any> {
        const oldPrompt = `User wants to perform the following onchain action: ${userRequest}. 
    Based on the user request figure out the action, the chain id, the contract addresses involved and the receiver address.
    craft your answer striclty in this json format, example :
    {"user_request": "Transfer 10 USDT to 0x55A714eD22b8FB916f914D83d4285802A22B1Dc8", "action":"transfer", "amount":"10", "to":"0x55A714eD22b8FB916f914D83d4285802A22B1Dc8", "contract_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48", "chainid":1}
    where you would replace the different elements with the relevant parts.`

        const messages = [
            { role: "system", content: "You are an onchain action tool, given a user request, detect the requested onchain action, analyze it then build calldata to execute it." },
            { role: "user", content: oldPrompt },
        ]

        const completion = await client.chat.completions.create({
            model: "o1-preview",
            messages: messages
        })


        let answer = completion.choices[0].message.content || ''
        answer = answer.replace('```json', '').replace('```', '')
        console.log(answer)
        const parsedAnswer = JSON.parse(answer)

        return parsedAnswer
    }

    async function promptModel(userRequest: string): Promise<any> {
        const introPrompt = `Based on the following user request: "${userRequest}",
    figure out the action requested, the supported actions are : check_balance, swap, transfer, approve, mint, bridge, if the action is not supported return default
    Your response should be a json with the following format, example : {"action": "check_balance"}`

        const messages = [
            { role: "system", content: "You are an onchain action tool, given a user request, detect the requested onchain action, analyze it then build calldata to execute it." },
            { role: "user", content: introPrompt },
        ]

        const completion = await client.chat.completions.create({
            model: "o1-preview",
            messages: messages
        })

        let answer = completion.choices[0].message.content || ''
        answer = answer.replace('```json', '').replace('```', '')
        console.log(answer)
        const parsedAnswer = JSON.parse(answer)
        const action = parsedAnswer.action

        switch (action) {
            case 'check_balance':
                return checkBalance(address, conversation)
            case 'swap':
                swap()
                return { message: "Swap operation completed" }
            case 'transfer':
                transfer()
                return { message: "Transfer operation completed" }
            case 'approve':
                approve()
                return { message: "Approve operation completed" }
            case 'mint':
                mint()
                return { message: "Mint operation completed" }
            case 'bridge':
                bridge()
                return { message: "Bridge operation completed" }
            default:
                return defaultAction(userRequest)
        }
    }

    const lastUserMessage = conversation[conversation.length - 1]
    const result = await promptModel(lastUserMessage)

    return c.json(result)
});

export default handle(app)
