'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, Sparkles, User, AlertCircle, Plus, Square, RefreshCw, Pencil, Check, X } from 'lucide-react';
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
    onStopGeneration?: () => void;
    onRegenerateResponse?: () => void;
    onEditMessage?: (messageId: string, newContent: string) => void;
    isLoading?: boolean;
    isConfigured?: boolean;
    providerName?: string;
}

export function ChatPanel({
    messages,
    onSendMessage,
    onNewConversation,
    onStopGeneration,
    onRegenerateResponse,
    onEditMessage,
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

    // Find the last AI message index for regenerate button
    const lastAiMessageIndex = messages.length > 0
        ? messages.map((m, i) => ({ role: m.role, index: i }))
            .filter(m => m.role === 'assistant')
            .pop()?.index
        : undefined;

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
                        className="flex items-center gap-1"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">新しい会話</span>
                    </Button>
                </div>
            </div>

            {/* Demo Mode Warning */}
            {!isConfigured && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    <span>デモモードで動作中 - 左上の⚙️設定からAPIキーを設定すると、本物のAIが応答します。</span>
                </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                <div className="py-4 space-y-4">
                    {messages.length === 0 ? (
                        <EmptyState />
                    ) : (
                        messages.map((message, index) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isLastAiMessage={index === lastAiMessageIndex}
                                isLoading={isLoading}
                                onRegenerate={onRegenerateResponse}
                                onEdit={onEditMessage}
                            />
                        ))
                    )}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 bg-primary/10">
                                <AvatarFallback>
                                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                {onStopGeneration && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onStopGeneration}
                                        className="ml-2 h-7 text-xs"
                                    >
                                        <Square className="h-3 w-3 mr-1" />
                                        停止
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="px-4 py-4 border-t border-border">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="思ったことを話してみて..."
                        disabled={isLoading}
                        rows={1}
                        className={cn(
                            "flex-grow resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
                            "focus:outline-none focus:ring-2 focus:ring-ring",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            "min-h-[40px] max-h-[150px]"
                        )}
                    />
                    <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
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

interface MessageBubbleProps {
    message: Message;
    isLastAiMessage?: boolean;
    isLoading?: boolean;
    onRegenerate?: () => void;
    onEdit?: (messageId: string, newContent: string) => void;
}

function MessageBubble({ message, isLastAiMessage, isLoading, onRegenerate, onEdit }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing]);

    const handleSaveEdit = () => {
        if (editContent.trim() && onEdit) {
            onEdit(message.id, editContent.trim());
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setEditContent(message.content);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    return (
        <div className={cn(
            "group flex items-start gap-3",
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

            <div className="flex flex-col gap-1 max-w-[80%]">
                <div className={cn(
                    "rounded-2xl px-4 py-3 text-sm",
                    isUser
                        ? "bg-slate-700 text-slate-100"
                        : "bg-muted"
                )}>
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                ref={textareaRef}
                                value={editContent}
                                onChange={(e) => {
                                    setEditContent(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-slate-600 text-slate-100 rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 text-xs">
                                    <X className="h-3 w-3 mr-1" />
                                    キャンセル
                                </Button>
                                <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs">
                                    <Check className="h-3 w-3 mr-1" />
                                    保存して再送信
                                </Button>
                            </div>
                        </div>
                    ) : isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                    {!isEditing && (
                        <span className={cn(
                            "text-xs mt-1 block",
                            isUser ? "text-slate-400" : "text-muted-foreground"
                        )}>
                            {message.timestamp.toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    )}
                </div>

                {/* Action buttons - show on hover */}
                {!isEditing && !isLoading && (
                    <div className={cn(
                        "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        isUser ? "justify-end" : "justify-start"
                    )}>
                        {isUser && onEdit && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="h-3 w-3 mr-1" />
                                編集
                            </Button>
                        )}
                        {!isUser && isLastAiMessage && onRegenerate && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={onRegenerate}
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                再生成
                            </Button>
                        )}
                    </div>
                )}
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
