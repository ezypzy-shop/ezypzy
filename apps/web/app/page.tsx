'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { Hero } from '@/components/Hero';
import { OfferBanner } from '@/components/OfferBanner';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  business_id: number;
}

interface Offer {
  id: number;
  title: string;
  description: string;
  image_url: string;
  discount_percentage: number;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, offersRes] = await Promise.all([
          fetch('/api/products?limit=8'),
          fetch('/api/ads?type=offer&active=true')
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        if (offersRes.ok) {
          const offersData = await offersRes.json();
          setOffers(offersData.ads || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div>
      <Hero />
      
      {/* Active Offers */}
      {offers.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Special Offers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offers.map((offer) => (
                <OfferBanner key={offer.id} offer={offer} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Featured Products</h2>
            <Link href="/shop" className="text-blue-600 hover:text-blue-700 font-medium">
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow animate-pulse">
                  <div className="w-full h-64 bg-gray-200 rounded-t-lg" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Electronics', 'Fashion', 'Home & Garden', 'Sports'].map((category) => (
              <Link
                key={category}
                href={`/shop?category=${category.toLowerCase()}`}
                className="bg-gray-100 hover:bg-gray-200 transition-colors rounded-lg p-8 text-center"
              >
                <h3 className="font-semibold text-lg">{category}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
