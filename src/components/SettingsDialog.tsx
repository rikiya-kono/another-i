'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, Loader2, Check, X, LayoutPanelLeft } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { type AIProvider, type AISettings, type ModelInfo } from '@/hooks/useAISettings';

type LayoutMode = 'editor-first' | 'chat-first';

interface SettingsDialogProps {
    settings: AISettings | null;
    availableModels: ModelInfo[];
    isLoading: boolean;
    onSave: (settings: AISettings) => void;
    onClear: () => void;
    onProviderChange: (provider: AIProvider, apiKey: string) => Promise<ModelInfo[]>;
    defaultModels: Record<AIProvider, ModelInfo[]>;
    layoutMode?: LayoutMode;
    onLayoutChange?: (mode: LayoutMode) => void;
}

const PROVIDERS: { id: AIProvider; name: string; placeholder: string; link: string }[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        placeholder: 'sk-...',
        link: 'https://platform.openai.com/api-keys'
    },
    {
        id: 'anthropic',
        name: 'Anthropic (Claude)',
        placeholder: 'sk-ant-...',
        link: 'https://console.anthropic.com/'
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        placeholder: 'AIza...',
        link: 'https://aistudio.google.com/apikey'
    },
];

export function SettingsDialog({
    settings,
    availableModels,
    isLoading,
    onSave,
    onClear,
    onProviderChange,
    defaultModels,
    layoutMode = 'editor-first',
    onLayoutChange
}: SettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [provider, setProvider] = useState<AIProvider>(settings?.provider || 'openai');
    const [apiKey, setApiKey] = useState(settings?.apiKey || '');
    const [model, setModel] = useState(settings?.model || '');
    const [localModels, setLocalModels] = useState<ModelInfo[]>(availableModels);
    const [isValidating, setIsValidating] = useState(false);
    const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const [localLayout, setLocalLayout] = useState<LayoutMode>(layoutMode);
    const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(false);

    // Load skip delete confirmation preference
    useEffect(() => {
        const saved = localStorage.getItem('skipDeleteConfirmation');
        setSkipDeleteConfirmation(saved === 'true');
    }, [open]);

    const handleRestoreDeleteConfirmation = () => {
        localStorage.removeItem('skipDeleteConfirmation');
        setSkipDeleteConfirmation(false);
    };

    // Sync with external settings
    useEffect(() => {
        if (settings) {
            setProvider(settings.provider);
            setApiKey(settings.apiKey);
            setModel(settings.model);
        }
    }, [settings]);

    useEffect(() => {
        setLocalModels(availableModels);
    }, [availableModels]);

    useEffect(() => {
        setLocalLayout(layoutMode);
    }, [layoutMode]);

    // When provider changes, reset model and fetch new models
    const handleProviderChange = async (newProvider: AIProvider) => {
        setProvider(newProvider);
        setModel('');
        setValidationStatus('idle');

        const defaults = defaultModels[newProvider] || [];
        setLocalModels(defaults);

        if (defaults.length > 0) {
            setModel(defaults[0].id);
        }
    };

    // Validate API key and fetch models
    const handleValidateKey = async () => {
        if (!apiKey.trim()) return;

        setIsValidating(true);
        setValidationStatus('idle');

        try {
            const models = await onProviderChange(provider, apiKey);
            setLocalModels(models);
            if (models.length > 0) {
                setModel(models[0].id);
                setValidationStatus('valid');
            } else {
                setValidationStatus('invalid');
            }
        } catch {
            setValidationStatus('invalid');
        } finally {
            setIsValidating(false);
        }
    };

    const handleSave = () => {
        if (apiKey.trim() && model) {
            onSave({ provider, apiKey: apiKey.trim(), model });
        }
        if (onLayoutChange && localLayout !== layoutMode) {
            onLayoutChange(localLayout);
        }
        setOpen(false);
    };

    const handleClear = () => {
        onClear();
        setApiKey('');
        setModel('');
        setValidationStatus('idle');
        setOpen(false);
    };

    const selectedProvider = PROVIDERS.find(p => p.id === provider);
    const isConfigured = !!settings?.apiKey;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 relative"
                    title="設定"
                >
                    <Settings className="h-4 w-4" />
                    {isConfigured && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500" />
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        設定
                    </DialogTitle>
                    <DialogDescription>
                        AIとレイアウトの設定を行います
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Layout Settings */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <LayoutPanelLeft className="h-4 w-4" />
                            <Label className="text-base font-medium">レイアウト</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setLocalLayout('editor-first')}
                                className={`p-3 rounded-lg border-2 transition-colors ${localLayout === 'editor-first'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground'
                                    }`}
                            >
                                <div className="flex gap-1 mb-2">
                                    <div className="w-2 h-8 bg-muted rounded" />
                                    <div className="flex-1 h-8 bg-primary/20 rounded" />
                                    <div className="w-8 h-8 bg-muted rounded" />
                                </div>
                                <span className="text-xs">レポート | チャット</span>
                            </button>
                            <button
                                onClick={() => setLocalLayout('chat-first')}
                                className={`p-3 rounded-lg border-2 transition-colors ${localLayout === 'chat-first'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground'
                                    }`}
                            >
                                <div className="flex gap-1 mb-2">
                                    <div className="w-2 h-8 bg-muted rounded" />
                                    <div className="w-8 h-8 bg-primary/20 rounded" />
                                    <div className="flex-1 h-8 bg-muted rounded" />
                                </div>
                                <span className="text-xs">チャット | レポート</span>
                            </button>
                        </div>

                        {/* Restore delete confirmation */}
                        {skipDeleteConfirmation && (
                            <div className="mt-4 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        削除確認が無効になっています
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRestoreDeleteConfirmation}
                                    >
                                        確認を復活
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Key className="h-4 w-4" />
                            <Label className="text-base font-medium">AI設定</Label>
                        </div>

                        {/* Provider Selection */}
                        <div className="space-y-2 mb-4">
                            <Label className="text-sm">プロバイダー</Label>
                            <Select value={provider} onValueChange={(v) => handleProviderChange(v as AIProvider)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="プロバイダーを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROVIDERS.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* API Key Input */}
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">APIキー</Label>
                                <a
                                    href={selectedProvider?.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                >
                                    キーを取得 →
                                </a>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type="password"
                                        placeholder={selectedProvider?.placeholder}
                                        value={apiKey}
                                        onChange={(e) => {
                                            setApiKey(e.target.value);
                                            setValidationStatus('idle');
                                        }}
                                    />
                                    {validationStatus === 'valid' && (
                                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                    )}
                                    {validationStatus === 'invalid' && (
                                        <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleValidateKey}
                                    disabled={!apiKey.trim() || isValidating}
                                >
                                    {isValidating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        '検証'
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                🔒 キーはブラウザ内にのみ保存されます
                            </p>
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-2">
                            <Label className="text-sm">モデル</Label>
                            <Select
                                value={model}
                                onValueChange={setModel}
                                disabled={localModels.length === 0 || isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoading ? "読み込み中..." : "モデルを選択"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {localModels.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                    <Button
                        variant="ghost"
                        onClick={handleClear}
                        disabled={!isConfigured}
                    >
                        AI設定をクリア
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            キャンセル
                        </Button>
                        <Button onClick={handleSave}>
                            保存
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
