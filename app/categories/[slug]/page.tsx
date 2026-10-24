import CategoryPage, { generateMetadata } from '../../category/[slug]/page';

export const revalidate = 300;
export { generateMetadata };
export default CategoryPage;
