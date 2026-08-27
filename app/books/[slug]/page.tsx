import BookSSRPage, {
  generateMetadata,
  generateStaticParams,
} from '../../book/[slug]/page';

export const revalidate = 60;
export { generateMetadata, generateStaticParams };
export default BookSSRPage;
