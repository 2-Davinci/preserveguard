import Order from '../models/Order.js';
import Produce from '../models/Produce.js';

// @desc    Create a new order request
// @route   POST /api/orders
export const createOrder = async (req, res, next) => {
  const { produceId, quantityKg, deliveryLocation, paymentMethod } = req.body;

  try {
    const produce = await Produce.findById(produceId);
    
    if (!produce) {
      res.status(404);
      throw new Error('Produce not found');
    }

    if (produce.weightKg < quantityKg) {
      res.status(400);
      throw new Error('Not enough produce available');
    }

    const totalAmount = produce.pricePerKg * quantityKg;

    const order = await Order.create({
      buyer: req.user._id,
      produceItem: produce._id,
      quantityKg,
      totalPrice: totalAmount,
      deliveryLocation,
      paymentMethod
    });

    // Deduct stock immediately to prevent double-booking
    produce.weightKg -= quantityKg;
    await produce.save();

    res.status(201).json(order);
  } catch (error) {
    next(error); // Passes error to the global handler we will build below
  }
};

// @desc    Update order status manually (Admin/Farmer)
// @route   PUT /api/orders/:id/status
export const updateOrderStatus = async (req, res, next) => {
  const { status } = req.body; // e.g., "Confirmed" or "In Transit"

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    order.status = status;
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate('produceItem', 'cropType location')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
}