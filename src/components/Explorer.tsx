'use client';

import { useState, useEffect } from 'react';
import {
    ChevronRight,
    ChevronDown,
    FolderClosed,
    FolderOpen,
    Brain,
    MessageSquare,
    MoreHorizontal,
    Pencil,
    Trash2,
    FolderPlus,
    Pin,
    PinOff,
    Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { HelpDialog } from '@/components/HelpDialog';

interface ConversationTag {
    id: string;
    name: string;
    color: string;
}

interface Document {
    id: string;
    title: string;
    isPinned?: boolean;
    tags?: ConversationTag[];
}

interface Folder {
    id: string;
    name: string;
    documents: Document[];
    isExpanded: boolean;
}

interface ExplorerProps {
    folders: Folder[];
    activeDocumentId: string | null;
    onDocumentSelect: (docId: string) => void;
    onFolderCreate: () => void;
    onFolderRename: (folderId: string, newName: string) => void;
    onFolderDelete: (folderId: string) => void;
    onConversationDelete: (convId: string) => void;
    onConversationMove: (convId: string, targetFolderId: string) => void;
    onTogglePin?: (convId: string) => void;
    settingsSlot?: React.ReactNode;
    importSlot?: React.ReactNode;
    exportSlot?: React.ReactNode;
    searchSlot?: React.ReactNode;
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
    gray: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
    red: { bg: 'bg-red-500/20', text: 'text-red-500' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-500' },
    green: { bg: 'bg-green-500/20', text: 'text-green-500' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-500' },
    pink: { bg: 'bg-pink-500/20', text: 'text-pink-500' },
};

export function Explorer({
    folders,
    activeDocumentId,
    onDocumentSelect,
    onFolderCreate,
    onFolderRename,
    onFolderDelete,
    onConversationDelete,
    onConversationMove,
    onTogglePin,
    settingsSlot,
    importSlot,
    exportSlot,
    searchSlot
}: ExplorerProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
        new Set(folders.map(f => f.id))
    );
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'folder' | 'conversation'; id: string; name: string } | null>(null);
    const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(false);
    const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);

    // Load skip confirmation preference from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('skipDeleteConfirmation');
        if (saved === 'true') {
            setSkipDeleteConfirmation(true);
        }
    }, []);

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const startEditing = (folder: Folder) => {
        setEditingFolderId(folder.id);
        setEditingName(folder.name);
    };

    const finishEditing = () => {
        if (editingFolderId && editingName.trim()) {
            onFolderRename(editingFolderId, editingName.trim());
        }
        setEditingFolderId(null);
        setEditingName('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            finishEditing();
        } else if (e.key === 'Escape') {
            setEditingFolderId(null);
            setEditingName('');
        }
    };

    const confirmDelete = (type: 'folder' | 'conversation', id: string, name: string) => {
        // If skip confirmation is enabled, delete directly
        if (skipDeleteConfirmation) {
            if (type === 'folder') {
                onFolderDelete(id);
            } else {
                onConversationDelete(id);
            }
            return;
        }
        setItemToDelete({ type, id, name });
        setDeleteDialogOpen(true);
    };

    const handleDelete = () => {
        if (itemToDelete) {
            if (itemToDelete.type === 'folder') {
                onFolderDelete(itemToDelete.id);
            } else {
                onConversationDelete(itemToDelete.id);
            }
        }
        // Save preference if checkbox was checked
        if (dontShowAgainChecked) {
            localStorage.setItem('skipDeleteConfirmation', 'true');
            setSkipDeleteConfirmation(true);
        }
        setDeleteDialogOpen(false);
        setItemToDelete(null);
        setDontShowAgainChecked(false);
    };

    // Function to reset skip confirmation (can be called from settings)
    const resetDeleteConfirmation = () => {
        localStorage.removeItem('skipDeleteConfirmation');
        setSkipDeleteConfirmation(false);
    };

    const totalConversations = folders.reduce((sum, f) => sum + f.documents.length, 0);

    // Sort documents: pinned first, then by original order. Also deduplicate by ID.
    const getSortedDocs = (docs: Document[]) => {
        // Deduplicate by ID (keep first occurrence)
        const seen = new Set<string>();
        const uniqueDocs = docs.filter(doc => {
            if (seen.has(doc.id)) return false;
            seen.add(doc.id);
            return true;
        });

        return [...uniqueDocs].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });
    };

    return (
        <div className="h-full flex flex-col bg-sidebar border-r border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm">Another I</span>
                </div>
                <div className="flex items-center gap-1">
                    <HelpDialog />
                    {settingsSlot}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onFolderCreate}
                        title="新しいフォルダ"
                    >
                        <FolderPlus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Explorer Content */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {/* Search */}
                    {searchSlot && (
                        <div className="mb-2">
                            {searchSlot}
                        </div>
                    )}

                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-2 flex items-center justify-between">
                        <span>会話履歴</span>
                        {totalConversations > 0 && (
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{totalConversations}</span>
                        )}
                    </div>

                    {folders.map((folder) => (
                        <div key={folder.id} className="mb-1">
                            {/* Folder Header */}
                            <div className="relative group">
                                <button
                                    onClick={() => toggleFolder(folder.id)}
                                    className="flex items-center gap-1 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors overflow-hidden"
                                >
                                    {expandedFolders.has(folder.id) ? (
                                        <>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                                        </>
                                    ) : (
                                        <>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <FolderClosed className="h-4 w-4 text-amber-500 shrink-0" />
                                        </>
                                    )}
                                    {editingFolderId === folder.id ? (
                                        <Input
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onBlur={finishEditing}
                                            onKeyDown={handleKeyDown}
                                            className="h-6 text-sm px-1 ml-1 flex-1"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="ml-1 truncate flex-1 pr-6">{folder.name}</span>
                                    )}
                                </button>

                                {/* Folder Actions - fixed to container right edge */}
                                <div className="absolute right-0 top-0 bottom-0 flex items-center pr-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="w-6 h-full bg-gradient-to-l from-background via-background to-transparent" />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 shrink-0 bg-background hover:bg-accent pointer-events-auto"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={() => startEditing(folder)}>
                                                <Pencil className="h-3 w-3 mr-2" />
                                                名前を変更
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => confirmDelete('folder', folder.id, folder.name)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-3 w-3 mr-2" />
                                                削除
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Documents */}
                            {expandedFolders.has(folder.id) && (
                                <div className="ml-4 mt-1 space-y-0.5">
                                    {folder.documents.length === 0 ? (
                                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                                            会話がありません
                                        </div>
                                    ) : (
                                        getSortedDocs(folder.documents).map((doc) => (
                                            <div
                                                key={doc.id}
                                                className={cn(
                                                    "group relative flex items-center w-full pr-8 px-2 py-1 rounded-md transition-colors",
                                                    activeDocumentId === doc.id
                                                        ? "bg-accent text-accent-foreground"
                                                        : "hover:bg-accent/50"
                                                )}
                                            >
                                                {/* Main Clickable Area - Takes remaining width */}
                                                <button
                                                    onClick={() => onDocumentSelect(doc.id)}
                                                    className="flex-1 flex items-center gap-2 min-w-0 text-left overflow-hidden h-full py-0.5"
                                                    title={doc.title}
                                                >
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {doc.isPinned ? (
                                                            <Pin className="h-3.5 w-3.5 text-amber-500" />
                                                        ) : (
                                                            <MessageSquare className="h-4 w-4 text-muted-foreground/70" />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="truncate text-sm pr-1">
                                                            {doc.title}
                                                        </div>

                                                        {doc.tags && doc.tags.length > 0 && (
                                                            <div className="flex gap-0.5 mt-0.5">
                                                                {doc.tags.slice(0, 2).map(tag => {
                                                                    const colors = TAG_COLORS[tag.color] || TAG_COLORS.blue;
                                                                    return (
                                                                        <span
                                                                            key={tag.id}
                                                                            className={cn(
                                                                                "inline-flex items-center gap-0.5 px-1 rounded text-[9px]",
                                                                                colors.bg,
                                                                                colors.text
                                                                            )}
                                                                        >
                                                                            <Hash className="h-2 w-2" />
                                                                            {tag.name}
                                                                        </span>
                                                                    );
                                                                })}
                                                                {doc.tags.length > 2 && (
                                                                    <span className="text-[9px] text-muted-foreground">
                                                                        +{doc.tags.length - 2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>


                                                {/* Menu Button - Absolutely positioned at right edge */}
                                                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    "h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
                                                                    // Keep visible if menu is open or on mobile
                                                                    "data-[state=open]:opacity-100"
                                                                )}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            {onTogglePin && (
                                                                <DropdownMenuItem onClick={() => onTogglePin(doc.id)}>
                                                                    {doc.isPinned ? (
                                                                        <>
                                                                            <PinOff className="h-3 w-3 mr-2" />
                                                                            ピン留め解除
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Pin className="h-3 w-3 mr-2" />
                                                                            ピン留め
                                                                        </>
                                                                    )}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {folders.length > 1 && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                                        移動先
                                                                    </div>
                                                                    {folders
                                                                        .filter(f => f.id !== folder.id)
                                                                        .map(targetFolder => (
                                                                            <DropdownMenuItem
                                                                                key={targetFolder.id}
                                                                                onClick={() => onConversationMove(doc.id, targetFolder.id)}
                                                                            >
                                                                                <FolderClosed className="h-3 w-3 mr-2 text-amber-500" />
                                                                                {targetFolder.name}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                </>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => confirmDelete('conversation', doc.id, doc.title)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="h-3 w-3 mr-2" />
                                                                削除
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-border space-y-2">
                <div className="flex flex-col gap-2 [&_button]:w-full">
                    {importSlot}
                    {exportSlot}
                </div>
                <div className="text-xs text-muted-foreground text-center">
                    もう一人の私と対話しよう
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {itemToDelete?.type === 'folder' ? 'フォルダを削除' : '会話を削除'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            「{itemToDelete?.name}」を削除してもよろしいですか？
                            {itemToDelete?.type === 'folder' && 'フォルダ内のすべての会話も削除されます。'}
                            この操作は取り消せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center space-x-2 py-2">
                        <Checkbox
                            id="dont-show-again"
                            checked={dontShowAgainChecked}
                            onCheckedChange={(checked) => setDontShowAgainChecked(checked === true)}
                        />
                        <Label htmlFor="dont-show-again" className="text-sm text-muted-foreground cursor-pointer">
                            次回から確認しない
                        </Label>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            削除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
