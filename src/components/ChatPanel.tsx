'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, Sparkles, User, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatPanelProps {
    messages: Message[];
    onSendMessage: (content: string) => void;
    onNewConversation: () => void;
    isLoading?: boolean;
    isConfigured?: boolean;
    providerName?: string;
}

export function ChatPanel({
    messages,
    onSendMessage,
    onNewConversation,
    isLoading = false,
    isConfigured = false,
    providerName
}: ChatPanelProps) {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const getProviderLabel = () => {
        if (!isConfigured) return 'デモモード';
        switch (providerName) {
            case 'openai': return 'OpenAI';
            case 'anthropic': return 'Claude';
            case 'gemini': return 'Gemini';
            default: return 'AI';
        }
    };

    return (
        <div className="h-full flex flex-col bg-background border-l border-border">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">もう一人の私と対話</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        isConfigured ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                        {getProviderLabel()}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onNewConversation}
                        className="h-7 gap-1 text-xs"
                    >
                        <Plus className="h-3 w-3" />
                        新しい会話
                    </Button>
                </div>
            </div>

            {/* Configuration Notice */}
            {!isConfigured && messages.length === 0 && (
                <div className="mx-4 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-500">デモモードで動作中</p>
                            <p className="text-muted-foreground mt-1">
                                左上の⚙️設定からAPIキーを設定すると、本物のAIが応答します。
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4"
            >
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <EmptyState />
                    ) : (
                        messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))
                    )}

                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 bg-primary/10">
                                <AvatarFallback>
                                    <Sparkles className="h-4 w-4 text-primary" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1 px-4 py-3 rounded-2xl bg-muted text-sm">
                                <span className="animate-bounce">●</span>
                                <span className="animate-bounce [animation-delay:0.1s]">●</span>
                                <span className="animate-bounce [animation-delay:0.2s]">●</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="思ったことを話してみて..."
                            rows={1}
                            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                            style={{ maxHeight: '150px' }}
                        />
                    </div>
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading}
                        className="h-10 w-10 rounded-xl shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Shift + Enter で改行
                </p>
            </div>
        </div>
    );
}

function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === 'user';

    return (
        <div className={cn(
            "flex items-start gap-3",
            isUser && "flex-row-reverse"
        )}>
            <Avatar className={cn(
                "h-8 w-8",
                isUser ? "bg-blue-500/10" : "bg-primary/10"
            )}>
                <AvatarFallback>
                    {isUser ? (
                        <User className="h-4 w-4 text-slate-300" />
                    ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                    )}
                </AvatarFallback>
            </Avatar>

            <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                isUser
                    ? "bg-slate-700 text-slate-100"
                    : "bg-muted"
            )}>
                {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                    <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}
                <span className={cn(
                    "text-xs mt-1 block",
                    isUser ? "text-slate-400" : "text-muted-foreground"
                )}>
                    {message.timestamp.toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </span>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium mb-2">対話を始めましょう</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
                何でも話してください。<br />
                一緒に考えを整理します。
            </p>
        </div>
    );
}
