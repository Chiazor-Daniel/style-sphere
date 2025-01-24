const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Place an order
router.post('/', auth, async (req, res) => {
    const { product, quantity, totalPrice } = req.body;
    try {
        const order = new Order({
            user: req.user.id,
            product,
            quantity,
            totalPrice,
        });
        await order.save();
        res.json(order);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;