'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, MessageSquare, FileText, X } from 'lucide-react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';

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

interface SearchResult {
    type: 'conversation' | 'message';
    conversationId: string;
    conversationTitle: string;
    folderName: string;
    content: string;
    highlight: string;
    messageIndex?: number;
}

interface SearchDialogProps {
    folders: Folder[];
    onSelect: (conversationId: string) => void;
}

export function SearchDialog({ folders, onSelect }: SearchDialogProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    // Keyboard shortcut: Cmd/Ctrl + K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    // Search logic
    const results = useMemo(() => {
        if (!query.trim()) return [];

        const searchResults: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        for (const folder of folders) {
            for (const conv of folder.conversations) {
                // Search in conversation title
                if (conv.title.toLowerCase().includes(lowerQuery)) {
                    searchResults.push({
                        type: 'conversation',
                        conversationId: conv.id,
                        conversationTitle: conv.title,
                        folderName: folder.name,
                        content: conv.title,
                        highlight: highlightMatch(conv.title, query),
                    });
                }

                // Search in messages
                conv.messages.forEach((msg, index) => {
                    if (msg.content.toLowerCase().includes(lowerQuery)) {
                        const excerpt = getExcerpt(msg.content, query, 60);
                        searchResults.push({
                            type: 'message',
                            conversationId: conv.id,
                            conversationTitle: conv.title,
                            folderName: folder.name,
                            content: msg.content,
                            highlight: excerpt,
                            messageIndex: index,
                        });
                    }
                });
            }
        }

        return searchResults.slice(0, 20); // Limit results
    }, [query, folders]);

    const handleSelect = (result: SearchResult) => {
        onSelect(result.conversationId);
        setOpen(false);
        setQuery('');
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="gap-2 w-full justify-start text-muted-foreground"
            >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">検索...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="会話やメッセージを検索..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>
                        <div className="flex flex-col items-center py-6 text-muted-foreground">
                            <Search className="h-10 w-10 mb-3 opacity-50" />
                            <p>結果が見つかりませんでした</p>
                            <p className="text-xs mt-1">別のキーワードで試してください</p>
                        </div>
                    </CommandEmpty>

                    {results.length > 0 && (
                        <CommandGroup heading={`${results.length}件の結果`}>
                            {results.map((result, index) => (
                                <CommandItem
                                    key={`${result.conversationId}-${result.messageIndex ?? 'title'}-${index}`}
                                    onSelect={() => handleSelect(result)}
                                    className="flex items-start gap-3 py-3"
                                >
                                    {result.type === 'conversation' ? (
                                        <FileText className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                                    ) : (
                                        <MessageSquare className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{result.conversationTitle}</span>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {result.folderName}
                                            </span>
                                        </div>
                                        <p
                                            className="text-sm text-muted-foreground truncate mt-0.5"
                                            dangerouslySetInnerHTML={{ __html: result.highlight }}
                                        />
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}

function highlightMatch(text: string, query: string): string {
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded">$1</mark>');
}

function getExcerpt(text: string, query: string, contextLength: number): string {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text.slice(0, contextLength * 2) + '...';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + query.length + contextLength);

    let excerpt = text.slice(start, end);
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt += '...';

    return highlightMatch(excerpt, query);
}

function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
