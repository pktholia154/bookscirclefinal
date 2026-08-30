export interface Review {
  id: string;
  user: string;
  avatar?: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  seoslug?: string;
  seo_description: string;
  full_description: string;
  seoDescription?: string;
  fullDescription?: string;
  category: string;
  categorySlug?: string;
  tags: string[];
  isActive: boolean;
  buy_price: number;
  list_price: number;
  pdf_file: string;
  pdfUrl?: string;
  pdf_url?: string;
  pdfStoragePath?: string;
  hasFullPdf?: boolean;
  cover: string;
  imageUrl?: string;
  sample_file: string;
  sampleUrl?: string;
  rating?: number;
  rating_count?: number;
  author?: string;
  publisher?: string;
  publication?: string;
  published_date?: string;
  isbn?: string;
  pages?: number;
  language?: string;
  type?: string;
  file_size?: string;
  is_bestseller?: boolean;
  badge?: string;
  topics?: string[];
  reviews?: Review[];
}

export interface Category {
  id: string;
  title: string;
  seolsug: string;
  seo_description?: string;
  description?: string;
  slug?: string;
}

export interface CartItem {
  book: Book;
  quantity: number;
}
