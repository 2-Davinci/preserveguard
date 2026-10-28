import Produce from '../models/Produce.js';

// @desc    Get all available produce for the Marketplace
// @route   GET /api/produce
export const getProduce = async (req, res) => {
  try {
    const produce = await Produce.find({});
    res.status(200).json(produce);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Receive synced data from IoT Gateway
// @route   POST /api/produce/sync
export const syncProduceData = async (req, res, next) => {
  try {
    const newProduce = new Produce(req.body);
    const savedProduce = await newProduce.save();

    // --- WEBSOCKET BROADCAST ---
    // Get the WebSocket server instance we attached in server.js
    const wss = req.app.locals.wss; 
    
    // Send the new data to every connected dashboard client
     wss.clients.forEach((client) => {
      if (client.readyState === 1) { // 1 means OPEN
        client.send(JSON.stringify({
          type: 'NEW_PRODUCE_ADDED',
          payload: savedProduce
        }));
      }
    });

    res.status(201).json(savedProduce);
  } catch (error) {
    next(error);
  }
};
// ... existing getProduce and syncProduceData controllers

// @desc    Delete a produce listing
// @route   DELETE /api/produce/:id
export const deleteProduce = async (req, res) => {
  try {
    const produce = await Produce.findByIdAndDelete(req.params.id);
    
    if (!produce) {
      return res.status(404).json({ message: 'Produce listing not found' });
    }

    res.status(200).json({ message: 'Produce listing removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
