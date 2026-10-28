import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  produceItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Produce'
  },
  quantityKg: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  deliveryLocation: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'In Transit', 'Delivered'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash on Delivery', 'Manual Mobile Money'],
    default: 'Cash on Delivery'
  }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);