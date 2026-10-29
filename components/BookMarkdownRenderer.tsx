'use client';

import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { MarkdownCodeBlock, MarkdownCodeElement } from '@/components/MarkdownCodeBlock';

interface BookMarkdownRendererProps {
  content: string;
}

export function BookMarkdownRenderer({ content }: BookMarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p className="mb-2 leading-relaxed text-gray-700 last:mb-0">{children}</p>,
          h1: ({ children }) => <h2 className="text-sm sm:text-base font-bold text-gray-950 mt-3 mb-1.5">{children}</h2>,
          h2: ({ children }) => <h2 className="text-xs sm:text-sm font-bold text-gray-950 mt-2.5 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold text-gray-900 mt-2 mb-1">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2 text-gray-700">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2 text-gray-700">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-gray-950">{children}</strong>,
          em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#4029AB] pl-3 italic text-gray-600 my-2">
              {children}
            </blockquote>
          ),
          pre: MarkdownCodeBlock,
          code: MarkdownCodeElement,
          a: ({ href, children }) => (
            <a href={href} className="text-[#4029AB] underline font-medium hover:text-[#34208e]">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
