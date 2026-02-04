'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditorPanelProps {
    title: string;
    content: string;
    onContentChange?: (content: string) => void;
    isEditing?: boolean;
    onToggleEdit?: () => void;
}

export function EditorPanel({
    title,
    content,
    onContentChange,
    isEditing = false,
    onToggleEdit
}: EditorPanelProps) {
    return (
        <div className="h-full flex flex-col bg-background">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {onToggleEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleEdit}
                            className="h-7 text-xs"
                        >
                            {isEditing ? (
                                <>
                                    <Save className="h-3 w-3 mr-1" />
                                    保存
                                </>
                            ) : (
                                '編集'
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-8 max-w-3xl mx-auto w-full h-full">
                    {isEditing ? (
                        <textarea
                            value={content}
                            onChange={(e) => onContentChange?.(e.target.value)}
                            className="w-full h-full min-h-[500px] bg-transparent resize-none outline-none font-mono text-sm leading-relaxed"
                            placeholder="ここに思考を書き出そう..."
                        />
                    ) : (
                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none break-words">
                            {content ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {content}
                                </ReactMarkdown>
                            ) : (
                                <WelcomeMessage />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function WelcomeMessage() {
    return (
        <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <span className="text-3xl">🧠</span>
            </div>
            <h1 className="text-2xl font-bold mb-3">Welcome to Another I</h1>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
                隣のチャットで対話を始めると、<br />
                あなたの思考がここに整理されていきます。
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>💬 「今日あったことを話したい」</p>
                <p>🤔 「仕事の優先順位で悩んでる」</p>
                <p>📝 「アイデアを整理したい」</p>
            </div>
        </div>
    );
}
