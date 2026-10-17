const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Customer mobile number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      default: 'Valued Customer',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    firstVisit: {
      type: Date,
      default: Date.now,
    },
    lastVisit: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for average order value
customerSchema.virtual('avgOrderValue').get(function () {
  return this.totalOrders > 0
    ? Math.round((this.totalSpent / this.totalOrders) * 100) / 100
    : 0;
});

// Virtual for customer classification (Regular vs Rare)
customerSchema.virtual('customerType').get(function () {
  if (this.totalOrders >= 3 || this.totalSpent >= 2000) return 'REGULAR';
  if (this.totalOrders === 2) return 'OCCASIONAL';
  return 'RARE';
});

customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.Customer || mongoose.model('Customer', customerSchema);
