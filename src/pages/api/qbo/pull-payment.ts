// api/qbo/pull-payment.ts
// Pull payment information from QuickBooks for an invoice
import { pullPaymentFromQBO } from '@/lib/qboInvoiceSync';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { payAppId } = req.body;

  if (!payAppId) {
    return res.status(400).json({ error: 'payAppId is required' });
  }

  try {
    const result = await pullPaymentFromQBO(payAppId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        paymentTotal: result.paymentTotal,
        message: 'Payment info updated successfully',
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Error pulling payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
