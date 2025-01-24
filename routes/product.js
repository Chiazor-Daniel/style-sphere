const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

router.post(
    '/',
    [
        auth,
        body('name', 'Name is required').not().isEmpty(),
        body('image', 'Image URL is required').not().isEmpty(),
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
            const product = new Product({
                name,
                image,
                price,
                category,
                user: req.user.id,
            });

            await product.save();
            res.status(201).json(product);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    }
);
// Get all products
router.get('/feeds', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.category });
        res.json(products);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
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