// Este arquivo contém funções para interagir com a API do Gemini

// URL base para a API do Gemini
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

// Função para gerar conteúdo usando a API do Gemini
async function generateContentWithGemini(apiKey, promptText) {
    if (!apiKey) {
        throw new Error('API key is required');
    }

    const url = `${GEMINI_API_BASE_URL}?key=${apiKey}`;
    
    const requestData = {
        contents: [
            {
                parts: [
                    {
                        text: promptText
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Extrai o texto gerado da resposta
        if (data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && 
            data.candidates[0].content.parts && 
            data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('No content returned from API');
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

// Verifica se uma chave API é válida fazendo uma chamada de teste
async function verifyApiKey(apiKey) {
    if (!apiKey) return false;
    
    try {
        // Faz uma chamada simples para verificar se a chave é válida
        const result = await generateContentWithGemini(
            apiKey, 
            "Responda apenas com a palavra 'válido' se esta requisição funcionar."
        );
        
        return result.toLowerCase().includes('válido');
    } catch (error) {
        console.error('API key verification failed:', error);
        return false;
    }
}

// Exporta as funções para uso no script principal
window.GeminiAPI = {
    generateContent: generateContentWithGemini,
    verifyApiKey
};