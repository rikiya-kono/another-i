'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HelpDialogProps {
    trigger?: React.ReactNode;
}

export function HelpDialog({ trigger }: HelpDialogProps) {
    const [open, setOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [hasSeenGuide, setHasSeenGuide] = useState(true); // Default true to prevent flash

    // Check if user has seen the guide before
    useEffect(() => {
        const seen = localStorage.getItem('hasSeenWelcomeGuide');
        if (seen !== 'true') {
            setOpen(true);
            setHasSeenGuide(false);
        } else {
            setHasSeenGuide(true);
        }
    }, []);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('hasSeenWelcomeGuide', 'true');
            setHasSeenGuide(true);
        }
        setOpen(false);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            handleClose();
        } else {
            setOpen(true);
        }
    };

    return (
        <>
            {/* Trigger button */}
            {trigger ? (
                <div onClick={() => setOpen(true)}>{trigger}</div>
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setOpen(true)}
                    title="ヘルプ"
                >
                    <HelpCircle className="h-4 w-4" />
                </Button>
            )}

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5" />
                            Another I - 使い方ガイド
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh]">
                        <div className="px-6 py-4 space-y-6 text-sm">
                            {/* Quick Start */}
                            <section>
                                <h3 className="text-lg font-semibold mb-3">🚀 はじめに</h3>
                                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                    <li>左上の <strong>歯車アイコン</strong> をクリックしてAI設定を開く</li>
                                    <li>プロバイダーを選択（OpenAI / Claude / Gemini）</li>
                                    <li>APIキーを入力して「検証」→「保存」</li>
                                    <li>チャット欄でAIと対話開始！</li>
                                </ol>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    💡 APIキーはブラウザ内にのみ保存され、外部には送信されません
                                </p>
                            </section>

                            {/* Core Features */}
                            <section>
                                <h3 className="text-lg font-semibold mb-3">🎯 基本機能</h3>
                                <div className="grid gap-3">
                                    <div className="p-3 rounded-lg bg-muted/50">
                                        <div className="font-medium">💬 AIチャット</div>
                                        <div className="text-muted-foreground text-xs mt-1">
                                            中央のチャット欄でAIと対話。会話は自動保存されます。
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/50">
                                        <div className="font-medium">📝 思考ログ</div>
                                        <div className="text-muted-foreground text-xs mt-1">
                                            右側のエディタに対話のサマリーが自動生成。編集も可能。
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/50">
                                        <div className="font-medium">📁 フォルダ整理</div>
                                        <div className="text-muted-foreground text-xs mt-1">
                                            左パネルで会話をフォルダ分け。ピン留めで重要な会話を上部に固定。
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Shortcuts */}
                            <section>
                                <h3 className="text-lg font-semibold mb-3">⌨️ ショートカット</h3>
                                <div className="flex gap-4 text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">⌘/Ctrl + K</kbd>
                                        <span>検索</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">Shift + Enter</kbd>
                                        <span>送信</span>
                                    </div>
                                </div>
                            </section>

                            {/* Import/Export */}
                            <section>
                                <h3 className="text-lg font-semibold mb-3">📤 インポート / エクスポート</h3>
                                <p className="text-muted-foreground">
                                    ChatGPTからエクスポートした <code className="px-1 py-0.5 bg-muted rounded text-xs">conversations.json</code> をインポート可能。
                                    データはMarkdown/JSON形式でエクスポートできます。
                                </p>
                            </section>

                            {/* Concept */}
                            <section className="border-t pt-4">
                                <p className="text-center text-muted-foreground italic">
                                    「もう一人の自分」との対話を通じて、<br />
                                    言葉にならない思いを言語化し、新しい自分を発見するためのツール。
                                </p>
                            </section>
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="dont-show-welcome"
                                checked={dontShowAgain}
                                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                            />
                            <Label htmlFor="dont-show-welcome" className="text-sm text-muted-foreground cursor-pointer">
                                次回から表示しない
                            </Label>
                        </div>
                        <Button onClick={handleClose}>
                            はじめる
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
