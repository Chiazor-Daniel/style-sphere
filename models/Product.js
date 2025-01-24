const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    category: { type: String, required: true },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Add user field
});

module.exports = mongoose.model('Product', ProductSchema);