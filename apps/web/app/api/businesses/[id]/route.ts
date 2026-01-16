import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const businessId = parseInt(id, 10);
    if (isNaN(businessId) || businessId <= 0) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const businesses = await sql`SELECT * FROM businesses WHERE id = ${businessId}`;

    if (businesses.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Fetch products for this business
    const products = await sql`SELECT * FROM products WHERE business_id = ${businessId}`;

    return NextResponse.json({ 
      business: businesses[0],
      products: products
    });
  } catch (error) {
    console.error('Error fetching business:', error);
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const updates = await request.json();

    console.log('=== UPDATE BUSINESS REQUEST ===');
    console.log('Business ID:', id);
    console.log('Updates:', JSON.stringify(updates, null, 2));

    const businessId = parseInt(id, 10);
    if (isNaN(businessId) || businessId <= 0) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    // First get the existing business
    const existing = await sql`SELECT * FROM businesses WHERE id = ${businessId}`;
    
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const current = existing[0];
    console.log('Current business:', JSON.stringify(current, null, 2));

    // Merge updates with existing values
    const name = updates.name !== undefined ? updates.name : current.name;
    const description = updates.description !== undefined ? updates.description : current.description;
    const image = updates.image !== undefined ? updates.image : current.image;
    const type = updates.type !== undefined ? updates.type : current.type;
    const phone = updates.phone !== undefined ? updates.phone : current.phone;
    const address = updates.address !== undefined ? updates.address : current.address;
    const location = updates.location !== undefined ? updates.location : current.location;
    const categories = updates.categories !== undefined ? updates.categories : current.categories;
    const payment_methods = updates.payment_methods !== undefined ? updates.payment_methods : current.payment_methods;
    const delivery_fee = updates.delivery_fee !== undefined ? updates.delivery_fee : current.delivery_fee;
    const min_order = updates.min_order !== undefined ? updates.min_order : current.min_order;
    const delivery_time = updates.delivery_time !== undefined ? updates.delivery_time : current.delivery_time;
    const order_mode = updates.order_mode !== undefined ? updates.order_mode : current.order_mode;
    const email = updates.email !== undefined ? updates.email : current.email;
    const status = updates.status !== undefined ? updates.status : current.status;
    const custom_orders_enabled = updates.custom_orders_enabled !== undefined ? updates.custom_orders_enabled : current.custom_orders_enabled;
    const delivery_enabled = updates.delivery_enabled !== undefined ? updates.delivery_enabled : current.delivery_enabled;
    const pickup_enabled = updates.pickup_enabled !== undefined ? updates.pickup_enabled : current.pickup_enabled;
    const spin_wheel_enabled = updates.spin_wheel_enabled !== undefined ? updates.spin_wheel_enabled : current.spin_wheel_enabled;
    const spin_discounts = updates.spin_discounts !== undefined ? updates.spin_discounts : current.spin_discounts;
    
    // Social media fields
    const facebook = updates.facebook !== undefined ? updates.facebook : current.facebook;
    const instagram = updates.instagram !== undefined ? updates.instagram : current.instagram;
    const twitter = updates.twitter !== undefined ? updates.twitter : current.twitter;
    const youtube = updates.youtube !== undefined ? updates.youtube : current.youtube;

    console.log('Merged values:', {
      name,
      description: description?.substring(0, 50) + '...',
      image,
      type,
      phone,
      address,
      location,
      categories,
      payment_methods,
      delivery_fee,
      min_order,
      delivery_time,
      order_mode,
      email,
      status,
      custom_orders_enabled,
      delivery_enabled,
      pickup_enabled,
      spin_wheel_enabled,
      spin_discounts,
      facebook,
      instagram,
      twitter,
      youtube
    });

    // Update the business
    console.log('Executing UPDATE query...');
    const result = await sql`
      UPDATE businesses 
      SET 
        name = ${name},
        description = ${description},
        image = ${image},
        type = ${type},
        phone = ${phone},
        address = ${address},
        location = ${location},
        categories = ${categories},
        payment_methods = ${payment_methods},
        delivery_fee = ${delivery_fee},
        min_order = ${min_order},
        delivery_time = ${delivery_time},
        order_mode = ${order_mode},
        email = ${email},
        status = ${status},
        custom_orders_enabled = ${custom_orders_enabled},
        delivery_enabled = ${delivery_enabled},
        pickup_enabled = ${pickup_enabled},
        spin_wheel_enabled = ${spin_wheel_enabled},
        spin_discounts = ${spin_discounts},
        facebook = ${facebook},
        instagram = ${instagram},
        twitter = ${twitter},
        youtube = ${youtube}
      WHERE id = ${businessId}
      RETURNING *
    `;

    console.log('UPDATE successful, result:', JSON.stringify(result[0], null, 2));
    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('=== ERROR UPDATING BUSINESS ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error:', error);
    return NextResponse.json({ 
      error: 'Failed to update business',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const businessId = parseInt(id, 10);
    if (isNaN(businessId) || businessId <= 0) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    await sql`DELETE FROM products WHERE business_id = ${businessId}`;
    const result = await sql`DELETE FROM businesses WHERE id = ${businessId} RETURNING *`;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Error deleting business:', error);
    return NextResponse.json({ error: 'Failed to delete business' }, { status: 500 });
  }
}
