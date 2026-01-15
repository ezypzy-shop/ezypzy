import { NextRequest, NextResponse } from 'next/server';
import sql from '../utils/sql';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');

    let products;

    if (businessId && category && search) {
      products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.image as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.business_id = ${parseInt(businessId)}
          AND p.category = ${category}
          AND (p.name ILIKE ${`%${search}%`} OR p.description ILIKE ${`%${search}%`})
        ORDER BY p.created_at DESC
      `;
    } else if (businessId && category) {
      products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.image as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.business_id = ${parseInt(businessId)}
          AND p.category = ${category}
        ORDER BY p.created_at DESC
      `;
    } else if (businessId && search) {
      products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.image as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.business_id = ${parseInt(businessId)}
          AND (p.name ILIKE ${`%${search}%`} OR p.description ILIKE ${`%${search}%`})
        ORDER BY p.created_at DESC
      `;
    } else if (businessId) {
      products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.image as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.business_id = ${parseInt(businessId)}
        ORDER BY p.created_at DESC
      `;
    } else if (category && search) {
      products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.image as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.category = ${category}
          AND (p.name ILIKE ${`%${search}%`} OR p.description ILIKE ${`%${search}%`})
        ORDER BY p.created_at DESC
      `;
    } else if (category) {
      products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.image as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.category = ${category}
        ORDER BY p.created_at DESC
      `;
    } else if (search) {
      products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.image as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.name ILIKE ${`%${search}%`} OR p.description ILIKE ${`%${search}%`}
        ORDER BY p.created_at DESC
      `;
    } else if (featured === 'true') {
      products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.image as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.featured = true
        ORDER BY p.created_at DESC
      `;
    } else {
      products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.image as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        ORDER BY p.created_at DESC
      `;
    }

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      price, 
      image, 
      category, 
      business_id, 
      stock,
      featured = false 
    } = body;

    if (!name || !price || !business_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, business_id' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO products (name, description, price, image, category, business_id, stock, featured)
      VALUES (${name}, ${description}, ${parseFloat(price)}, ${image}, ${category}, ${parseInt(business_id)}, ${stock || 0}, ${featured})
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, price, image, category, stock, featured } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE products
      SET 
        name = ${name},
        description = ${description},
        price = ${parseFloat(price)},
        image = ${image},
        category = ${category},
        stock = ${stock},
        featured = ${featured}
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM products
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product', details: error.message },
      { status: 500 }
    );
  }
}
