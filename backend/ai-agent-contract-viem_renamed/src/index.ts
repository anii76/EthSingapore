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
// import { Configuration, OpenAIApi } from 'openai';
import OpenAI from 'openai';

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
    const combinedQuery = `Based on the following user request: "${userQuery}" Determine if the action requested is supported. The supported actions are: [swap, transfer, approve, mint, bridge, send_message, irrelevant]. If the action is not supported then return 'default'. Your response should be a single word which is one of the supported actions. If it is not supported, then simply say 'default'.`;

    let result = {
        model,
        chatQuery: chatQuery,  // Keep the original user query here for reference
        message: ''
    };

    result.message = await getChatCompletion(apiKey, model, combinedQuery)

    return c.json(result)
  });


export default handle(app)
