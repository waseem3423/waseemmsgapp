"use client";

import React from 'react';

// Regex matching unicode emojis
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

export const getEmojiUnifiedHex = (emojiChar: string): string => {
  const codePoints: string[] = [];
  for (const char of emojiChar) {
    const code = char.codePointAt(0);
    if (code && code !== 0xfe0f && code !== 0xfe0e) {
      codePoints.push(code.toString(16));
    }
  }
  return codePoints.join('-');
};

interface AppleFormattedTextProps {
  text: string;
  className?: string;
  emojiSize?: 'sm' | 'md' | 'lg';
}

export default function AppleFormattedText({ text, className = "", emojiSize = 'md' }: AppleFormattedTextProps) {
  if (!text) return null;

  const matches = Array.from(text.matchAll(EMOJI_REGEX));
  if (matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  const sizeClasses = {
    sm: 'h-4 w-4 mx-0.5 inline-block align-text-bottom',
    md: 'h-5 w-5 mx-0.5 inline-block align-text-bottom',
    lg: 'h-10 w-10 mx-1 inline-block align-bottom',
  };

  matches.forEach((match, idx) => {
    const emojiStr = match[0];
    const matchIndex = match.index!;

    if (matchIndex > lastIndex) {
      elements.push(
        <span key={`text-${idx}`}>{text.substring(lastIndex, matchIndex)}</span>
      );
    }

    const hex = getEmojiUnifiedHex(emojiStr);
    const cdnUrl = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;

    elements.push(
      <img
        key={`emoji-${idx}`}
        src={cdnUrl}
        alt={emojiStr}
        className={sizeClasses[emojiSize]}
        loading="lazy"
        onError={(e) => {
          const span = document.createElement('span');
          span.textContent = emojiStr;
          (e.target as HTMLElement).replaceWith(span);
        }}
      />
    );

    lastIndex = matchIndex + emojiStr.length;
  });

  if (lastIndex < text.length) {
    elements.push(
      <span key={`text-end`}>{text.substring(lastIndex)}</span>
    );
  }

  return <span className={className}>{elements}</span>;
}
