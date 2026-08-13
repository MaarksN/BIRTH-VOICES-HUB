import fetch from 'node-fetch';

async function call() {
    console.log("Iniciando chamada direta de prospecção via Bland AI para Rodrigo...");
    try {
        const payload = {
            phone_number: "+5516981319748",
            name: "Rodrigo",
            company: "Atlas GR",
            lead_id: "rodrigo-demo-" + Date.now() // Força bypass de idempotência para testes repetidos
        };

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
            console.log("Chamada de prospecção aceita com sucesso pela Bland AI!", data);
        } else {
            const text = await response.text();
            console.error("Erro do Hub (HTTP " + response.status + "):", text);
        }
    } catch (err) {
        console.error("Falha ao contatar o Hub:", err.message);
    }
}

call();
