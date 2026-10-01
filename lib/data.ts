import { Book, Category } from './types';

export const DEFAULT_BOOK_COVER = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'banking-exams',
    title: 'Banking Exams',
    seolsug: 'banking-exams',
    seoCat: '',
    seo_description: '',
  },
  {
    id: 'cuet-pg',
    title: 'CUET PG',
    seolsug: 'cuet-pg',
    seoCat: 'Crack the NTA CUET PG 2026 exam with our ultimate collection of study resources. Aligned with the latest syllabus and exam pattern, we offer comprehensive CUET PG books, complete guides, and high-yield notes. Enhance your preparation using downloadable PDFs, authentic previous papers, and realistic practice papers. Track your progress with advanced practice tests. Access the best study material to secure admission to top central universities!',
    seo_description: 'Crack the NTA CUET PG 2026 exam with our ultimate collection of study resources. Aligned with the latest syllabus and exam pattern, we offer comprehensive CUET PG books, complete guides, and high-yield notes. Enhance your preparation using downloadable PDFs, authentic previous papers, and realistic practice papers. Track your progress with advanced practice tests. Access the best study material to secure admission to top central universities!',
  },
  {
    id: 'defense',
    title: 'Defense Exams',
    seolsug: 'defense',
    seoCat: '',
    seo_description: '',
  },
  {
    id: 'insurance',
    title: 'Insurance Exams',
    seolsug: 'insurance',
    seoCat: '',
    seo_description: '',
  },
  {
    id: 'new',
    title: 'New',
    seolsug: 'new',
    seoCat: '',
    seo_description: '',
  },
  {
    id: 'railways',
    title: 'Railways RRB',
    seolsug: 'railways',
    seoCat: '',
    seo_description: '',
  },
  {
    id: 'ssc',
    title: 'SSC Exams',
    seolsug: 'ssc',
    seoCat: '',
    seo_description: '',
  },
  {
    id: 'state-psc',
    title: 'State PSC',
    seolsug: 'state-psc',
    seoCat: '',
    seo_description: '',
  },
  {
    id: 'teaching',
    title: 'Teaching & CTET',
    seolsug: 'teaching',
    seoCat: '',
    seo_description: '',
  },
  {
    id: 'ugc-net',
    title: 'UGC NET',
    seolsug: 'ugc-net',
    seoCat: '',
    seo_description: '',
  },
  {
    id: 'upsc',
    title: 'UPSC Civil Services',
    seolsug: 'upsc',
    seoCat: '',
    seo_description: '',
  },
];

export const INITIAL_BOOKS: Book[] = [];

export interface FAQItem {
  question: string;
  answer: string;
}

export const BOOK_FAQS: FAQItem[] = [
  {
    question: 'How will I receive my study material after online purchase?',
    answer:
      'Successful payment auto-redirects to your app’s Purchased Tab for instant PDF eBook downloads, enabling permanent offline study access.',
  },
  {
    question: 'Which file formats are available for these eBooks?',
    answer:
      'Get print-ready PDF eBooks and mobile-friendly ePubs with responsive layouts for offline reading across smartphones, tablets, and e-readers.',
  },
  {
    question: 'Are these eBooks aligned with current exam notifications/exam patterns?',
    answer:
      'Yes. All competitive exam eBooks, syllabus notes, and practice question sets reflect the latest official recruitment notifications and exam patterns.',
  },
  {
    question: 'Are study materials available in Hindi and English?',
    answer:
      'Yes. We offer English medium, Hindi medium, and bilingual CBT exam notes, solved question banks, and competitive test modules. Other language as per subject need.',
  },
  {
    question: 'Do the Previous Year Question (PYQ) banks include solutions?',
    answer:
      'Yes. Solved PYQ question banks feature official answer keys, step-by-step detailed explanations, and high-scoring shortcut tricks for speed.',
  },
  {
    question: 'What is the download validity and access limit?',
    answer:
      'Enjoy lifetime validity and unlimited offline access. Download PDF or ePub files directly to your device without expiry limits.',
  },
];
