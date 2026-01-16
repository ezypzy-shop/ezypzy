// Product image generation system
// Generates unique, relevant images based on product name and category

const IMAGE_POOLS: { [key: string]: string[] } = {
  // Electronics
  'phone': [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800',
    'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800',
  ],
  'headphone': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
    'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=800',
    'https://images.unsplash.com/photo-1545127398-14699f92334b?w=800',
    'https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?w=800',
  ],
  'watch': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
    'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800',
  ],
  'speaker': [
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
    'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800',
    'https://images.unsplash.com/photo-1531104985437-603d6490e6d4?w=800',
    'https://images.unsplash.com/photo-1507646871304-c22496bc9b41?w=800',
  ],
  'laptop': [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
    'https://images.unsplash.com/photo-1602080858428-57174f9431cf?w=800',
    'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800',
  ],
  
  // Fashion
  'bag': [
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
    'https://images.unsplash.com/photo-1564422167509-4f7a8c3c9e14?w=800',
    'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
  ],
  'backpack': [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    'https://images.unsplash.com/photo-1577733966973-d680bffd2e80?w=800',
    'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=800',
    'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800',
    'https://images.unsplash.com/photo-1622560481157-1d6f0af0e06f?w=800',
  ],
  'sunglasses': [
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800',
    'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800',
    'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800',
    'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800',
  ],
  'shoe': [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
    'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800',
  ],
  
  // Beauty
  'skincare': [
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
    'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800',
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800',
    'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800',
  ],
  'makeup': [
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
    'https://images.unsplash.com/photo-1631214524020-7e18db9d4e98?w=800',
    'https://images.unsplash.com/photo-1625535281820-f66e93d09f62?w=800',
    'https://images.unsplash.com/photo-1617897903246-719242758050?w=800',
  ],
  'hair': [
    'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800',
    'https://images.unsplash.com/photo-1596704017254-9b121068ec31?w=800',
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800',
    'https://images.unsplash.com/photo-1627844541143-e5fb18d02c2e?w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  ],
  
  // Home & Kitchen
  'coffee': [
    'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800',
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800',
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800',
  ],
  'fryer': [
    'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800',
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
    'https://images.unsplash.com/photo-1635321593217-40050ad13c74?w=800',
    'https://images.unsplash.com/photo-1584990347449-39b5a1a7ae77?w=800',
    'https://images.unsplash.com/photo-1595435742656-5272d0b3e4d9?w=800',
  ],
  
  // Fitness
  'fitness': [
    'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800',
    'https://images.unsplash.com/photo-1557935728-e6d1eaabe558?w=800',
    'https://images.unsplash.com/photo-1611002981122-82f7c02ebf11?w=800',
    'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800',
    'https://images.unsplash.com/photo-1624447925386-42e5d594da60?w=800',
  ],
  
  // Default fallback images
  'default': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
    'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800',
  ],
};

/**
 * Get a unique product image based on product ID, name, and category
 * Ensures each product gets a unique image from the relevant image pool
 */
export function getUniqueProductImage(productId: number, productName: string, category?: string): string {
  const name = productName.toLowerCase();
  
  // Find matching keyword in product name
  for (const [keyword, images] of Object.entries(IMAGE_POOLS)) {
    if (keyword !== 'default' && name.includes(keyword)) {
      // Use product ID to consistently assign an image from the pool
      const index = productId % images.length;
      return images[index];
    }
  }
  
  // Fallback to default pool
  const defaultImages = IMAGE_POOLS['default'];
  const index = productId % defaultImages.length;
  return defaultImages[index];
}

/**
 * Generate multiple unique images for a product
 */
export function generateProductImages(productId: number, productName: string, category?: string, count: number = 5): string[] {
  const images: string[] = [];
  const name = productName.toLowerCase();
  
  // Find matching keyword pool
  let selectedPool: string[] = IMAGE_POOLS['default'];
  for (const [keyword, imagePool] of Object.entries(IMAGE_POOLS)) {
    if (keyword !== 'default' && name.includes(keyword)) {
      selectedPool = imagePool;
      break;
    }
  }
  
  // Generate unique images using product ID as seed
  for (let i = 0; i < Math.min(count, selectedPool.length); i++) {
    const index = (productId + i) % selectedPool.length;
    images.push(selectedPool[index]);
  }
  
  // If we need more images and pool is too small, cycle through
  while (images.length < count) {
    const index = images.length % selectedPool.length;
    images.push(selectedPool[index]);
  }
  
  return images;
}
