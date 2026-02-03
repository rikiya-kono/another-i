'use client';

import { useState } from 'react';
import { Download, FileJson, FileText, CheckCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    documentContent: string;
    createdAt: Date;
    updatedAt: Date;
}

interface Folder {
    id: string;
    name: string;
    conversations: Conversation[];
}

interface ExportDialogProps {
    folders: Folder[];
    activeConversation?: Conversation | null;
}

type ExportFormat = 'json' | 'markdown';
type ExportScope = 'current' | 'all';

export function ExportDialog({ folders, activeConversation }: ExportDialogProps) {
    const [open, setOpen] = useState(false);
    const [format, setFormat] = useState<ExportFormat>('markdown');
    const [scope, setScope] = useState<ExportScope>('current');
    const [exported, setExported] = useState(false);

    const handleExport = () => {
        let content: string;
        let filename: string;

        if (scope === 'current' && activeConversation) {
            if (format === 'json') {
                content = JSON.stringify(activeConversation, null, 2);
                filename = `${activeConversation.title.replace(/[^\w\s]/g, '')}_${Date.now()}.json`;
            } else {
                content = generateMarkdown(activeConversation);
                filename = `${activeConversation.title.replace(/[^\w\s]/g, '')}_${Date.now()}.md`;
            }
        } else {
            if (format === 'json') {
                content = JSON.stringify(folders, null, 2);
                filename = `another-i-export_${Date.now()}.json`;
            } else {
                content = folders.map(folder =>
                    `# ${folder.name}\n\n` +
                    folder.conversations.map(conv => generateMarkdown(conv)).join('\n\n---\n\n')
                ).join('\n\n---\n\n');
                filename = `another-i-export_${Date.now()}.md`;
            }
        }

        downloadFile(content, filename, format === 'json' ? 'application/json' : 'text/markdown');
        setExported(true);
        setTimeout(() => setExported(false), 2000);
    };

    const generateMarkdown = (conv: Conversation): string => {
        let md = `# ${conv.title}\n\n`;
        md += `📅 作成: ${new Date(conv.createdAt).toLocaleString('ja-JP')}\n`;
        md += `📅 更新: ${new Date(conv.updatedAt).toLocaleString('ja-JP')}\n\n`;
        md += `---\n\n`;

        conv.messages.forEach(msg => {
            if (msg.role === 'user') {
                md += `## 💭 ユーザー\n\n${msg.content}\n\n`;
            } else {
                md += `## 🤖 AI\n\n${msg.content}\n\n`;
            }
        });

        return md;
    };

    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const totalConversations = folders.reduce((sum, f) => sum + f.conversations.length, 0);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    エクスポート
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        データをエクスポート
                    </DialogTitle>
                    <DialogDescription>
                        会話データをファイルとしてダウンロードします
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Scope Selection */}
                    <div className="space-y-2">
                        <Label>エクスポート範囲</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setScope('current')}
                                disabled={!activeConversation}
                                className={`p-3 rounded-lg border-2 transition-colors text-left ${scope === 'current'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-muted-foreground'
                                    } ${!activeConversation ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="font-medium text-sm">現在の会話</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {activeConversation?.title || '会話が選択されていません'}
                                </div>
                            </button>
                            <button
                                onClick={() => setScope('all')}
                                className={`p-3 rounded-lg border-2 transition-colors text-left ${scope === 'all'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-muted-foreground'
                                    }`}
                            >
                                <div className="font-medium text-sm">すべて</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {totalConversations}件の会話
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div className="space-y-2">
                        <Label>ファイル形式</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setFormat('markdown')}
                                className={`p-3 rounded-lg border-2 transition-colors ${format === 'markdown'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-muted-foreground'
                                    }`}
                            >
                                <FileText className="h-6 w-6 mx-auto mb-2 text-blue-400" />
                                <div className="text-sm font-medium">Markdown</div>
                                <div className="text-xs text-muted-foreground">.md</div>
                            </button>
                            <button
                                onClick={() => setFormat('json')}
                                className={`p-3 rounded-lg border-2 transition-colors ${format === 'json'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-muted-foreground'
                                    }`}
                            >
                                <FileJson className="h-6 w-6 mx-auto mb-2 text-amber-400" />
                                <div className="text-sm font-medium">JSON</div>
                                <div className="text-xs text-muted-foreground">.json</div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={scope === 'current' && !activeConversation}
                        className="gap-2"
                    >
                        {exported ? (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                完了!
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                ダウンロード
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
