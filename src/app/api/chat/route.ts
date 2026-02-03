import { NextRequest, NextResponse } from 'next/server';

// System prompt for the AI
const SYSTEM_PROMPT = `あなたは「Another I」- ユーザーの知的パートナーであり、もう一人の自分です。
ユーザーの思考を整理し、構造化し、客観的な視点を提供することが役割です。

【応答のルール】
1. 前置きや挨拶、過度な賞賛は省略し、結論から端的に述べてください
2. 感情的な共感よりも、論理的な整理と具体的な解決策を優先してください
3. ユーザーの意図を汲み取り、構造化して回答してください
4. 日本語で応答してください

【思考整理のアプローチ】
- 複数の視点（メリット・デメリット、短期的・長期的視点など）を提供
- 抽象的なアイデアを具体的なアクションに落とし込む支援
- 構造化されたフォーマット（箇条書き、表など）を積極的に使用`;

type AIProvider = 'openai' | 'anthropic' | 'gemini';

interface ChatRequest {
    messages: { role: string; content: string }[];
    settings?: {
        provider: AIProvider;
        apiKey: string;
        model: string;
    };
}

async function callOpenAI(
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callAnthropic(
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 100000,
            system: SYSTEM_PROMPT,
            messages: messages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            }))
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

async function callGemini(
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: 0.7
                },
                systemInstruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for valid response structure
    if (!data.candidates || data.candidates.length === 0) {
        // Check for blocked content or other issues
        if (data.promptFeedback?.blockReason) {
            throw new Error(`コンテンツがブロックされました: ${data.promptFeedback.blockReason}`);
        }
        // Log full response for debugging
        console.error('Gemini empty response:', JSON.stringify(data, null, 2));
        throw new Error('Geminiからの応答が空でした。メッセージが長すぎる可能性があります。');
    }

    const candidate = data.candidates[0];

    // Check finish reason for issues
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        const reasons: Record<string, string> = {
            'MAX_TOKENS': 'トークン上限に達しました。短いメッセージでお試しください。',
            'SAFETY': 'セーフティフィルターにより停止されました。',
            'RECITATION': '引用制限により停止されました。',
            'OTHER': '予期しない理由で停止されました。'
        };
        throw new Error(reasons[candidate.finishReason] || `終了理由: ${candidate.finishReason}`);
    }

    if (!candidate.content?.parts?.[0]?.text) {
        // Log for debugging
        console.error('Gemini invalid response format:', JSON.stringify(candidate, null, 2));
        throw new Error('Geminiの応答が空です。メッセージを短くしてお試しください。');
    }

    return candidate.content.parts[0].text;
}

export async function POST(request: NextRequest) {
    try {
        const { messages, settings } = await request.json() as ChatRequest;

        // If no settings provided from client, return demo mode
        if (!settings?.apiKey) {
            return NextResponse.json({
                message: getMockResponse(messages),
                isDemo: true,
                provider: 'demo'
            });
        }

        const { provider, apiKey, model } = settings;
        let responseMessage: string;

        // Limit message history to prevent token overflow (keep last 20 messages)
        const MAX_MESSAGES = 20;
        const truncatedMessages = messages.length > MAX_MESSAGES
            ? messages.slice(-MAX_MESSAGES)
            : messages;

        switch (provider) {
            case 'openai':
                responseMessage = await callOpenAI(apiKey, model, truncatedMessages);
                break;
            case 'anthropic':
                responseMessage = await callAnthropic(apiKey, model, truncatedMessages);
                break;
            case 'gemini':
                responseMessage = await callGemini(apiKey, model, truncatedMessages);
                break;
            default:
                throw new Error('Unknown provider');
        }

        return NextResponse.json({
            message: responseMessage,
            isDemo: false,
            provider
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Chat API error:', errorMessage, error);

        // Return error message instead of mock to help debug
        return NextResponse.json({
            message: `⚠️ API エラーが発生しました: ${errorMessage}\n\n設定を確認してください。長すぎるメッセージの場合は、内容を短くしてお試しください。`,
            isDemo: true,
            provider: 'error',
            error: errorMessage
        }, { status: 200 }); // Return 200 so the error message is displayed
    }
}

function getMockResponse(messages: { role: string; content: string }[]): string {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

    const responses = [
        "なるほど、それは大切なポイントですね。もう少し具体的に、どんな状況でそう感じますか？",
        "その考え、よく分かります。整理してみましょう。一番気になっているのはどの部分ですか？",
        "それぞれの選択肢について、メリットとデメリットを書き出してみましょうか？",
        "その気持ち、抱えているのは大変ですよね。優先順位をつけるとしたら、何が一番重要ですか？",
        "なるほど。その中で、今すぐ決めなければいけないことと、後で考えても良いことを分けてみましょう。"
    ];

    if (lastUserMessage.includes('悩') || lastUserMessage.includes('困')) {
        return "その悩み、じっくり一緒に考えましょう。具体的にどんなことで困っていますか？";
    }
    if (lastUserMessage.includes('仕事') || lastUserMessage.includes('優先')) {
        return "仕事の優先順位で迷っているんですね。今抱えているタスクを書き出してみましょうか？";
    }
    if (lastUserMessage.includes('整理') || lastUserMessage.includes('まとめ')) {
        return "これまでの話を整理してみますね。いくつかの重要なポイントが見えてきました。";
    }

    return responses[Math.floor(Math.random() * responses.length)];
}
