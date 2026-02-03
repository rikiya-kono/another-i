'use client';

import { useState, useEffect, useCallback } from 'react';

export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface AISettings {
    provider: AIProvider;
    apiKey: string;
    model: string;
}

export interface ModelInfo {
    id: string;
    name: string;
}

const STORAGE_KEY = 'another-i-settings';

const DEFAULT_MODELS: Record<AIProvider, ModelInfo[]> = {
    openai: [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
    anthropic: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ],
    gemini: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
};

export function useAISettings() {
    const [settings, setSettings] = useState<AISettings | null>(null);
    const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as AISettings;
                setSettings(parsed);
                setAvailableModels(DEFAULT_MODELS[parsed.provider] || []);
            } catch (e) {
                console.error('Failed to parse stored settings:', e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save settings to localStorage
    const saveSettings = useCallback((newSettings: AISettings) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
    }, []);

    // Clear settings
    const clearSettings = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setSettings(null);
        setAvailableModels([]);
    }, []);

    // Fetch available models from the API
    const fetchModels = useCallback(async (provider: AIProvider, apiKey: string) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, apiKey })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.models && data.models.length > 0) {
                    setAvailableModels(data.models);
                    return data.models;
                }
            }

            // Fall back to default models
            const defaults = DEFAULT_MODELS[provider] || [];
            setAvailableModels(defaults);
            return defaults;
        } catch (error) {
            console.error('Failed to fetch models:', error);
            const defaults = DEFAULT_MODELS[provider] || [];
            setAvailableModels(defaults);
            return defaults;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Update provider and fetch models
    const setProvider = useCallback(async (provider: AIProvider, apiKey: string) => {
        const models = await fetchModels(provider, apiKey);
        const defaultModel = models[0]?.id || '';

        const newSettings: AISettings = {
            provider,
            apiKey,
            model: defaultModel
        };

        saveSettings(newSettings);
        return models;
    }, [fetchModels, saveSettings]);

    return {
        settings,
        availableModels,
        isLoading,
        isInitialized,
        isConfigured: !!settings?.apiKey,
        saveSettings,
        clearSettings,
        fetchModels,
        setProvider,
        DEFAULT_MODELS
    };
}
