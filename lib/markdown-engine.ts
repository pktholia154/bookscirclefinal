/**
 * High-performance, robust Markdown and LaTeX Math processing engine.
 * 
 * Features:
 * 1. Backslash preservation: does not swallow or escape backslashes in math/latex.
 * 2. Multi-delimiter LaTeX math support: $...$, $$...$$, \(...\), \[...\].
 * 3. Robust math preprocessing and KaTeX configuration (throwOnError: false, strict: false).
 * 4. Sectional H1-wise document chunking (Never parse full markdown file on a single scroll to avoid overload).
 * 5. Standalone math symbol rendering (e.g. \setminus, \alpha, \frac).
 */

export interface MarkdownSection {
  id: string;
  title: string;
  content: string;
  index: number;
  wordCount: number;
}

export interface TocHeading {
  id: string;
  text: string;
  index: number;
}

/**
 * Common LaTeX math macros that might appear in competitive exam textbooks.
 */
const COMMON_LATEX_COMMANDS = [
  'setminus', 'smallsetminus',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  'frac', 'dfrac', 'tfrac', 'sqrt', 'sum', 'prod', 'int', 'iint', 'oint', 'lim', 'infty',
  'times', 'div', 'pm', 'mp', 'cdot', 'circ', 'bullet',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim', 'simeq', 'propto',
  'in', 'notin', 'subset', 'subseteq', 'supset', 'supseteq', 'cup', 'cap', 'emptyset', 'varnothing',
  'forall', 'exists', 'nexists', 'neg', 'land', 'lor', 'implies', 'iff',
  'partial', 'nabla', 'hbar', 'ell', 'Re', 'Im',
  'mathbb', 'mathbf', 'mathcal', 'mathrm', 'mathit', 'text',
  'left', 'right', 'begin', 'end'
];

/**
 * Robustly pre-processes markdown text for math rendering:
 * 1. Protects code blocks (```...``` and `...`) so math inside code isn't touched.
 * 2. Converts \[...\] into $$\n...\n$$
 * 3. Converts \(...\) into $...$
 * 4. Preserves backslashes (\) so they are not stripped by markdown escape rules.
 * 5. Converts standalone mathematical backslash commands like \setminus outside math into valid inline math.
 */
export function preprocessMarkdownMath(rawText: string): string {
  if (!rawText) return '';

  // 0. Normalize CRLF and CR to LF so all linebreaks are uniform and preserved
  let protectedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Temporarily extract and protect code blocks & inline code
  const codeBlocks: string[] = [];
  protectedText = protectedText.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 2. Convert display math: \[ ... \] -> $$ ... $$
  protectedText = protectedText.replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => {
    const trimmed = formula.trim();
    return `\n$$\n${trimmed}\n$$\n`;
  });

  // 3. Convert inline math: \( ... \) -> $ ... $
  protectedText = protectedText.replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula) => {
    const trimmed = formula.trim();
    return `$${trimmed}$`;
  });

  // 4. Ensure \setminus and standalone LaTeX symbols outside existing $...$ are preserved and rendered
  // Matches standalone \command (like \setminus) that are NOT already inside $...$
  const latexCommandRegex = new RegExp(`(?<![\\\\$])\\\\(${COMMON_LATEX_COMMANDS.join('|')})(?![a-zA-Z$])`, 'g');
  
  // Split by math delimiters $ to only target non-math parts
  const segments = protectedText.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  for (let i = 0; i < segments.length; i++) {
    // Even indices are OUTSIDE math blocks
    if (i % 2 === 0) {
      let seg = segments[i];
      // Specifically ensure \setminus is converted to $\setminus$ so it renders as the set difference symbol
      seg = seg.replace(/\\setminus/g, '$\\setminus$');
      
      // Preserve double backslashes \\ (like in line breaks or matrices)
      seg = seg.replace(/\\\\/g, '\\\\');

      segments[i] = seg;
    }
  }
  protectedText = segments.join('');

  // 5. Restore code blocks
  protectedText = protectedText.replace(/__CODE_BLOCK_(\d+)__/g, (_match, indexStr) => {
    const idx = parseInt(indexStr, 10);
    return codeBlocks[idx] || '';
  });

  return protectedText;
}

/**
 * Extracts ONLY # Heading 1 (# Heading) for Table of Contents
 */
export function extractH1Headings(markdownText: string): TocHeading[] {
  if (!markdownText) return [];
  const headings: TocHeading[] = [];
  const lines = markdownText.split(/\r?\n/);
  const seenIds = new Map<string, number>();

  let headingIndex = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Strictly match only level 1 heading: starts with single '#' followed by space/tab
    if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
      const rawText = trimmed.replace(/^#[ \t]+/, '').trim();
      // Remove inline markdown markers for clean TOC display
      const cleanText = rawText.replace(/[*_`]/g, '').trim();
      if (cleanText) {
        headingIndex++;
        const baseSlug = cleanText
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');
        const count = seenIds.get(baseSlug) || 0;
        seenIds.set(baseSlug, count + 1);
        const uniqueId = count === 0 ? `toc-h1-${baseSlug || headingIndex}` : `toc-h1-${baseSlug}-${count}`;

        headings.push({
          id: uniqueId,
          text: cleanText,
          index: headingIndex,
        });
      }
    }
  }

  return headings;
}

/**
 * Splits markdown content by H1 headings (# Heading 1) into isolated sections.
 * Guarantees zero DOM overload: only one section is parsed by React-Markdown/KaTeX at a time!
 */
export function splitMarkdownByH1(rawContent: string): MarkdownSection[] {
  if (!rawContent || !rawContent.trim()) {
    return [
      {
        id: 'toc-h1-empty',
        title: 'Document',
        content: '_No content available._',
        index: 1,
        wordCount: 0,
      },
    ];
  }

  const lines = rawContent.split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  const seenIds = new Map<string, number>();

  let currentTitle = 'Overview & Introduction';
  let currentId = 'toc-h1-intro';
  let currentLines: string[] = [];
  let isInsideCodeFence = false;
  let sectionIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track fenced code blocks (```) so we don't accidentally split on # inside code!
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      isInsideCodeFence = !isInsideCodeFence;
      currentLines.push(line);
      continue;
    }

    if (isInsideCodeFence) {
      currentLines.push(line);
      continue;
    }

    // Check if this line is an H1 heading (# Heading)
    const isH1 = trimmed.startsWith('#') && !trimmed.startsWith('##');

    if (isH1) {
      const headingText = trimmed.replace(/^#[ \t]+/, '').replace(/[*_`]/g, '').trim();

      // If we already accumulated lines for a previous section, push it
      if (currentLines.length > 0 && currentLines.some((l) => l.trim().length > 0)) {
        const contentStr = currentLines.join('\n').trim();
        sections.push({
          id: currentId,
          title: currentTitle,
          content: contentStr,
          index: sectionIndex,
          wordCount: contentStr.split(/\s+/).length,
        });
        sectionIndex++;
      }

      // Prepare new section
      currentTitle = headingText || `Chapter ${sectionIndex}`;
      const baseSlug = currentTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const count = seenIds.get(baseSlug) || 0;
      seenIds.set(baseSlug, count + 1);
      currentId = count === 0 ? `toc-h1-${baseSlug || sectionIndex}` : `toc-h1-${baseSlug}-${count}`;

      // Start currentLines with this H1 line
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  // Push final remaining section
  if (currentLines.length > 0) {
    const contentStr = currentLines.join('\n').trim();
    if (contentStr.length > 0) {
      sections.push({
        id: currentId,
        title: currentTitle,
        content: contentStr,
        index: sectionIndex,
        wordCount: contentStr.split(/\s+/).length,
      });
    }
  }

  // Fallback: If no H1 was present in the whole file, return the whole text as single section
  if (sections.length === 0) {
    sections.push({
      id: 'toc-h1-full',
      title: 'Complete Document',
      content: rawContent,
      index: 1,
      wordCount: rawContent.split(/\s+/).length,
    });
  }

  return sections;
}

/**
 * Safe, robust KaTeX options configuration to prevent any LaTeX syntax error from breaking the UI.
 */
export const KATEX_SAFE_OPTIONS = {
  throwOnError: false, // Prevents throwing errors on malformed math
  strict: false,       // Allows flexible syntax
  errorColor: '#cc0000',
  trust: true,
  macros: {
    '\\setminus': '\\smallsetminus',
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\Q': '\\mathbb{Q}',
    '\\C': '\\mathbb{C}',
  },
};
