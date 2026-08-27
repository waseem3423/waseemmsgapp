
"use client";

import { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { Loader2, Search, TrendingUp, Smile, Frown, ThumbsUp } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface GifPickerProps {
    onSelect: (gifUrl: string) => void;
}

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

const categories = [
    { name: 'Trending', icon: TrendingUp },
    { name: 'Reactions', icon: Smile },
    { name: 'Sad', icon: Frown },
    { name: 'Thumbs Up', icon: ThumbsUp },
];

export default function GifPicker({ onSelect }: GifPickerProps) {
    const [gifs, setGifs] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Trending');
    const [loading, setLoading] = useState(true);
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
        const fetchGifs = async () => {
            setLoading(true);
            let endpoint = '';
            
            if (query) {
                // Prioritize search query
                endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${query}&limit=24&rating=g`;
            } else if (activeCategory === 'Trending') {
                endpoint = `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=24&rating=g`;
            } else {
                // Use category as a search term
                endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${activeCategory}&limit=24&rating=g`;
            }

            try {
                const res = await fetch(endpoint);
                const json = await res.json();
                setGifs(json.data);
            } catch (error) {
                console.error("Failed to fetch GIFs", error);
            } finally {
                setLoading(false);
            }
        };

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            fetchGifs();
        }, 300); // Debounce API calls

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };

    }, [query, activeCategory]);

    const handleCategoryClick = (categoryName: string) => {
        setQuery(''); // Clear search query when a category is clicked
        setActiveCategory(categoryName);
    };

    if (!API_KEY) {
        return (
            <div className="h-[450px] w-[352px] flex flex-col items-center justify-center text-center p-4">
                <p className="text-destructive font-semibold">GIPHY API Key Missing</p>
                <p className="text-sm text-muted-foreground">Please add your GIPHY API key to the .env file to enable GIFs.</p>
            </div>
        );
    }

    return (
        <div className="h-[450px] w-[352px] flex flex-col bg-popover text-popover-foreground">
            <div className="p-2 border-b">
                 <div className="flex items-center justify-around pb-2">
                    {categories.map((category) => (
                        <Button 
                            key={category.name}
                            variant="ghost"
                            size="icon"
                            className={cn("rounded-full h-9 w-9", activeCategory === category.name && !query ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                            onClick={() => handleCategoryClick(category.name)}
                        >
                            <category.icon className="h-5 w-5" />
                        </Button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search for GIFs" 
                        className="pl-10 h-9"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            // If user starts typing, no category is 'active'
                            if(e.target.value) setActiveCategory('');
                            else setActiveCategory('Trending');
                        }}
                    />
                </div>
            </div>
            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1 p-1">
                        {gifs.map((gif) => (
                            <div 
                                key={gif.id}
                                className="aspect-square relative cursor-pointer"
                                onClick={() => onSelect(gif.images.downsized.url)}
                            >
                                <Image
                                    src={gif.images.fixed_width.url}
                                    alt={gif.title}
                                    layout="fill"
                                    className="object-cover"
                                    unoptimized // GIPHY GIFs can be animated
                                />
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
