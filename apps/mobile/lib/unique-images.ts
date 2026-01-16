/**
 * Generate unique Unsplash images
 * Uses random parameters to ensure each image is different
 */

const BUSINESS_IMAGES = [
  'photo-1441986300917-64674bd600d8', // Store front
  'photo-1542838132-92c53300491e', // Grocery store
  'photo-1556742049-0cfed4f6a45d', // Restaurant
  'photo-1556228578-0d85b1a4d571', // Cafe
  'photo-1565299624946-b28f40a0ae38', // Food
  'photo-1555396273-367ea4eb4db5', // Restaurant interior
  'photo-1517248135467-4c7edcad34c4', // Restaurant dining
];

const OFFER_IMAGES = [
  'photo-1607082348824-0a96f2a4b9da', // Special offer
  'photo-1607082349566-187342175e2f', // Sale banner
  'photo-1563986768609-322da13575f3', // Shopping sale
  'photo-1573855619003-97b4799dcd8b', // Sale tags
  'photo-1607083206968-13611e3d76db', // Discount
  'photo-1607083206869-4c7d4dadd9a8', // Promotion
];

const PRODUCT_IMAGES = [
  'photo-1523275335684-37898b6baf30', // Watch
  'photo-1505740420928-5e560c06d30e', // Headphones
  'photo-1546868871-7041f2a55e12', // Watch 2
  'photo-1572635196237-14b3f281503f', // Sunglasses
  'photo-1511499767150-a48a237f0083', // Glasses
  'photo-1560393464-5c69a73c5770', // Product
  'photo-1526170375885-4d8ecf77b99f', // Camera
  'photo-1542291026-7eec264c27ff', // Shoes
  'photo-1549298916-b41d501d3772', // Sneakers
];

let businessImageIndex = 0;
let offerImageIndex = 0;
let productImageIndex = 0;

/**
 * Get a unique business image
 */
export function getUniqueBusinessImage(): string {
  const imageId = BUSINESS_IMAGES[businessImageIndex % BUSINESS_IMAGES.length];
  businessImageIndex++;
  return `https://images.unsplash.com/${imageId}?w=800&auto=format`;
}

/**
 * Get a unique offer/ad image
 */
export function getUniqueOfferImage(): string {
  const imageId = OFFER_IMAGES[offerImageIndex % OFFER_IMAGES.length];
  offerImageIndex++;
  return `https://images.unsplash.com/${imageId}?w=800&auto=format`;
}

/**
 * Get a unique product image
 */
export function getUniqueProductImage(): string {
  const imageId = PRODUCT_IMAGES[productImageIndex % PRODUCT_IMAGES.length];
  productImageIndex++;
  return `https://images.unsplash.com/${imageId}?w=400&auto=format`;
}

/**
 * Reset counters (useful for testing)
 */
export function resetImageCounters(): void {
  businessImageIndex = 0;
  offerImageIndex = 0;
  productImageIndex = 0;
}
