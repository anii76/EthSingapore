import axios from 'axios';
import { readFileSync, appendFileSync } from 'fs';
import 'dotenv/config';

// Function to read and parse JSON file
function readJsonFile(filePath: string): any {
  try {
    const fileContents = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContents);
  } catch (error: any) {
    console.error('Error reading or parsing JSON file:', error.message);
    process.exit(1);
  }
}

// Function to log the details to a file
function logToFile(cid: string, token: string, key: string, url: string) {
  const logEntry = `${new Date().toISOString()}, CID: [${cid}], Token: [${token}], Key: [${key}], URL: [${url}]\n`;
  appendFileSync('./logs/secrets.log', logEntry, 'utf-8');
  console.log('Log entry added to secrets.log');
}

(async () => {
  let jsonFilePath = './secrets/default.json';

  // Get the command-line arguments
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.log('Using default secrets...');
  } else {
    jsonFilePath = args[0];
  }

  // Read and parse the JSON file for secrets and latest deployment info
  const secrets = readJsonFile(jsonFilePath);
  const latestDeployment = readJsonFile('./logs/latestDeployment.json');

  try {
    const gatewayUrl = 'https://wapo-testnet.phala.network';
    const cid = latestDeployment.cid;

    console.log(`Storing secrets...`);

    const response = await axios.post(
      `${gatewayUrl}/vaults`,
      {
        cid: cid,
        data: secrets,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;

    // Assuming the response data contains 'token' and 'key'
    const token = data.token;
    const key = data.key;
    const url = `${gatewayUrl}/ipfs/${cid}?key=${key}`;

    console.log(`\nSecrets set successfully. Go to the URL below to interact with your agent:`);
    console.log(`${url}`);

    // Log the details to a file
    logToFile(cid, token, key, url);
  } catch (error: any) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
})();
