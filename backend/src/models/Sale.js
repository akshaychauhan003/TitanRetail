const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: '',
    },
    kind: {
      type: String,
      default: '',
    },
    unit: {
      type: String,
      default: 'pcs',
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    costPrice: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Cost price cannot be negative'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Item subtotal cannot be negative'],
    },
    returnedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Returned quantity cannot be negative'],
    },
  },
  { _id: true }
);

const saleReturnSchema = new mongoose.Schema(
  {
    returnedAt: {
      type: Date,
      default: Date.now,
    },
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    returnedByName: {
      type: String,
      default: 'System',
    },
    reason: {
      type: String,
      trim: true,
      default: 'Customer return',
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        refundAmount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalRefund: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    items: {
      type: [saleItemSchema],
      validate: [
        (val) => val && val.length > 0,
        'Sale must have at least one product item',
      ],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Discount percent cannot be negative'],
      max: [100, 'Discount percent cannot exceed 100'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    taxPercent: {
      type: Number,
      default: 0,
      min: [0, 'Tax percent cannot be negative'],
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    totalCost: {
      type: Number,
      default: 0,
      min: [0, 'Total cost cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Credit', 'Other'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PARTIAL', 'UNPAID'],
      default: 'PAID',
      index: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: [0, 'Due amount cannot be negative'],
    },
    paymentPercent: {
      type: Number,
      default: 100,
      min: [0, 'Payment percent cannot be negative'],
      max: [100, 'Payment percent cannot exceed 100'],
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cashierName: {
      type: String,
      default: 'Staff',
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PARTIALLY_RETURNED', 'RETURNED', 'CANCELLED'],
      default: 'COMPLETED',
      index: true,
    },
    returns: [saleReturnSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
