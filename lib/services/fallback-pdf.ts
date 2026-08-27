/**
 * Generates a clean, valid multi-page PDF document buffer
 * for sample previews when a remote asset is loading or missing in storage.
 */
export function generateSamplePdfBuffer(title: string = 'Sample Exam Guide'): Uint8Array {
  const cleanTitle = title.replace(/[()\\]/g, '');
  const timestamp = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const pdfContent = `%PDF-1.4
%âãÏÓ
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj

2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R 4 0 R 5 0 R]
  /Count 3
>>
endobj

3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Resources <<
    /Font <<
      /F1 6 0 R
      /F2 7 0 R
    >>
  >>
  /Contents 8 0 R
>>
endobj

4 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Resources <<
    /Font <<
      /F1 6 0 R
      /F2 7 0 R
    >>
  >>
  /Contents 9 0 R
>>
endobj

5 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Resources <<
    /Font <<
      /F1 6 0 R
      /F2 7 0 R
    >>
  >>
  /Contents 10 0 R
>>
endobj

6 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica-Bold
>>
endobj

7 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj

8 0 obj
<<
  /Length 550
>>
stream
BT
/F1 22 Tf
50 780 Td
(${cleanTitle}) Tj
/F2 11 Tf
0 -26 Td
(Official Sample Preview - Exam Preparation Series) Tj
/F2 10 Tf
0 -18 Td
(Date: ${timestamp} | BooksCircle Digital Library) Tj
0 -40 Td
/F1 14 Tf
(CHAPTER 1: FOUNDATIONAL CONCEPTS & CORE SYLLABUS) Tj
/F2 11 Tf
0 -24 Td
(1. Introduction and Overview) Tj
0 -16 Td
(This chapter covers key principles, high-yield patterns, and standard question types.) Tj
0 -16 Td
(Carefully study the formulas and short-tricks outlined below before attempting practice sets.) Tj
0 -30 Td
/F1 12 Tf
(Key Highlights for Competitive Exams:) Tj
/F2 10 Tf
0 -18 Td
(- Section A: Comprehensive Theory & Conceptual Explanations) Tj
0 -15 Td
(- Section B: Previous Years Solved Papers with Step-by-Step Breakdown) Tj
0 -15 Td
(- Section C: Practice MCQs with Answer Keys and Hints) Tj
0 -15 Td
(- Section D: Speed-building shortcuts for rapid problem solving) Tj
ET
endstream
endobj

9 0 obj
<<
  /Length 580
>>
stream
BT
/F1 16 Tf
50 780 Td
(CHAPTER 1: PRACTICE QUESTIONS & SOLVED EXAMPLES) Tj
/F2 10 Tf
0 -30 Td
/F1 11 Tf
(Question 1:) Tj
/F2 10 Tf
0 -15 Td
(Analyze the statement and determine the correct logical inference from the given options.) Tj
0 -15 Td
([A] Statement I alone is sufficient    [B] Statement II alone is sufficient) Tj
0 -15 Td
([C] Both statements together are required  [D] Neither statement is sufficient) Tj
0 -25 Td
/F1 10 Tf
(Detailed Solution & Strategy:) Tj
/F2 10 Tf
0 -15 Td
(Option [C] is correct. By combining both parameters, the equation yields a unique root.) Tj
0 -30 Td
/F1 11 Tf
(Question 2:) Tj
/F2 10 Tf
0 -15 Td
(Calculate the percentage increase when the initial value expands from 240 to 360.) Tj
0 -15 Td
(Formula: ((Final - Initial) / Initial) * 100% = ((360 - 240) / 240) * 100 = 50% increase.) Tj
ET
endstream
endobj

10 0 obj
<<
  /Length 500
>>
stream
BT
/F1 16 Tf
50 780 Td
(END OF FREE SAMPLE PREVIEW) Tj
/F2 11 Tf
0 -26 Td
(You have completed the free sample preview of this title.) Tj
0 -20 Td
(To access the full syllabus eBook with all chapters, 1000+ MCQs, and offline study:) Tj
0 -30 Td
/F1 13 Tf
(Purchase the Complete Digital Edition) Tj
/F2 10 Tf
0 -20 Td
(- Complete coverage of all syllabus topics) Tj
0 -15 Td
(- Solved mock test papers with detailed explanations) Tj
0 -15 Td
(- High-resolution printable diagrams and formula sheets) Tj
0 -15 Td
(- Lifetime access and offline download support) Tj
ET
endstream
endobj

xref
0 11
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000140 00000 n 
0000000288 00000 n 
0000000436 00000 n 
0000000584 00000 n 
0000000657 00000 n 
0000000725 00000 n 
0000001328 00000 n 
0000001961 00000 n 
trailer
<<
  /Size 11
  /Root 1 0 R
>>
startxref
2514
%%EOF`;

  return new TextEncoder().encode(pdfContent);
}
