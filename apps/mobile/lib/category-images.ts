// Category-based image mapping
export const getCategoryImage = (category: string): string => {
  const categoryImages: { [key: string]: string } = {
    'Clothing & Fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
    'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
    'Home & Garden': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800',
    'Beauty & Personal Care': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
    'Sports & Outdoors': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
    'Toys & Games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800',
    'Books & Media': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800',
    'Food & Beverages': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    'Automotive': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800',
    'Pet Supplies': 'https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=800',
    'Office Supplies': 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800',
    'Health & Wellness': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
    'Jewelry & Accessories': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    'Baby & Kids': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800',
  };

  return categoryImages[category] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
};
