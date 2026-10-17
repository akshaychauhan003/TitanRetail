const Category = require('../models/Category');
const Product = require('../models/Product');

// Preset standard food and retail categories with typical product name suggestions
const DEFAULT_CATEGORIES = [
  {
    name: 'Dairy',
    kinds: ['Milk', 'Curd', 'Paneer', 'Cheese', 'Butter', 'Ghee', 'Yogurt', 'Cream'],
    commonProducts: [
      'Amul Taaza Fresh Toned Milk 500ml',
      'Amul Gold Full Cream Milk 1000ml',
      'Mother Dairy Classic Curd 400g',
      'Amul Fresh Malai Paneer 200g',
      'Amul Pasteurized Butter 100g',
      'Britannia Processed Cheese Slices 200g',
      'Epigamia Greek Yogurt Plain 100g',
      'Mother Dairy Cow Ghee 500ml',
    ],
  },
  {
    name: 'Bakery',
    kinds: ['Bread', 'Buns', 'Cakes', 'Cookies', 'Pastries', 'Rusk'],
    commonProducts: [
      'Britannia Whole Wheat Bread 400g',
      'Harvest Gold White Bread 400g',
      'English Oven Burger Buns 4pcs',
      'Fresh French Baguette 250g',
      'Britannia Good Day Butter Cookies 120g',
      'Bake Fresh Chocolate Cupcakes 4pcs',
      'Crispy Baked Garlic Rusks 200g',
    ],
  },
  {
    name: 'Beverages',
    kinds: ['Soda', 'Juice', 'Tea', 'Coffee', 'Energy Drink', 'Mineral Water'],
    commonProducts: [
      'Coca-Cola 750ml PET Bottle',
      'Pepsi 750ml PET Bottle',
      'Tropicana 100% Real Orange Juice 1L',
      'Red Bull Energy Drink Can 250ml',
      'Tata Tea Gold Premium 500g',
      'Nescafe Classic Instant Coffee 100g',
      'Bisleri Purified Mineral Water 1L',
    ],
  },
  {
    name: 'Snacks',
    kinds: ['Chips', 'Biscuits', 'Namkeen', 'Chocolates', 'Nuts', 'Popcorn'],
    commonProducts: [
      'Lays Classic Salted Potato Chips 50g',
      'Kurkure Masala Munch Crisps 90g',
      'Haldirams Aloo Bhujia Namkeen 400g',
      'Cadbury Dairy Milk Silk Chocolate 150g',
      'Act II Butter Lovers Popcorn 150g',
      'Roasted Salted Cashews & Almonds 200g',
    ],
  },
  {
    name: 'Groceries',
    kinds: ['Rice', 'Wheat Flour', 'Cooking Oil', 'Pulses / Dal', 'Sugar', 'Spices'],
    commonProducts: [
      'India Gate Super Basmati Rice 5kg',
      'Aashirvaad Shudh Chakki Atta 5kg',
      'Fortune Sunlite Refined Sunflower Oil 1L',
      'Tata Sampann Toor Dal Unpolished 1kg',
      'Madhur Pure & Hygienic Sugar 1kg',
      'Tata Salt Vacuum Evaporated 1kg',
      'Catch Kashmiri Red Chilli Powder 200g',
    ],
  },
  {
    name: 'Frozen Foods',
    kinds: ['Frozen Vegetables', 'Ready to Fry', 'Ice Cream', 'Snacks'],
    commonProducts: [
      'Safal Frozen Green Peas 1kg',
      'McCain French Fries 450g',
      'Amul Vanilla Magic Ice Cream 1L',
      'Kwality Walls Butterscotch Cone 110ml',
      'McCain Smiles Potato Crisps 375g',
      'Safal Sweet Corn Kernels 500g',
    ],
  },
  {
    name: 'Sweets & Confectionery',
    kinds: ['Mithai', 'Chocolates', 'Candies', 'Desserts'],
    commonProducts: [
      'Haldirams Gulab Jamun Tin 1kg',
      'Bikano Rasgulla Tin 1kg',
      'Kaju Katli Gift Box 500g',
      'Cadbury Celebrations Gift Pack 200g',
      'Alpenliebe Creamfills Caramel Candies',
    ],
  },
  {
    name: 'Personal Care',
    kinds: ['Soap', 'Shampoo', 'Toothpaste', 'Deodorant', 'Face Wash', 'Lotion'],
    commonProducts: [
      'Dettol Original Germ Protection Bathing Bar 125g',
      'Dove Cream Beauty Bathing Bar 100g',
      'Head & Shoulders Cool Menthol Anti-Dandruff Shampoo 340ml',
      'Colgate Total Active Fresh Toothpaste 150g',
      'Nivea Soft Light Moisturizing Cream 100ml',
    ],
  },
];

/**
 * GET /api/categories
 * Returns all categories merged with database categories and distinct product categories
 */
async function getCategories(req, res, next) {
  try {
    const [dbCategories, distinctProductCategories] = await Promise.all([
      Category.find({}).sort({ name: 1 }),
      Product.distinct('category', { isActive: true }),
    ]);

    // Map of categories by name
    const categoryMap = new Map();

    // 1. Put defaults
    DEFAULT_CATEGORIES.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), {
        _id: `preset-${cat.name.toLowerCase()}`,
        name: cat.name,
        kinds: cat.kinds || [],
        commonProducts: cat.commonProducts || [],
        isCustom: false,
      });
    });

    // 2. Put DB categories (overriding or supplementing)
    dbCategories.forEach((cat) => {
      const key = cat.name.toLowerCase();
      const existing = categoryMap.get(key);
      categoryMap.set(key, {
        _id: cat._id.toString(),
        name: cat.name,
        kinds: cat.kinds?.length ? cat.kinds : existing?.kinds || [],
        commonProducts: cat.commonProducts?.length ? cat.commonProducts : existing?.commonProducts || [],
        description: cat.description || '',
        isCustom: cat.isCustom !== false,
      });
    });

    // 3. Make sure any category found in existing products is included
    distinctProductCategories.forEach((catName) => {
      if (catName && catName.trim()) {
        const key = catName.trim().toLowerCase();
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            _id: `prod-${key}`,
            name: catName.trim(),
            kinds: [],
            commonProducts: [],
            isCustom: true,
          });
        }
      }
    });

    const categoryList = Array.from(categoryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    res.status(200).json({
      success: true,
      count: categoryList.length,
      data: categoryList,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
async function createCategory(req, res, next) {
  try {
    const { name, description = '', kinds = [], commonProducts = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
    }

    const trimmedName = name.trim();

    // Check if category already exists in DB
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      // Update kinds/commonProducts if provided
      if (kinds && kinds.length) {
        existing.kinds = Array.from(new Set([...existing.kinds, ...kinds]));
      }
      if (commonProducts && commonProducts.length) {
        existing.commonProducts = Array.from(
          new Set([...existing.commonProducts, ...commonProducts])
        );
      }
      await existing.save();
      return res.status(200).json({
        success: true,
        message: 'Category already exists and was updated',
        data: existing,
      });
    }

    const newCategory = await Category.create({
      name: trimmedName,
      description: description.trim(),
      kinds: Array.isArray(kinds) ? kinds : [],
      commonProducts: Array.isArray(commonProducts) ? commonProducts : [],
      isCustom: true,
    });

    res.status(201).json({
      success: true,
      message: `Category "${newCategory.name}" created successfully.`,
      data: newCategory,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  createCategory,
  DEFAULT_CATEGORIES,
};
