'use client';

import { useState } from 'react';
import { Tag, Plus, X, Check, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Predefined color palette
const TAG_COLORS = [
    { name: 'gray', bg: 'bg-gray-500/20', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/30' },
    { name: 'red', bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
    { name: 'orange', bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30' },
    { name: 'yellow', bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/30' },
    { name: 'green', bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/30' },
    { name: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
    { name: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
    { name: 'pink', bg: 'bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/30' },
];

export interface ConversationTag {
    id: string;
    name: string;
    color: string;
}

interface TagManagerProps {
    tags: ConversationTag[];
    availableTags: ConversationTag[];
    onAddTag: (tag: ConversationTag) => void;
    onRemoveTag: (tagId: string) => void;
    onCreateTag: (name: string, color: string) => ConversationTag;
}

export function TagManager({
    tags,
    availableTags,
    onAddTag,
    onRemoveTag,
    onCreateTag,
}: TagManagerProps) {
    const [open, setOpen] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [selectedColor, setSelectedColor] = useState('blue');
    const [isCreating, setIsCreating] = useState(false);

    const unassignedTags = availableTags.filter(
        (t) => !tags.some((assigned) => assigned.id === t.id)
    );

    const handleCreateTag = () => {
        if (!newTagName.trim()) return;
        const newTag = onCreateTag(newTagName.trim(), selectedColor);
        onAddTag(newTag);
        setNewTagName('');
        setIsCreating(false);
    };

    const getColorClasses = (colorName: string) => {
        return TAG_COLORS.find((c) => c.name === colorName) || TAG_COLORS[5];
    };

    return (
        <div className="flex flex-wrap items-center gap-1">
            {tags.map((tag) => {
                const colorClasses = getColorClasses(tag.color);
                return (
                    <Badge
                        key={tag.id}
                        variant="outline"
                        className={cn(
                            'gap-1 pl-1.5 pr-1 py-0 h-5 text-xs font-normal cursor-pointer group',
                            colorClasses.bg,
                            colorClasses.text,
                            colorClasses.border
                        )}
                    >
                        <Hash className="h-2.5 w-2.5" />
                        {tag.name}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveTag(tag.id);
                            }}
                            className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 opacity-60 hover:opacity-100"
                        >
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </Badge>
                );
            })}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                    {!isCreating ? (
                        <div className="space-y-2">
                            {unassignedTags.length > 0 && (
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground px-1">既存のタグ</div>
                                    {unassignedTags.map((tag) => {
                                        const colorClasses = getColorClasses(tag.color);
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => {
                                                    onAddTag(tag);
                                                    setOpen(false);
                                                }}
                                                className={cn(
                                                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-left',
                                                    colorClasses.text
                                                )}
                                            >
                                                <Hash className="h-3 w-3" />
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCreating(true)}
                                className="w-full justify-start gap-2 text-muted-foreground"
                            >
                                <Plus className="h-3 w-3" />
                                新しいタグを作成
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-xs text-muted-foreground">新しいタグ</div>
                            <Input
                                placeholder="タグ名"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateTag();
                                    if (e.key === 'Escape') setIsCreating(false);
                                }}
                                autoFocus
                                className="h-8"
                            />
                            <div className="flex flex-wrap gap-1">
                                {TAG_COLORS.map((color) => (
                                    <button
                                        key={color.name}
                                        onClick={() => setSelectedColor(color.name)}
                                        className={cn(
                                            'w-5 h-5 rounded-full border-2 transition-all',
                                            color.bg,
                                            selectedColor === color.name
                                                ? 'border-foreground scale-110'
                                                : 'border-transparent hover:scale-105'
                                        )}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCreateTag}
                                    disabled={!newTagName.trim()}
                                    className="flex-1"
                                >
                                    作成
                                </Button>
                            </div>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}

// Compact tag display for list items
export function TagBadges({ tags }: { tags: ConversationTag[] }) {
    if (tags.length === 0) return null;

    const getColorClasses = (colorName: string) => {
        return TAG_COLORS.find((c) => c.name === colorName) || TAG_COLORS[5];
    };

    return (
        <div className="flex flex-wrap gap-0.5">
            {tags.slice(0, 3).map((tag) => {
                const colorClasses = getColorClasses(tag.color);
                return (
                    <span
                        key={tag.id}
                        className={cn(
                            'inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] font-normal',
                            colorClasses.bg,
                            colorClasses.text
                        )}
                    >
                        <Hash className="h-2 w-2" />
                        {tag.name}
                    </span>
                );
            })}
            {tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                    +{tags.length - 3}
                </span>
            )}
        </div>
    );
}
