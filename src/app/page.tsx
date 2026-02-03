'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Explorer } from '@/components/Explorer';
import { EditorPanel } from '@/components/EditorPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ImportDialog } from '@/components/ImportDialog';
import { ExportDialog } from '@/components/ExportDialog';
import { SearchDialog } from '@/components/SearchDialog';
import { useAISettings } from '@/hooks/useAISettings';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle
} from '@/components/ui/resizable';

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

interface Folder {
    id: string;
    name: string;
    conversations: Conversation[];
    isExpanded: boolean;
}

const STORAGE_KEY = 'another-i-conversations';
const LAYOUT_KEY = 'another-i-layout';

type LayoutMode = 'editor-first' | 'chat-first';

export default function Home() {
    // AI Settings
    const {
        settings: aiSettings,
        availableModels,
        isLoading: isLoadingModels,
        isInitialized,
        saveSettings,
        clearSettings,
        setProvider,
        DEFAULT_MODELS
    } = useAISettings();

    // Layout state
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('chat-first');

    // Conversation state
    const [folders, setFolders] = useState<Folder[]>([
        {
            id: 'folder-1',
            name: '会話',
            conversations: [],
            isExpanded: true
        }
    ]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const isLoadedRef = useRef(false);

    // Load data from localStorage
    useEffect(() => {
        if (isLoadedRef.current) return;
        isLoadedRef.current = true;

        // Load layout preference
        const savedLayout = localStorage.getItem(LAYOUT_KEY);
        if (savedLayout === 'chat-first' || savedLayout === 'editor-first') {
            setLayoutMode(savedLayout);
        }

        // Load conversations
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const restored: Folder[] = parsed.map((folder: Folder) => ({
                    ...folder,
                    conversations: folder.conversations.map((conv: Conversation) => ({
                        ...conv,
                        tags: conv.tags || [],
                        isPinned: conv.isPinned || false,
                        createdAt: new Date(conv.createdAt),
                        updatedAt: new Date(conv.updatedAt),
                        messages: conv.messages.map((msg: Message) => ({
                            ...msg,
                            timestamp: new Date(msg.timestamp)
                        }))
                    }))
                }));
                setFolders(restored);

                const allConvs = restored.flatMap(f => f.conversations);
                if (allConvs.length > 0) {
                    const sorted = allConvs.sort((a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    );
                    setActiveConversationId(sorted[0].id);
                }
            } catch (e) {
                console.error('Failed to parse stored conversations:', e);
            }
        }
    }, []);

    // Save conversations to localStorage (debounced)
    useEffect(() => {
        if (!isInitialized || !isLoadedRef.current) return;

        const timeoutId = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [folders, isInitialized]);

    // Save layout preference
    const handleLayoutChange = useCallback((mode: LayoutMode) => {
        setLayoutMode(mode);
        localStorage.setItem(LAYOUT_KEY, mode);
    }, []);

    // Get active conversation
    const activeConversation = folders
        .flatMap(f => f.conversations)
        .find(c => c.id === activeConversationId);

    // Handle conversation selection
    const handleConversationSelect = useCallback((convId: string) => {
        setActiveConversationId(convId);
    }, []);

    // Handle new conversation creation
    const handleNewConversation = useCallback(() => {
        const newId = `conv-${Date.now()}`;
        const newConv: Conversation = {
            id: newId,
            title: '新しい会話',
            messages: [],
            documentContent: '',
            tags: [],
            isPinned: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        setFolders(prev => {
            const updated = [...prev];
            const exists = updated[0].conversations.some(c => c.id === newId);
            if (exists) return prev;

            updated[0].conversations = [newConv, ...updated[0].conversations];
            return updated;
        });

        setActiveConversationId(newId);
    }, []);

    // Folder management
    const handleFolderCreate = useCallback(() => {
        const newFolder: Folder = {
            id: `folder-${Date.now()}`,
            name: '新しいフォルダ',
            conversations: [],
            isExpanded: true
        };
        setFolders(prev => [...prev, newFolder]);
    }, []);

    const handleFolderRename = useCallback((folderId: string, newName: string) => {
        setFolders(prev => prev.map(f =>
            f.id === folderId ? { ...f, name: newName } : f
        ));
    }, []);

    const handleFolderDelete = useCallback((folderId: string) => {
        setFolders(prev => {
            // Don't delete if it's the last folder
            if (prev.length <= 1) return prev;

            const folderToDelete = prev.find(f => f.id === folderId);
            // Check if active conversation is in this folder
            if (folderToDelete?.conversations.some(c => c.id === activeConversationId)) {
                setActiveConversationId(null);
            }

            return prev.filter(f => f.id !== folderId);
        });
    }, [activeConversationId]);

    const handleConversationDelete = useCallback((convId: string) => {
        if (convId === activeConversationId) {
            setActiveConversationId(null);
        }
        setFolders(prev => prev.map(folder => ({
            ...folder,
            conversations: folder.conversations.filter(c => c.id !== convId)
        })));
    }, [activeConversationId]);

    const handleConversationMove = useCallback((convId: string, targetFolderId: string) => {
        setFolders(prev => {
            let conversation: Conversation | null = null;

            // Find and remove from current folder
            const updated = prev.map(folder => {
                const conv = folder.conversations.find(c => c.id === convId);
                if (conv) {
                    conversation = conv;
                    return {
                        ...folder,
                        conversations: folder.conversations.filter(c => c.id !== convId)
                    };
                }
                return folder;
            });

            // Add to target folder
            if (conversation) {
                return updated.map(folder =>
                    folder.id === targetFolderId
                        ? { ...folder, conversations: [conversation!, ...folder.conversations] }
                        : folder
                );
            }

            return updated;
        });
    }, []);

    // Import conversations from ChatGPT export
    const handleImport = useCallback((conversations: Conversation[], targetFolderId: string) => {
        setFolders(prev => prev.map(folder => {
            if (folder.id !== targetFolderId) return folder;
            return {
                ...folder,
                conversations: [...conversations, ...folder.conversations]
            };
        }));

        // Select the first imported conversation
        if (conversations.length > 0) {
            setActiveConversationId(conversations[0].id);
        }
    }, []);

    // Toggle pin status
    const handleTogglePin = useCallback((convId: string) => {
        setFolders(prev => prev.map(folder => ({
            ...folder,
            conversations: folder.conversations.map(conv =>
                conv.id === convId ? { ...conv, isPinned: !conv.isPinned } : conv
            )
        })));
    }, []);

    // Get all available tags across all conversations
    const allTags = folders.flatMap(f => f.conversations.flatMap(c => c.tags || []))
        .filter((tag, index, self) => tag && self.findIndex(t => t?.id === tag.id) === index);

    // Create a new tag
    const handleCreateTag = useCallback((name: string, color: string): ConversationTag => {
        return {
            id: `tag-${Date.now()}`,
            name,
            color
        };
    }, []);

    // Add tag to conversation
    const handleAddTag = useCallback((convId: string, tag: ConversationTag) => {
        setFolders(prev => prev.map(folder => ({
            ...folder,
            conversations: folder.conversations.map(conv => {
                if (conv.id !== convId) return conv;
                if (conv.tags.some(t => t.id === tag.id)) return conv;
                return { ...conv, tags: [...conv.tags, tag] };
            })
        })));
    }, []);

    // Remove tag from conversation
    const handleRemoveTag = useCallback((convId: string, tagId: string) => {
        setFolders(prev => prev.map(folder => ({
            ...folder,
            conversations: folder.conversations.map(conv =>
                conv.id === convId
                    ? { ...conv, tags: conv.tags.filter(t => t.id !== tagId) }
                    : conv
            )
        })));
    }, []);

    // Generate structured note from messages
    const generateStructuredNote = useCallback((msgs: Message[]): string => {
        if (msgs.length === 0) return '';

        const timestamp = new Date().toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let note = `# 思考ログ\n\n`;
        note += `📅 ${timestamp}\n\n`;
        note += `---\n\n`;

        const userMessages = msgs.filter(m => m.role === 'user');
        const aiMessages = msgs.filter(m => m.role === 'assistant');

        note += `## 対話の記録\n\n`;

        msgs.forEach((msg, index) => {
            if (msg.role === 'user') {
                note += `### 💭 私の考え ${Math.floor(index / 2) + 1}\n\n`;
                note += `${msg.content}\n\n`;
            } else {
                note += `> 🤖 **Another I**: ${msg.content}\n\n`;
            }
        });

        if (userMessages.length > 0) {
            note += `---\n\n`;
            note += `## サマリー\n\n`;
            note += `- 📝 ${userMessages.length}件のトピックについて対話しました\n`;
            note += `- 💡 ${aiMessages.length}件のフィードバックを受けました\n\n`;

            note += `### キーポイント\n\n`;
            userMessages.slice(0, 3).forEach((msg, i) => {
                const preview = msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : '');
                note += `${i + 1}. ${preview}\n`;
            });
        }

        return note;
    }, []);

    // Handle sending a message
    const handleSendMessage = useCallback(async (content: string) => {
        let currentConvId = activeConversationId;

        if (!currentConvId) {
            const newId = `conv-${Date.now()}`;
            const newConv: Conversation = {
                id: newId,
                title: content.length > 30 ? content.slice(0, 30) + '...' : content,
                messages: [],
                documentContent: '',
                tags: [],
                isPinned: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            setFolders(prev => {
                const updated = [...prev];
                // Check if conversation with same ID already exists
                const exists = updated[0].conversations.some(c => c.id === newId);
                if (exists) return prev;

                updated[0].conversations = [newConv, ...updated[0].conversations];
                return updated;
            });

            currentConvId = newId;
            setActiveConversationId(newId);
        }

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content,
            timestamp: new Date()
        };

        const convIdToUpdate = currentConvId;
        setFolders(prev => prev.map(folder => ({
            ...folder,
            conversations: folder.conversations.map(conv => {
                if (conv.id !== convIdToUpdate) return conv;
                const updatedMessages = [...conv.messages, userMessage];
                const newTitle = conv.title === '新しい会話' && content
                    ? (content.length > 30 ? content.slice(0, 30) + '...' : content)
                    : conv.title;
                return {
                    ...conv,
                    messages: updatedMessages,
                    title: newTitle,
                    updatedAt: new Date()
                };
            })
        })));

        setIsLoading(true);

        try {
            const currentConv = folders.flatMap(f => f.conversations).find(c => c.id === convIdToUpdate);
            const allMessages = [...(currentConv?.messages || []), userMessage];

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: allMessages.map(m => ({ role: m.role, content: m.content })),
                    settings: aiSettings
                })
            });

            const data = await response.json();

            const aiMessage: Message = {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: data.message,
                timestamp: new Date()
            };

            const finalMessages = [...(currentConv?.messages || []), userMessage, aiMessage];

            // Update messages first
            setFolders(prev => prev.map(folder => ({
                ...folder,
                conversations: folder.conversations.map(conv => {
                    if (conv.id !== convIdToUpdate) return conv;
                    return {
                        ...conv,
                        messages: finalMessages,
                        updatedAt: new Date()
                    };
                })
            })));

            // Generate summary asynchronously
            try {
                const summaryResponse = await fetch('/api/summarize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: finalMessages.map(m => ({ role: m.role, content: m.content })),
                        settings: aiSettings
                    })
                });

                const summaryData = await summaryResponse.json();

                // Update document content with summary
                setFolders(prev => prev.map(folder => ({
                    ...folder,
                    conversations: folder.conversations.map(conv => {
                        if (conv.id !== convIdToUpdate) return conv;
                        return {
                            ...conv,
                            documentContent: summaryData.summary,
                            updatedAt: new Date()
                        };
                    })
                })));
            } catch (summaryError) {
                console.error('Failed to generate summary:', summaryError);
                // Keep messages updated even if summary fails
            }

            // Generate AI title in background for new conversations
            if ((currentConv?.messages || []).length === 0 && aiSettings) {
                (async () => {
                    try {
                        const titleResponse = await fetch('/api/title', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                message: content,
                                model: aiSettings.model,
                                apiKey: aiSettings.apiKey,
                                provider: aiSettings.provider
                            })
                        });

                        if (titleResponse.ok) {
                            const { title } = await titleResponse.json();
                            if (title) {
                                setFolders(prev => prev.map(folder => ({
                                    ...folder,
                                    conversations: folder.conversations.map(conv => {
                                        if (conv.id !== convIdToUpdate) return conv;
                                        return { ...conv, title };
                                    })
                                })));
                            }
                        }
                    } catch (error) {
                        console.error('Failed to generate title:', error);
                    }
                })();
            }

        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = {
                id: `msg-${Date.now()}-error`,
                role: 'assistant',
                content: 'すみません、接続に問題が発生しました。もう一度お試しください。',
                timestamp: new Date()
            };

            setFolders(prev => prev.map(folder => ({
                ...folder,
                conversations: folder.conversations.map(conv =>
                    conv.id === convIdToUpdate
                        ? { ...conv, messages: [...conv.messages, errorMessage] }
                        : conv
                )
            })));
        }

        setIsLoading(false);
    }, [activeConversationId, folders, aiSettings]);

    // Handle content change in editor
    const handleContentChange = useCallback((content: string) => {
        if (!activeConversationId) return;

        setFolders(prev => prev.map(folder => ({
            ...folder,
            conversations: folder.conversations.map(conv =>
                conv.id === activeConversationId
                    ? { ...conv, documentContent: content, updatedAt: new Date() }
                    : conv
            )
        })));
    }, [activeConversationId]);

    // Convert folders to explorer format
    const explorerFolders = folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        documents: folder.conversations.map(conv => ({
            id: conv.id,
            title: conv.title || '新しい会話',
            isPinned: conv.isPinned,
            tags: conv.tags
        })),
        isExpanded: folder.isExpanded
    }));

    // Render panels based on layout mode
    const editorPanel = (
        <EditorPanel
            title={activeConversation?.title || '会話を選択'}
            content={activeConversation?.documentContent || ''}
            onContentChange={handleContentChange}
            isEditing={isEditing}
            onToggleEdit={() => setIsEditing(!isEditing)}
        />
    );

    const chatPanel = (
        <ChatPanel
            messages={activeConversation?.messages || []}
            onSendMessage={handleSendMessage}
            onNewConversation={handleNewConversation}
            isLoading={isLoading}
            isConfigured={!!aiSettings?.apiKey}
            providerName={aiSettings?.provider}
        />
    );

    return (
        <main className="h-screen w-screen overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Left: Explorer */}
                <ResizablePanel defaultSize={15} minSize={12} maxSize={25}>
                    <Explorer
                        folders={explorerFolders}
                        activeDocumentId={activeConversationId}
                        onDocumentSelect={handleConversationSelect}
                        onFolderCreate={handleFolderCreate}
                        onFolderRename={handleFolderRename}
                        onFolderDelete={handleFolderDelete}
                        onConversationDelete={handleConversationDelete}
                        onConversationMove={handleConversationMove}
                        onTogglePin={handleTogglePin}
                        settingsSlot={
                            <SettingsDialog
                                settings={aiSettings}
                                availableModels={availableModels}
                                isLoading={isLoadingModels}
                                onSave={saveSettings}
                                onClear={clearSettings}
                                onProviderChange={setProvider}
                                defaultModels={DEFAULT_MODELS}
                                layoutMode={layoutMode}
                                onLayoutChange={handleLayoutChange}
                            />
                        }
                        importSlot={
                            <ImportDialog
                                onImport={handleImport}
                                folders={folders.map(f => ({ id: f.id, name: f.name }))}
                            />
                        }
                        exportSlot={
                            <ExportDialog
                                folders={folders}
                                activeConversation={activeConversation}
                            />
                        }
                        searchSlot={
                            <SearchDialog
                                folders={folders}
                                onSelect={handleConversationSelect}
                            />
                        }
                    />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Center & Right: depends on layout mode */}
                {layoutMode === 'editor-first' ? (
                    <>
                        <ResizablePanel defaultSize={50} minSize={30}>
                            {editorPanel}
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                            {chatPanel}
                        </ResizablePanel>
                    </>
                ) : (
                    <>
                        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                            {chatPanel}
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={50} minSize={30}>
                            {editorPanel}
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </main>
    );
}
