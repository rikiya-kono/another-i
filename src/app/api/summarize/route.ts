import { NextRequest, NextResponse } from 'next/server';

const SUMMARY_PROMPT = `以下の対話内容を分析し、構造化されたサマリーを作成してください。

【出力形式】
# [会話のトピック/タイトル]

## 背景・課題
ユーザーが相談・質問したことの趣旨を1-2文で簡潔に要約。

## 議論の内容
対話で出た重要なポイントを箇条書きで整理。AIの提案や指摘を中心に。
- ポイント1
- ポイント2

## 結論・次のステップ
対話で到達した結論や、次にとるべきアクションがあれば記載。なければ省略。

【制約】
- 対話内容をそのまま転記しない（要約すること）
- 事実に基づいて簡潔に記述
- メタ言及（「この会話では～」「以下に述べる」等）は不要
- 「ユーザーは～」ではなく要点だけ記述
- 日本語で出力`;

type AIProvider = 'openai' | 'anthropic' | 'gemini';

interface SummarizeRequest {
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
    const conversationText = messages
        .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
        .join('\n\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: SUMMARY_PROMPT },
                { role: 'user', content: conversationText }
            ],
            temperature: 0.3
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
    const conversationText = messages
        .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
        .join('\n\n');

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
            system: SUMMARY_PROMPT,
            messages: [{ role: 'user', content: conversationText }]
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
    const conversationText = messages
        .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
        .join('\n\n');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: conversationText }] }],
                generationConfig: {
                    temperature: 0.3
                },
                systemInstruction: {
                    parts: [{ text: SUMMARY_PROMPT }]
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

export async function POST(request: NextRequest) {
    try {
        const { messages, settings } = await request.json() as SummarizeRequest;

        if (!settings?.apiKey) {
            // Demo mode - return simple fallback summary
            return NextResponse.json({
                summary: generateFallbackSummary(messages),
                isDemo: true
            });
        }

        const { provider, apiKey, model } = settings;
        let summary: string;

        // Limit messages to prevent token overflow
        const MAX_MESSAGES = 30;
        const truncatedMessages = messages.length > MAX_MESSAGES
            ? messages.slice(-MAX_MESSAGES)
            : messages;

        switch (provider) {
            case 'openai':
                summary = await callOpenAI(apiKey, model, truncatedMessages);
                break;
            case 'anthropic':
                summary = await callAnthropic(apiKey, model, truncatedMessages);
                break;
            case 'gemini':
                summary = await callGemini(apiKey, model, truncatedMessages);
                break;
            default:
                throw new Error('Unknown provider');
        }

        return NextResponse.json({
            summary,
            isDemo: false
        });

    } catch (error) {
        console.error('Summarize API error:', error);
        return NextResponse.json({
            summary: generateFallbackSummary([]),
            isDemo: true,
            error: error instanceof Error ? error.message : 'Failed to generate summary'
        }, { status: 500 });
    }
}

function generateFallbackSummary(messages: { role: string; content: string }[]): string {
    if (messages.length === 0) {
        return '# 対話サマリー\n\n対話がまだありません。';
    }

    const userMessages = messages.filter(m => m.role === 'user');
    const firstTopic = userMessages[0]?.content.slice(0, 100) || '不明';

    return `# 対話サマリー

## 背景・課題
${firstTopic}${firstTopic.length >= 100 ? '...' : ''}

## 議論の内容
- ${userMessages.length}件のトピックについて対話
- 詳細なサマリーにはAPI設定が必要です

## 備考
設定からAPIキーを登録すると、AIによる詳細なサマリーが生成されます。`;
}
