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
  seo_description: string;
  full_description: string;
  category: string;
  tags: string[];
  isActive: boolean;
  buy_price: number;
  list_price: number;
  pdf_file: string;
  cover: string;
  sample_file: string;
  rating?: number;
  rating_count?: number;
  author?: string;
  publisher?: string;
  published_date?: string;
  isbn?: string;
  pages?: number;
  language?: string;
  file_size?: string;
  topics?: string[];
  reviews?: Review[];
}

export interface Category {
  id: string;
  title: string;
  seolsug: string;
  seo_description?: string;
}

export interface CartItem {
  book: Book;
  quantity: number;
}
