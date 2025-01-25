const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'ddnhd44ht', // Replace with your Cloud Name
    api_key: '315473557522145',       // Replace with your API Key
    api_secret: 'L-s7PpZfB9eyF-0zQxEE1QJa29M', // Replace with your API Secret
  });

  const uploadImageToCloudinary = async (base64String) => {
    try {
      const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64String}`);
      return result.secure_url; // Return the image URL
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      throw error;
    }
  };

  router.post(
    '/',
    [
      auth,
      body('name', 'Name is required').not().isEmpty(),
      body('image', 'Image is required').not().isEmpty(), // Expecting a base64 string
      body('price', 'Price must be a number').isNumeric(),
      body('category', 'Category is required').not().isEmpty(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { name, image, price, category } = req.body;
  
      try {
        // Upload the image to Cloudinary
        const imageUrl = await uploadImageToCloudinary(image);
  
        // Create and save the product
        const product = new Product({
          name,
          image: imageUrl, // Save the Cloudinary image URL
          price,
          category,
          user: req.user.id,
        });
  
        await product.save();
        res.status(201).json(product);
      } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Server error' });
      }
    }
  );

  

// Get products by category
router.get('/category/:category', auth ,  async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.category });
        res.json(products);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Get product by ID
router.get('/:id', auth ,  async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('reviews');
        res.json(product);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.get('/my-products', auth, async (req, res) => {
    try {
        const products = await Product.find({ user: req.user.id });
        res.json(products);
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;