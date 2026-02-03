import { NextRequest, NextResponse } from 'next/server';

type AIProvider = 'openai' | 'anthropic' | 'gemini';

interface ModelInfo {
    id: string;
    name: string;
}

export async function POST(request: NextRequest) {
    try {
        const { provider, apiKey } = await request.json() as {
            provider: AIProvider;
            apiKey: string
        };

        if (!apiKey) {
            return NextResponse.json({ error: 'API key required' }, { status: 400 });
        }

        let models: ModelInfo[] = [];

        switch (provider) {
            case 'openai':
                models = await fetchOpenAIModels(apiKey);
                break;
            case 'anthropic':
                // Anthropic doesn't have a models list endpoint, return defaults
                models = getAnthropicModels();
                break;
            case 'gemini':
                models = await fetchGeminiModels(apiKey);
                break;
            default:
                return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
        }

        return NextResponse.json({ models });
    } catch (error) {
        console.error('Models API error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch models'
        }, { status: 500 });
    }
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
    const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch OpenAI models');
    }

    const data = await response.json();

    // Filter and format models (focus on chat models)
    const chatModels = data.data
        .filter((model: { id: string }) =>
            model.id.includes('gpt-4') ||
            model.id.includes('gpt-3.5') ||
            model.id.includes('o1') ||
            model.id.includes('o3')
        )
        .map((model: { id: string }) => ({
            id: model.id,
            name: formatModelName(model.id)
        }))
        .sort((a: ModelInfo, b: ModelInfo) => {
            // Sort by model family and version
            const order = ['o3', 'o1', 'gpt-4o', 'gpt-4', 'gpt-3.5'];
            const aIndex = order.findIndex(prefix => a.id.includes(prefix));
            const bIndex = order.findIndex(prefix => b.id.includes(prefix));
            return aIndex - bIndex;
        });

    // Remove duplicates and limit
    const seen = new Set<string>();
    const unique = chatModels.filter((model: ModelInfo) => {
        if (seen.has(model.id)) return false;
        seen.add(model.id);
        return true;
    }).slice(0, 15);

    return unique;
}

function getAnthropicModels(): ModelInfo[] {
    return [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ];
}

async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch Gemini models');
    }

    const data = await response.json();

    // Filter for generative models - show all models that support generateContent
    const generativeModels = data.models
        .filter((model: { name: string; supportedGenerationMethods?: string[] }) =>
            model.supportedGenerationMethods?.includes('generateContent') &&
            model.name.includes('gemini')  // Only Gemini models, not embedding/AQA models
        )
        .map((model: { name: string; displayName: string }) => ({
            id: model.name.replace('models/', ''),
            name: model.displayName || formatModelName(model.name)
        }))
        .sort((a: ModelInfo, b: ModelInfo) => {
            // Sort newer versions first (higher numbers first)
            const extractVersion = (id: string) => {
                const match = id.match(/gemini-(\d+\.?\d*)/);
                return match ? parseFloat(match[1]) : 0;
            };
            const versionDiff = extractVersion(b.id) - extractVersion(a.id);
            if (versionDiff !== 0) return versionDiff;
            // Secondary sort: pro > flash > nano
            const tier = (id: string) => {
                if (id.includes('pro')) return 3;
                if (id.includes('flash')) return 2;
                return 1;
            };
            return tier(b.id) - tier(a.id);
        })
        .slice(0, 20);

    return generativeModels;
}

function formatModelName(id: string): string {
    return id
        .replace('models/', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace('Gpt', 'GPT')
        .replace('O1', 'o1')
        .replace('O3', 'o3');
}
