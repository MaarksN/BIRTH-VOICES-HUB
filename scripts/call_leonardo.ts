import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const FROM_NUMBER = process.env.BLAND_FROM_NUMBER || '';

async function call() {
    console.log("Iniciando chamada de prospecção via Bland AI para Leonardo...");
    if (FROM_NUMBER) {
        console.log("Caller ID (DDD 16):", FROM_NUMBER);
    } else {
        console.log("Caller ID: padrão da conta Bland AI");
    }

    try {
        const payload: Record<string, any> = {
            phone_number: "+5516996170431",
            name: "Leonardo",
            company: "Atlas GR",
            lead_id: "leonardo-demo-" + Date.now()
        };

        if (FROM_NUMBER) {
            payload.from = FROM_NUMBER;
        }

        const response = await fetch("http://127.0.0.1:3001/api/webhook/atlasgr/outbound", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-atlasgr-webhook-secret": "segredo_compartilhado_atlasgr_123"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Chamada aceita com sucesso pela Bland AI!", data);
        } else {
            const text = await response.text();
            console.error("Erro do Hub (HTTP " + response.status + "):", text);
        }
    } catch (err: any) {
        console.error("Falha ao contatar o Hub:", err.message);
    }
}

call();
