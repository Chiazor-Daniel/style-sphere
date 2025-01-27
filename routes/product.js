const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({ 
  cloud_name: 'ddnhd44ht', 
  api_key: '315473557522145', 
  api_secret: 'L-s7PpZfB9eyF-0zQxEE1QJa29M'
});

// Helper function to upload image to Cloudinary
const uploadImageToCloudinary = async (base64String) => {
  if (!base64String) throw new Error('No image data provided');
  
  try {
    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64String}`, {
      resource_type: 'auto'
    });
    return result.secure_url; // Return the secure URL of the uploaded image
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Create product - POST /api/products
router.post('/', [
  auth,
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('image').notEmpty().withMessage('Image is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').optional().trim().isLength({ max: 1000 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, image, price, category, description } = req.body;

    // Upload image to Cloudinary
    const imageUrl = await uploadImageToCloudinary(image);

    // Create and save the product
    const product = new Product({
      name: name.trim(),
      image: imageUrl,
      price: parseFloat(price),
      category: category.trim(),
      description: description?.trim(),
      user: req.user.id
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Get all products feed - GET /api/products/feeds
router.get('/feeds', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .select('-likedBy') // Exclude likedBy array for performance
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments();

    res.json({
      products,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total
    });
  } catch (error) {
    console.error('Get feeds error:', error);
    res.status(500).json({ error: 'Failed to fetch products feed' });
  }
});

// Get user's products - GET /api/products/my-products
router.get('/my-products', auth, async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({ error: 'Failed to fetch your products' });
  }
});

// Get products by category - GET /api/products/category/:category
router.get('/category/:category', auth, async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });
    res.json(products);
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Like product - POST /api/products/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user already liked the product
    const likedIndex = product.likedBy.indexOf(req.user.id);
    
    if (likedIndex === -1) {
      // Add like
      product.likedBy.push(req.user.id);
      product.likes += 1;
    } else {
      // Remove like
      product.likedBy.splice(likedIndex, 1);
      product.likes -= 1;
    }

    await product.save();
    res.json({ likes: product.likes, liked: likedIndex === -1 });
  } catch (error) {
    console.error('Like product error:', error);
    res.status(500).json({ error: 'Failed to update product likes' });
  }
});

// Get product by ID - GET /api/products/:id
router.get('/:id', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    const product = await Product.findById(req.params.id)
      .populate('user', 'name email');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Update product - PUT /api/products/:id
router.put('/:id', [
  auth,
  body('name').optional().trim().isLength({ max: 100 }),
  body('price').optional().isFloat({ min: 0 }),
  body('description').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user owns the product
    if (product.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const updates = req.body;
    
    // Handle image update if provided
    if (updates.image) {
      updates.image = await uploadImageToCloudinary(updates.image);
    }

    // Update and return new product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product - DELETE /api/products/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user owns the product
    if (product.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;