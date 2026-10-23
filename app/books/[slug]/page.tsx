import BookSSRPage, {
  generateMetadata,
} from '../../book/[slug]/page';

export const revalidate = 60;
export const dynamicParams = true;
export { generateMetadata };
export default BookSSRPage;
