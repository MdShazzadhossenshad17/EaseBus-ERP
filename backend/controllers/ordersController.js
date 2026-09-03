/**
 * EaseBus ERP — Backend Orders Controller
 * Handles Order processing, invoice generation, status transitions, and KPIs
 */

export const OrdersController = {
  getSummary(req, res) {
    res.json({
      status: 'success',
      data: {
        summary: {
          total_orders: 142,
          total_revenue: 284500,
          pending_orders: 18,
          delivered_orders: 112,
          cancelled_orders: 12
        }
      }
    });
  },

  getAll(req, res) {
    const status = req.query.status;
    const mockOrders = [
      {
        id: 'ORD-1001',
        customer_name: 'Tanvir Ahmed',
        customer_phone: '01711223344',
        items_count: 3,
        total_amount: 4500,
        paid_amount: 4500,
        payment_status: 'paid',
        delivery_status: 'delivered',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'ORD-1002',
        customer_name: 'Nusrat Jahan',
        customer_phone: '01899887766',
        items_count: 1,
        total_amount: 1850,
        paid_amount: 0,
        payment_status: 'unpaid',
        delivery_status: 'in_transit',
        created_at: new Date(Date.now() - 43200000).toISOString()
      },
      {
        id: 'ORD-1003',
        customer_name: 'Rahim Ullah',
        customer_phone: '01655443322',
        items_count: 5,
        total_amount: 8200,
        paid_amount: 4000,
        payment_status: 'partial',
        delivery_status: 'pending',
        created_at: new Date().toISOString()
      }
    ];

    const filtered = status ? mockOrders.filter(o => o.delivery_status === status) : mockOrders;
    res.json({
      status: 'success',
      count: filtered.length,
      data: filtered
    });
  },

  create(req, res) {
    const { customer_name, customer_phone, items, total_amount, payment_method } = req.body || {};
    if (!customer_name || !items || !items.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer name and line items are required'
      });
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: orderId,
      customer_name,
      customer_phone: customer_phone || 'N/A',
      items,
      total_amount: total_amount || 0,
      payment_method: payment_method || 'cash_on_delivery',
      payment_status: 'unpaid',
      delivery_status: 'pending',
      created_at: new Date().toISOString()
    };

    res.status(201).json({
      status: 'success',
      message: `Order ${orderId} created successfully`,
      order: newOrder
    });
  }
};

export default OrdersController;
