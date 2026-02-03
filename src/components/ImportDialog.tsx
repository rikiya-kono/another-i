'use client';

import { useState, useRef } from 'react';
import { Upload, FileJson, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ConversationTag {
    id: string;
    name: string;
    color: string;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    documentContent: string;
    tags: ConversationTag[];
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
}

interface ImportDialogProps {
    onImport: (conversations: Conversation[], targetFolderId: string) => void;
    folders: { id: string; name: string }[];
}

// ChatGPT export format types
interface ChatGPTMessage {
    id: string;
    author: {
        role: string;
    };
    content: {
        parts: string[];
    };
    create_time: number;
}

interface ChatGPTConversation {
    id: string;
    title: string;
    create_time: number;
    update_time: number;
    mapping: Record<string, {
        id: string;
        message?: ChatGPTMessage;
        parent?: string;
        children: string[];
    }>;
}

function parseChatGPTExport(data: ChatGPTConversation[]): Conversation[] {
    const conversations: Conversation[] = [];

    for (const conv of data) {
        try {
            const messages: Message[] = [];

            // Extract messages from the mapping
            const messageNodes = Object.values(conv.mapping)
                .filter(node => node.message?.content?.parts?.length)
                .sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0));

            for (const node of messageNodes) {
                const msg = node.message;
                if (!msg) continue;

                const role = msg.author.role;
                if (role !== 'user' && role !== 'assistant') continue;

                const content = msg.content.parts.join('\n').trim();
                if (!content) continue;

                messages.push({
                    id: msg.id,
                    role: role as 'user' | 'assistant',
                    content,
                    timestamp: new Date(msg.create_time * 1000)
                });
            }

            if (messages.length > 0) {
                conversations.push({
                    id: `imported-${conv.id}`,
                    title: conv.title || '無題の会話',
                    messages,
                    documentContent: generateDocumentContent(messages, conv.title),
                    tags: [],
                    isPinned: false,
                    createdAt: new Date(conv.create_time * 1000),
                    updatedAt: new Date(conv.update_time * 1000)
                });
            }
        } catch (e) {
            console.error('Failed to parse conversation:', conv.id, e);
        }
    }

    return conversations;
}

function generateDocumentContent(messages: Message[], title: string): string {
    let note = `# ${title}\n\n`;
    note += `📅 インポート日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
    note += `---\n\n`;

    const userMessages = messages.filter(m => m.role === 'user');
    const aiMessages = messages.filter(m => m.role === 'assistant');

    note += `## 対話の記録\n\n`;

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            note += `### 💭 ユーザー\n\n`;
            note += `${msg.content}\n\n`;
        } else {
            note += `> 🤖 **ChatGPT**: ${msg.content.slice(0, 500)}${msg.content.length > 500 ? '...' : ''}\n\n`;
        }
    });

    note += `---\n\n`;
    note += `## サマリー\n\n`;
    note += `- 📝 ${userMessages.length}件のメッセージ\n`;
    note += `- 💡 ${aiMessages.length}件の応答\n`;

    return note;
}

export function ImportDialog({ onImport, folders }: ImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [parsedConversations, setParsedConversations] = useState<Conversation[]>([]);
    const [selectedFolder, setSelectedFolder] = useState(folders[0]?.id || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setIsProcessing(false);
        setProgress(0);
        setResult(null);
        setParsedConversations([]);
    };

    const handleFileSelect = async (file: File) => {
        if (!file.name.endsWith('.json')) {
            setResult({
                success: false,
                imported: 0,
                skipped: 0,
                errors: ['JSONファイルを選択してください']
            });
            return;
        }

        setIsProcessing(true);
        setProgress(10);

        try {
            const text = await file.text();
            setProgress(30);

            const data = JSON.parse(text);
            setProgress(50);

            // Check if it's ChatGPT format
            if (!Array.isArray(data)) {
                throw new Error('ChatGPTのエクスポート形式ではありません');
            }

            const conversations = parseChatGPTExport(data);
            setProgress(90);

            setParsedConversations(conversations);
            setResult({
                success: true,
                imported: conversations.length,
                skipped: data.length - conversations.length,
                errors: []
            });
            setProgress(100);

        } catch (e) {
            setResult({
                success: false,
                imported: 0,
                skipped: 0,
                errors: [e instanceof Error ? e.message : 'ファイルの解析に失敗しました']
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleImportConfirm = () => {
        if (parsedConversations.length > 0) {
            onImport(parsedConversations, selectedFolder);
            setOpen(false);
            resetState();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    <Upload className="h-4 w-4" />
                    インポート
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileJson className="h-5 w-5" />
                        ChatGPTからインポート
                    </DialogTitle>
                    <DialogDescription>
                        ChatGPTの設定 → データコントロール → データをエクスポート から取得した
                        <code className="mx-1 px-1 bg-muted rounded">conversations.json</code>
                        をアップロードしてください
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {!result ? (
                        <>
                            {/* Drop Zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}
                `}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                />

                                {isProcessing ? (
                                    <div className="space-y-4">
                                        <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                                        <p className="text-sm text-muted-foreground">処理中...</p>
                                        <Progress value={progress} className="w-full" />
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-sm font-medium">ここにファイルをドロップ</p>
                                        <p className="text-xs text-muted-foreground mt-1">または、クリックして選択</p>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Result */}
                            <div className={`rounded-lg p-4 mb-4 ${result.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                <div className="flex items-start gap-3">
                                    {result.success ? (
                                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                                    )}
                                    <div>
                                        {result.success ? (
                                            <>
                                                <p className="font-medium text-green-600">
                                                    {result.imported}件の会話が見つかりました
                                                </p>
                                                {result.skipped > 0 && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {result.skipped}件はスキップされました
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-medium text-red-600">インポートに失敗しました</p>
                                                {result.errors.map((err, i) => (
                                                    <p key={i} className="text-sm text-muted-foreground">{err}</p>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            {result.success && parsedConversations.length > 0 && (
                                <>
                                    <div className="mb-3">
                                        <label className="text-sm font-medium">インポート先フォルダ</label>
                                        <select
                                            value={selectedFolder}
                                            onChange={(e) => setSelectedFolder(e.target.value)}
                                            className="w-full mt-1 p-2 rounded-md border bg-background"
                                        >
                                            {folders.map(f => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="text-sm font-medium mb-2">プレビュー</div>
                                    <ScrollArea className="h-[200px] border rounded-md">
                                        <div className="p-2 space-y-1">
                                            {parsedConversations.slice(0, 50).map((conv) => (
                                                <div key={conv.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted">
                                                    <FileJson className="h-4 w-4 text-blue-400 shrink-0" />
                                                    <span className="truncate text-sm">{conv.title}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                        {conv.messages.length}件
                                                    </span>
                                                </div>
                                            ))}
                                            {parsedConversations.length > 50 && (
                                                <div className="text-center text-xs text-muted-foreground py-2">
                                                    他 {parsedConversations.length - 50}件...
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                    {result?.success ? (
                        <>
                            <Button variant="outline" onClick={resetState}>
                                別のファイル
                            </Button>
                            <Button onClick={handleImportConfirm}>
                                インポート実行
                            </Button>
                        </>
                    ) : result ? (
                        <Button variant="outline" onClick={resetState}>
                            やり直す
                        </Button>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
