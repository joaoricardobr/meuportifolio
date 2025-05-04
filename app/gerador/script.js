// Elementos da interface
const apiKeyInput = document.getElementById('api-key');
const saveKeyButton = document.getElementById('save-key');
const apiStatus = document.getElementById('api-status');
const promptTypeSelect = document.getElementById('prompt-type');
const promptTopicInput = document.getElementById('prompt-topic');
const promptDetailsInput = document.getElementById('prompt-details');
const promptToneSelect = document.getElementById('prompt-tone');
const promptLengthSelect = document.getElementById('prompt-length');
const generatePromptButton = document.getElementById('generate-prompt');
const loadingSpinner = document.getElementById('loading-spinner');
const resultSection = document.getElementById('result-section');
const generatedPromptDiv = document.getElementById('generated-prompt');
const copyPromptButton = document.getElementById('copy-prompt');
const savePromptButton = document.getElementById('save-prompt');
const regeneratePromptButton = document.getElementById('regenerate-prompt');
const promptsList = document.getElementById('prompts-list');

// Estado do aplicativo
let apiKey = localStorage.getItem('gemini_api_key') || '';
let savedPrompts = JSON.parse(localStorage.getItem('saved_prompts') || '[]');
let currentPrompt = '';
let lastRequestParams = {};

// Inicialização
function init() {
    if (apiKey) {
        apiKeyInput.value = apiKey;
        apiStatus.textContent = 'Status: Chave configurada';
        apiStatus.classList.add('valid');
    }
    
    renderSavedPrompts();
    setupEventListeners();
}

// Configuração dos event listeners
function setupEventListeners() {
    saveKeyButton.addEventListener('click', saveApiKey);
    generatePromptButton.addEventListener('click', generatePrompt);
    copyPromptButton.addEventListener('click', copyPrompt);
    savePromptButton.addEventListener('click', savePrompt);
    regeneratePromptButton.addEventListener('click', regeneratePrompt);
}

// Salvar a chave API
function saveApiKey() {
    apiKey = apiKeyInput.value.trim();
    
    if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
        apiStatus.textContent = 'Status: Chave configurada';
        apiStatus.classList.add('valid');
        
        // Verificar a validade da chave, se a função existir
        if (window.GeminiAPI && window.GeminiAPI.verifyApiKey) {
            showLoading(true);
            window.GeminiAPI.verifyApiKey(apiKey)
                .then(isValid => {
                    if (isValid) {
                        apiStatus.textContent = 'Status: Chave válida e configurada';
                        apiStatus.classList.add('valid');
                    } else {
                        apiStatus.textContent = 'Status: Chave inválida';
                        apiStatus.classList.remove('valid');
                    }
                })
                .catch(() => {
                    apiStatus.textContent = 'Status: Erro ao verificar chave';
                    apiStatus.classList.remove('valid');
                })
                .finally(() => {
                    showLoading(false);
                });
        }
    } else {
        localStorage.removeItem('gemini_api_key');
        apiStatus.textContent = 'Status: Chave não configurada';
        apiStatus.classList.remove('valid');
    }
}

// Gerar um novo prompt usando a API do Gemini
async function generatePrompt() {
    if (!apiKey) {
        alert('Por favor, configure sua chave API do Gemini primeiro.');
        return;
    }

    const topic = promptTopicInput.value.trim();
    if (!topic) {
        alert('Por favor, insira um tópico para o prompt.');
        return;
    }

    showLoading(true);

    // Salvar parâmetros para possível regeneração
    lastRequestParams = {
        type: promptTypeSelect.value,
        topic: topic,
        details: promptDetailsInput.value.trim(),
        tone: promptToneSelect.value,
        length: promptLengthSelect.value
    };

    try {
        let prompt;
        
        // Usar a API real do Gemini se disponível, senão usar a simulação
        if (window.GeminiAPI && window.GeminiAPI.generateContent) {
            const instructionText = createPromptInstruction(lastRequestParams);
            try {
                prompt = await window.GeminiAPI.generateContent(apiKey, instructionText);
            } catch (error) {
                console.error('Erro na API do Gemini:', error);
                // Fallback para simulação se a API falhar
                prompt = await simulateGeminiResponse(instructionText, lastRequestParams);
            }
        } else {
            // Usar simulação se a API não estiver disponível
            const instructionText = createPromptInstruction(lastRequestParams);
            prompt = await simulateGeminiResponse(instructionText, lastRequestParams);
        }
        
        displayGeneratedPrompt(prompt);
    } catch (error) {
        console.error('Erro ao gerar prompt:', error);
        alert('Ocorreu um erro ao gerar o prompt. Verifique sua chave API e tente novamente.');
    } finally {
        showLoading(false);
    }
}

// Criar o texto de instrução para o Gemini
function createPromptInstruction(params) {
    const typeLabels = {
        'criativo': 'escrita criativa',
        'academico': 'texto acadêmico',
        'negocio': 'comunicação de negócios',
        'marketing': 'marketing e vendas',
        'codigo': 'programação',
        'personalizado': 'personalizado'
    };

    const toneLabels = {
        'formal': 'formal',
        'informal': 'informal',
        'amigavel': 'amigável',
        'tecnico': 'técnico',
        'persuasivo': 'persuasivo'
    };

    const lengthLabels = {
        'curto': 'curto (cerca de 100 palavras)',
        'medio': 'médio (cerca de 250 palavras)',
        'longo': 'longo (cerca de 500 palavras)',
        'detalhado': 'muito detalhado (mais de 1000 palavras)'
    };

    // Construir o texto para enviar ao Gemini
    return `Crie um prompt altamente eficaz, estruturado e detalhado para ${typeLabels[params.type]} sobre "${params.topic}". 
${params.details ? `Detalhes adicionais a considerar: ${params.details}` : ''}
O tom do prompt deve ser ${toneLabels[params.tone]}.
O prompt deve ser projetado para gerar uma resposta ${lengthLabels[params.length]}.

O prompt deve:
1. Ser claro e específico
2. Conter instruções detalhadas
3. Incluir perguntas ou pontos específicos a serem abordados
4. Ter estrutura que facilite respostas organizadas
5. Incluir qualquer restrição ou requisito especial

Formate o prompt de forma profissional e pronto para uso.`;
}

// Simular resposta da API (em um app real, esta função faria a chamada à API)
function simulateGeminiResponse(instruction, params) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Exemplos de prompts baseados nos parâmetros
            let response = '';
            
            switch(params.type) {
                case 'criativo':
                    response = `# Criação Narrativa: ${params.topic}

Desenvolva uma narrativa envolvente sobre ${params.topic} que cative o leitor desde a primeira linha. 

## Elementos Estruturais:
* Crie personagens memoráveis com motivações claras e conflitos internos
* Estabeleça um cenário vívido que complementa a temática principal
* Desenvolva um arco narrativo com introdução, desenvolvimento, clímax e resolução
* Utilize técnicas narrativas como foreshadowing e revelações estratégicas

## Estilo e Tom:
* Mantenha um tom ${params.tone} ao longo da narrativa
* Utilize linguagem sensorial e imagens vívidas para envolver o leitor
* Equilibre diálogos, descrições e reflexões internas dos personagens
* ${params.details ? `Incorpore os seguintes elementos: ${params.details}` : 'Escolha elementos que complementem a narrativa naturalmente'}

## Considerações Adicionais:
* Explore temas como [insira 2-3 temas relevantes ao tópico]
* Considere como a conclusão da história ressoa com sua mensagem central
* Revise para garantir coesão narrativa e desenvolvimento consistente dos personagens

Sua história deve ter aproximadamente ${params.length === 'curto' ? '500-800' : params.length === 'medio' ? '1500-2500' : params.length === 'longo' ? '3000-5000' : '7000+' } palavras.`;
                    break;
                
                case 'academico':
                    response = `# Análise Acadêmica: ${params.topic}

Desenvolva uma análise acadêmica aprofundada sobre ${params.topic}, adotando uma abordagem crítica e baseada em evidências.

## Estrutura Requerida:
* Introdução: Contextualize o tema, apresente uma tese clara e delineie a estrutura do trabalho
* Revisão de Literatura: Analise o estado atual da pesquisa sobre ${params.topic}
* Metodologia (se aplicável): Descreva e justifique a abordagem metodológica utilizada
* Análise: Examine criticamente os principais aspectos de ${params.topic}
* Discussão: Interprete os resultados da análise e posicione-os no contexto mais amplo da literatura
* Conclusão: Sintetize os principais argumentos e indique direções para pesquisas futuras

## Elementos Essenciais:
* Utilize terminologia acadêmica apropriada ao campo de estudo
* Mantenha um tom ${params.tone} e objetivo ao longo do texto
* Fundamente argumentos com evidências de pesquisas atuais e relevantes
* ${params.details ? `Aborde especificamente: ${params.details}` : 'Aborde os aspectos mais relevantes do tema'}
* Inclua citações no formato acadêmico (APA, MLA ou Chicago)

## Considerações Adicionais:
* Evite generalizações não fundamentadas
* Reconheça limitações e contra-argumentos
* Mantenha uma voz autoral que demonstre domínio do assunto

O trabalho deve ter aproximadamente ${params.length === 'curto' ? '1000-1500' : params.length === 'medio' ? '2500-3500' : params.length === 'longo' ? '5000-7000' : '10000+' } palavras, com estrutura clara de parágrafos e seções devidamente identificadas.`;
                    break;
                
                case 'negocio':
                    response = `# Comunicação Empresarial: ${params.topic}

Elabore uma comunicação empresarial clara e eficaz sobre ${params.topic}, seguindo as melhores práticas de comunicação corporativa.

## Formato e Estrutura:
* Cabeçalho: Inclua título conciso, data e destinatários
* Resumo Executivo: Apresente os pontos principais em um parágrafo inicial
* Contexto: Explique brevemente a situação atual relacionada a ${params.topic}
* Corpo Principal: Desenvolva os pontos-chave com subseções claramente identificadas
* Conclusão: Resuma os pontos principais e indique próximos passos ou ações esperadas
* Informações de Contato: Inclua detalhes para esclarecimentos adicionais

## Elementos Essenciais:
* Mantenha um tom ${params.tone} apropriado para comunicação empresarial
* Utilize linguagem clara, precisa e profissional
* Apresente informações de forma lógica e sequencial
* ${params.details ? `Aborde especificamente: ${params.details}` : 'Priorize as informações mais relevantes ao contexto empresarial'}
* Inclua dados concretos e métricas quando apropriado

## Considerações Adicionais:
* Antecipe possíveis perguntas e forneça respostas
* Mantenha o foco nos objetivos estratégicos da organização
* Considere diferentes stakeholders e suas perspectivas

A comunicação deve ter aproximadamente ${params.length === 'curto' ? '300-500' : params.length === 'medio' ? '700-1000' : params.length === 'longo' ? '1500-2000' : '3000+' } palavras, com parágrafos concisos e bem estruturados.`;
                    break;
                
                case 'marketing':
                    response = `# Estratégia de Marketing: ${params.topic}

Desenvolva uma estratégia de marketing completa para ${params.topic}, abordando todos os elementos essenciais para uma campanha eficaz.

## Estrutura da Estratégia:
* Análise de Mercado: Identifique o público-alvo, concorrentes e posicionamento atual
* Objetivos: Defina metas SMART (específicas, mensuráveis, atingíveis, relevantes e temporais)
* Proposta de Valor: Articule claramente o diferencial competitivo de ${params.topic}
* Mix de Marketing: Detalhe estratégias para produto, preço, praça e promoção
* Cronograma: Estabeleça um timeline para implementação das ações
* Métricas: Determine KPIs para avaliar o sucesso da estratégia

## Elementos Essenciais:
* Mantenha um tom ${params.tone} alinhado com a identidade da marca
* Utilize linguagem persuasiva e orientada para resultados
* ${params.details ? `Integre os seguintes aspectos: ${params.details}` : 'Priorize táticas com melhor relação custo-benefício'}
* Segmente claramente o público-alvo e personalize mensagens para cada segmento
* Inclua exemplos concretos de materiais ou mensagens de marketing

## Considerações Adicionais:
* Integre canais digitais e tradicionais de forma coerente
* Proponha estratégias de engajamento e conversão
* Considere tendências atuais do mercado e comportamento do consumidor

A estratégia deve ter aproximadamente ${params.length === 'curto' ? '500-800' : params.length === 'medio' ? '1200-1800' : params.length === 'longo' ? '2500-3500' : '5000+' } palavras, com seções claramente definidas e recursos visuais sugeridos quando apropriado.`;
                    break;
                
                case 'codigo':
                    response = `# Projeto de Programação: ${params.topic}

Desenvolva um código bem estruturado e documentado para ${params.topic}, seguindo as melhores práticas de desenvolvimento de software.

## Requisitos Técnicos:
* Objetivo do Código: Criar uma solução que [descreva a funcionalidade principal]
* Linguagem: [Especifique a linguagem de programação preferida ou peça recomendação]
* Paradigma: [Orientação a objetos, funcional, procedural, etc.]
* Estrutura: Organize o código em módulos/classes com responsabilidades bem definidas
* Tratamento de Erros: Implemente validações e tratamento de exceções adequados

## Elementos Essenciais:
* Documente claramente cada função, classe e método
* Siga padrões de codificação consistentes (indentação, nomenclatura, etc.)
* ${params.details ? `Inclua as seguintes funcionalidades: ${params.details}` : 'Foque na eficiência e legibilidade do código'}
* Implemente testes para verificar o funcionamento correto
* Otimize o código considerando desempenho e uso de recursos

## Considerações Adicionais:
* Forneça instruções detalhadas para instalação e execução
* Considere escalabilidade e manutenibilidade futuras
* Inclua exemplos de uso ou casos de teste

O código deve ser ${params.length === 'curto' ? 'conciso e focado em uma funcionalidade específica' : params.length === 'medio' ? 'moderadamente complexo com algumas funcionalidades integradas' : params.length === 'longo' ? 'um sistema completo com múltiplos componentes interagindo' : 'um projeto extenso com arquitetura complexa e múltiplos módulos interdependentes'}.`;
                    break;
                
                default: // Personalizado
                    response = `# Prompt Personalizado: ${params.topic}

Elabore um conteúdo detalhado e informativo sobre ${params.topic}, seguindo uma abordagem personalizada que atenda às necessidades específicas do projeto.

## Estrutura Sugerida:
* Introdução: Contextualize ${params.topic} e estabeleça o propósito do conteúdo
* Desenvolvimento: Explore os principais aspectos de ${params.topic} em seções lógicas
* Exemplos/Casos: Ilustre os conceitos com exemplos práticos ou estudos de caso
* Análise: Ofereça insights e interpretações sobre ${params.topic}
* Conclusão: Sintetize as ideias principais e ofereça considerações finais

## Elementos Essenciais:
* Mantenha um tom ${params.tone} consistente com o objetivo do conteúdo
* Estruture o texto de forma clara com parágrafos e seções bem definidos
* ${params.details ? `Aborde especificamente: ${params.details}` : 'Priorize os aspectos mais relevantes ao contexto'}
* Utilize recursos como listas, comparações e metáforas para facilitar a compreensão
* Inclua referências ou fontes quando apropriado

## Considerações Adicionais:
* Adapte o conteúdo ao nível de conhecimento do público-alvo
* Equilibre informações técnicas/específicas com explicações acessíveis
* Considere diferentes perspectivas sobre ${params.topic}

O conteúdo deve ter aproximadamente ${params.length === 'curto' ? '400-700' : params.length === 'medio' ? '1000-1500' : params.length === 'longo' ? '2000-3000' : '5000+' } palavras, mantendo coesão e fluidez entre as seções.`;
            }
            
            resolve(response);
        }, 1500); // Simular tempo de resposta da API
    });
}

// Exibir o prompt gerado
function displayGeneratedPrompt(prompt) {
    currentPrompt = prompt;
    generatedPromptDiv.innerHTML = formatPromptOutput(prompt);
    resultSection.classList.remove('hidden');
    
    // Rolar até a seção de resultados
    window.scrollTo({
        top: resultSection.offsetTop - 20,
        behavior: 'smooth'
    });
}

// Formatar o prompt para exibição HTML
function formatPromptOutput(text) {
    // Converter Markdown para HTML básico
    return text
        .replace(/# (.*?)\n/g, '<h3>$1</h3>')
        .replace(/## (.*?)\n/g, '<h4>$1</h4>')
        .replace(/\* (.*?)$/gm, '<li>$1</li>')
        .replace(/<li>(.*?)<\/li>/g, function(match) {
            return match.replace(/\n/g, '');
        })
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
}

// Copiar prompt para a área de transferência
function copyPrompt() {
    navigator.clipboard.writeText(currentPrompt)
        .then(() => {
            const originalText = copyPromptButton.textContent;
            copyPromptButton.textContent = 'Copiado!';
            setTimeout(() => {
                copyPromptButton.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Erro ao copiar texto: ', err);
            alert('Não foi possível copiar o texto.');
        });
}

// Salvar o prompt atual
function savePrompt() {
    if (!currentPrompt) return;
    
    const title = promptTopicInput.value.trim();
    const timestamp = new Date().toISOString();
    const id = `prompt_${Date.now()}`;
    
    const promptData = {
        id,
        title,
        content: currentPrompt,
        type: promptTypeSelect.value,
        timestamp,
        parameters: {...lastRequestParams}
    };
    
    savedPrompts.unshift(promptData);
    localStorage.setItem('saved_prompts', JSON.stringify(savedPrompts));
    renderSavedPrompts();
    
    savePromptButton.textContent = 'Salvo!';
    setTimeout(() => {
        savePromptButton.textContent = 'Salvar';
    }, 2000);
}

// Regenerar o prompt atual
function regeneratePrompt() {
    if (Object.keys(lastRequestParams).length === 0) return;
    
    generatePrompt();
}

// Renderizar a lista de prompts salvos
function renderSavedPrompts() {
    if (savedPrompts.length === 0) {
        promptsList.innerHTML = '<p class="no-prompts">Nenhum prompt salvo ainda.</p>';
        return;
    }
    
    promptsList.innerHTML = '';
    
    savedPrompts.forEach(prompt => {
        const promptElement = document.createElement('div');
        promptElement.className = 'saved-prompt-item';
        promptElement.id = prompt.id;
        
        const typeLabels = {
            'criativo': 'Criativo',
            'academico': 'Acadêmico',
            'negocio': 'Negócios',
            'marketing': 'Marketing',
            'codigo': 'Programação',
            'personalizado': 'Personalizado'
        };
        
        const date = new Date(prompt.timestamp).toLocaleDateString();
        
        promptElement.innerHTML = `
            <div class="saved-prompt-header">
                <div class="saved-prompt-title">${prompt.title}</div>
                <div class="saved-prompt-type">${typeLabels[prompt.type] || 'Personalizado'}</div>
            </div>
            <div class="saved-prompt-date">Criado em: ${date}</div>
            <div class="saved-prompt-preview">${prompt.content.substring(0, 100)}...</div>
            <div class="saved-prompt-actions">
                <button class="view-prompt" data-id="${prompt.id}">Ver</button>
                <button class="load-prompt" data-id="${prompt.id}">Carregar</button>
                <button class="delete-prompt" data-id="${prompt.id}">Excluir</button>
            </div>
        `;
        
        promptsList.appendChild(promptElement);
    });
    
    // Adicionar event listeners aos botões
    document.querySelectorAll('.view-prompt').forEach(btn => {
        btn.addEventListener('click', (e) => viewSavedPrompt(e.target.dataset.id));
    });
    
    document.querySelectorAll('.load-prompt').forEach(btn => {
        btn.addEventListener('click', (e) => loadSavedPrompt(e.target.dataset.id));
    });
    
    document.querySelectorAll('.delete-prompt').forEach(btn => {
        btn.addEventListener('click', (e) => deleteSavedPrompt(e.target.dataset.id));
    });
}

// Ver um prompt salvo
function viewSavedPrompt(id) {
    const prompt = savedPrompts.find(p => p.id === id);
    if (!prompt) return;
    
    displayGeneratedPrompt(prompt.content);
    window.scrollTo({
        top: resultSection.offsetTop - 20,
        behavior: 'smooth'
    });
}

// Carregar um prompt salvo nos campos de entrada
function loadSavedPrompt(id) {
    const prompt = savedPrompts.find(p => p.id === id);
    if (!prompt || !prompt.parameters) return;
    
    const params = prompt.parameters;
    
    promptTypeSelect.value = params.type || 'personalizado';
    promptTopicInput.value = params.topic || '';
    promptDetailsInput.value = params.details || '';
    promptToneSelect.value = params.tone || 'formal';
    promptLengthSelect.value = params.length || 'medio';
    
    window.scrollTo({
        top: document.querySelector('.prompt-generator').offsetTop - 20,
        behavior: 'smooth'
    });
}

// Excluir um prompt salvo
function deleteSavedPrompt(id) {
    if (!confirm('Tem certeza que deseja excluir este prompt?')) return;
    
    savedPrompts = savedPrompts.filter(p => p.id !== id);
    localStorage.setItem('saved_prompts', JSON.stringify(savedPrompts));
    renderSavedPrompts();
}

// Mostrar/ocultar o indicador de carregamento
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
        generatePromptButton.disabled = true;
    } else {
        loadingSpinner.classList.add('hidden');
        generatePromptButton.disabled = false;
    }
}

// Inicializar o aplicativo quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', init);