import BookSSRPage, {
  generateMetadata,
  generateStaticParams,
  revalidate,
} from '../../book/[slug]/page';

export { generateMetadata, generateStaticParams, revalidate };
export default BookSSRPage;
