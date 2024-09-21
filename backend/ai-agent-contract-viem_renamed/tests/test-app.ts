import fetch from 'node-fetch';

async function testApp() {
    const url = 'https://wapo-testnet.phala.network/ipfs/QmaJ2TEv2giTNmVixCtrMo41eBNKRgU68Ub2yELmMP3MSR?key=22a3431b86f9e868';


    const data = {
        address: '0x123456789abcdef...', // Replace with an actual Ethereum address
        conversation: [
            "say 123 viva Phala Network"
        ],
        model: 'o1-preview' // You can change this if needed
    };

    
    try {
        console.log('Sending POST request...');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            timeout: 30000 // 30 seconds timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('POST Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('POST request error:', error);
        if (error.type === 'request-timeout') {
            console.error('The request timed out. The server might be slow or unreachable.');
        }
    }

}


testApp();