const Sale = require('../models/Sale');

/**
 * Generates an authoritative unique invoice number: INV-YYYYMMDD-XXXX
 */
async function generateInvoiceNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-${dateStr}`;

  // Find latest invoice with this prefix to increment counter
  const latestSale = await Sale.findOne({
    invoiceNumber: new RegExp(`^${prefix}`),
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (latestSale && latestSale.invoiceNumber) {
    const parts = latestSale.invoiceNumber.split('-');
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        sequence = parsedSeq + 1;
      }
    }
  }

  const paddedSeq = String(sequence).padStart(4, '0');
  const candidate = `${prefix}-${paddedSeq}`;

  // Double check collision safety
  const exists = await Sale.exists({ invoiceNumber: candidate });
  if (exists) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomSuffix}`;
  }

  return candidate;
}

module.exports = { generateInvoiceNumber };
