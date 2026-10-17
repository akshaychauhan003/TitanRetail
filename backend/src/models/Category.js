const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Subcategory kinds associated with this category
    kinds: {
      type: [String],
      default: [],
    },
    // Standard product name templates/suggestions for quick selection
    commonProducts: {
      type: [String],
      default: [],
    },
    isCustom: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
