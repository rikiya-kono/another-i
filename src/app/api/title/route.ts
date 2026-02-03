
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
ユーザーのメッセージに基づいて、会話のタイトルを生成してください。
ルール：
1. タイトルは日本語で、15文字以内。
2. 内容を的確に表す短いフレーズにする。
3. "「"や"」"などの記号は含めない。
4. "会話のタイトル："などの前置きは不要。タイトルのみを出力する。
`;

export async function POST(req: NextRequest) {
    try {
        const { message, model, apiKey, provider } = await req.json();

        if (!message) {
            return NextResponse.json(
                { error: { message: 'Message is required' } },
                { status: 400 }
            );
        }

        let title = '';

        try {
            switch (provider) {
                case 'openai':
                    title = await callOpenAI(apiKey, model, message);
                    break;
                case 'anthropic':
                    title = await callAnthropic(apiKey, model, message);
                    break;
                case 'gemini':
                    title = await callGemini(apiKey, model, message);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }

            // Clean up the title (remove quotes, newlines, etc.)
            title = title.replace(/['"「」\n]/g, '').trim();
            if (title.length > 20) {
                title = title.substring(0, 20);
            }

            return NextResponse.json({ title });
        } catch (error: any) {
            console.error('Title generation error:', error);
            return NextResponse.json(
                { error: { message: error.message || 'Failed to generate title' } },
                { status: 500 }
            );
        }

    } catch (error: any) {
        return NextResponse.json(
            { error: { message: 'Invalid request' } },
            { status: 400 }
        );
    }
}

async function callOpenAI(apiKey: string, model: string, message: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model.includes('gpt') ? model : 'gpt-3.5-turbo', // Fallback for title gen if needed
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: message }
            ],
            temperature: 0.5,
            max_tokens: 50
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callAnthropic(apiKey: string, model: string, message: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 50,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: message }]
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

async function callGemini(apiKey: string, model: string, message: string): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: message }] }],
                generationConfig: {
                    temperature: 0.5
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

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates returned from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
}
