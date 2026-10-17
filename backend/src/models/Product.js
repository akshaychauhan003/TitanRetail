const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    // Kind of product (e.g. under Dairy: Milk, Curd, Paneer, Cheese, Butter; under Bakery: Bread, Buns)
    kind: {
      type: String,
      trim: true,
      default: '',
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    availableStock: {
      type: Number,
      required: [true, 'Available stock is required'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder level is required'],
      default: 5,
      min: [0, 'Reorder level cannot be negative'],
    },
    // Date of Manufacture
    dateOfManufacture: {
      type: Date,
      default: null,
    },
    // Time it will be good for (e.g., 7 days, 30 days, 6 months)
    shelfLifeValue: {
      type: Number,
      default: null,
      min: [0, 'Shelf life cannot be negative'],
    },
    shelfLifeUnit: {
      type: String,
      enum: ['days', 'months', 'years', ''],
      default: 'days',
    },
    // Expiry Date (can be auto-computed from DOM + shelf life, or entered manually)
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to determine stock status
productSchema.virtual('stockStatus').get(function () {
  const now = new Date();
  if (this.expiryDate && new Date(this.expiryDate) < now) {
    return 'EXPIRED';
  }
  if (this.availableStock <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (this.availableStock <= this.reorderLevel) {
    return 'LOW_STOCK';
  }
  return 'IN_STOCK';
});

// Auto-calculate expiryDate if DOM and shelf life are present and expiryDate wasn't explicitly supplied,
// or auto-calculate shelf life if DOM and expiryDate are present without shelf life
productSchema.pre('save', function (next) {
  if (this.dateOfManufacture && this.shelfLifeValue && !this.expiryDate) {
    const expiry = new Date(this.dateOfManufacture);
    if (this.shelfLifeUnit === 'days') {
      expiry.setDate(expiry.getDate() + Number(this.shelfLifeValue));
    } else if (this.shelfLifeUnit === 'months') {
      expiry.setMonth(expiry.getMonth() + Number(this.shelfLifeValue));
    } else if (this.shelfLifeUnit === 'years') {
      expiry.setFullYear(expiry.getFullYear() + Number(this.shelfLifeValue));
    }
    this.expiryDate = expiry;
  } else if (this.dateOfManufacture && this.expiryDate && (!this.shelfLifeValue || this.shelfLifeValue <= 0)) {
    const domTime = new Date(this.dateOfManufacture).getTime();
    const expTime = new Date(this.expiryDate).getTime();
    const diffDays = Math.round((expTime - domTime) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      this.shelfLifeValue = diffDays;
      if (!this.shelfLifeUnit) this.shelfLifeUnit = 'days';
    }
  }
  next();
});

// Text index for search
productSchema.index({ name: 'text', sku: 'text', category: 'text', kind: 'text' });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
