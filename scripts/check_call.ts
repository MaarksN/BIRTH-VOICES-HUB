import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const apiKey = process.env.BLAND_API_KEY;
const callId = "463d11d9-c00f-4850-8864-0aa90ac2c927";

async function checkCall() {
    try {
        const response = await fetch(`https://api.bland.ai/v1/calls/${callId}`, {
            method: "GET",
            headers: {
                "Authorization": apiKey || ''
            }
        });
        
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err: any) {
        console.error("Falha ao contatar a Bland AI:", err.message);
    }
}

checkCall();
