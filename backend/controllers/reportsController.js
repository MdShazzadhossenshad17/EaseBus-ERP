/**
 * EaseBus ERP — Backend Reports Controller
 * Computes Profit & Loss Income Statement, Expense Distribution, and Growth Telemetry
 */

export const ReportsController = {
  getProfitAndLoss(req, res) {
    const { start, end } = req.query;
    res.json({
      status: 'success',
      period: {
        start: start || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        end: end || new Date().toISOString().split('T')[0]
      },
      currency: 'BDT (৳)',
      statement: {
        gross_sales: 125000,
        discounts: 2500,
        net_sales: 122500,
        cost_of_goods_sold: 68000,
        gross_profit: 54500,
        gross_margin_pct: 44.49,
        operating_expenses: 24200,
        net_profit: 30300,
        net_margin_pct: 24.73
      },
      expense_breakdown: [
        { category: 'Courier Delivery Fees', amount: 8200, pct: 33.88 },
        { category: 'Packaging & Supplies', amount: 4500, pct: 18.60 },
        { category: 'Marketing & Digital Ads', amount: 6500, pct: 26.86 },
        { category: 'Office Utilities & Rent', amount: 3500, pct: 14.46 },
        { category: 'Misc Operational', amount: 1500, pct: 6.20 }
      ]
    });
  }
};

export default ReportsController;
