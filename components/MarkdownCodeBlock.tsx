'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const PreContext = React.createContext<boolean>(false);

interface MarkdownCodeBlockProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export function MarkdownCodeBlock({ children, ...props }: MarkdownCodeBlockProps) {
  const [copied, setCopied] = useState<boolean>(false);

  // Extract raw text and language tag if available
  const codeElement = React.isValidElement(children) ? children : null;
  const rawClassName =
    (codeElement?.props as any)?.className || (props as any).className || '';
  const langMatch = /language-([a-zA-Z0-9_-]+)/.exec(rawClassName);
  const languageLabel = langMatch ? langMatch[1].toUpperCase() : 'CODE';

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let codeText = '';
      if (typeof children === 'string') {
        codeText = children;
      } else if (codeElement && (codeElement.props as any)?.children) {
        const c = (codeElement.props as any).children;
        codeText = Array.isArray(c) ? c.join('') : String(c ?? '');
      }
      if (codeText) {
        // Strip trailing newline if present for clean pasting
        navigator.clipboard.writeText(codeText.replace(/\n$/, ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Copy to clipboard failed:', err);
    }
  };

  // Strip `node` prop so it does not get passed to DOM element
  const { node, ...domProps } = props as any;

  return (
    <PreContext.Provider value={true}>
      <div className="my-5 rounded-xl border border-gray-200 bg-gray-50/90 overflow-hidden shadow-2xs not-prose">
        {/* Header Bar: Language Indicator & Copy Button */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-gray-100/90 border-b border-gray-200 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1c0ca3]/70" />
            <span className="text-[10px] font-mono font-bold tracking-wider text-gray-700">
              {languageLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-gray-600 hover:text-black hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
            title="Copy code"
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-gray-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content Container: clean light gray background with dark high-contrast text */}
        <pre
          className="p-4 overflow-x-auto text-[0.85em] font-mono leading-relaxed text-gray-900 bg-gray-50/90 focus:outline-none"
          style={{
            color: '#111827',
            backgroundColor: '#f9fafb',
            margin: 0,
            whiteSpace: 'pre',
          }}
          {...domProps}
        >
          {children}
        </pre>
      </div>
    </PreContext.Provider>
  );
}

export function MarkdownCodeElement({ children, className, ...props }: any) {
  const isInsidePre = React.useContext(PreContext);
  const { node, ...domProps } = props;

  // 1. When inside <pre>, render code cleanly without additional wrapping
  if (isInsidePre) {
    return (
      <code
        className={`font-mono text-[0.85em] text-gray-900 bg-transparent ${className || ''}`}
        style={{
          color: '#111827',
          backgroundColor: 'transparent',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}
        {...domProps}
      >
        {children}
      </code>
    );
  }

  // 2. Safety check: If multiline string or explicit language tag was passed without pre, wrap as block
  const isMultiLine = typeof children === 'string' && children.includes('\n');
  if (isMultiLine || (className && className.startsWith('language-'))) {
    return (
      <MarkdownCodeBlock {...props} className={className}>
        <code className={className}>{children}</code>
      </MarkdownCodeBlock>
    );
  }

  // 3. Inline code (`...`): Clean light grey background, dark text, subtle border
  return (
    <code
      className="markdown-inline-code bg-gray-100 text-gray-900 px-1.5 py-0.5 mx-0.5 rounded font-mono text-[0.875em] border border-gray-200/90 font-medium inline-block align-baseline"
      style={{
        backgroundColor: '#f3f4f6',
        color: '#111827',
        borderColor: '#e5e7eb',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }}
      {...domProps}
    >
      {children}
    </code>
  );
}
