/**
 * Canonical list of approved top-level categories for the store.
 * Subcategories, legacy test categories, and timestamped categories
 * are strictly disallowed across customer and admin panels.
 */
export const APPROVED_CATEGORIES = [
  'Grocery',
  'Electronics',
  'Fashion',
  'Home & Kitchen',
  'Beauty & Personal Care',
  'Books & Stationery',
];

/**
 * Checks whether a given category name is an approved catalog category.
 */
export const isApprovedCategory = (categoryName) => {
  return APPROVED_CATEGORIES.includes(categoryName);
};

/**
 * Filters and deterministically sorts categories to strictly include
 * only the 6 approved main categories with no subcategories.
 */
export const filterApprovedCategories = (categories = []) => {
  if (!Array.isArray(categories)) return [];
  return categories
    .filter((cat) => cat && APPROVED_CATEGORIES.includes(cat.name) && !cat.parentId)
    .sort((a, b) => APPROVED_CATEGORIES.indexOf(a.name) - APPROVED_CATEGORIES.indexOf(b.name));
};
