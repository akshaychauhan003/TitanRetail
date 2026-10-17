const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'RECEIVED',         // New stock received from supplier / purchase
        'MANUAL_ADD',      // Inventory correction (positive)
        'MANUAL_SUBTRACT', // Inventory correction (negative)
        'DAMAGE',          // Damaged stock written off
        'EXPIRED',         // Expired stock removed
        'SALE',            // Deducted due to customer sale
        'RETURN',          // Restored due to customer sales return
      ],
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    referenceId: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      default: 'System',
    },
    userRole: {
      type: String,
      default: 'staff',
    },
  },
  {
    timestamps: true,
  }
);

inventoryMovementSchema.index({ createdAt: -1 });

module.exports = mongoose.models.InventoryMovement || mongoose.model('InventoryMovement', inventoryMovementSchema);
