import mongoose from 'mongoose';

const produceSchema = new mongoose.Schema({
  cropType: { 
    type: String, 
    required: true,
    enum: ['Tomatoes', 'Plantain', 'Maize', 'Cassava', 'Pepper', 'Ginger', 'Oranges', 'Leafy Vegetables'] 
  },
  weightKg: { 
    type: Number, 
    required: true 
  },
  pricePerKg: { 
    type: Number, 
    required: true 
  },
  location: { 
    type: String, 
    required: true 
  },
  farmerName: { 
    type: String, 
    required: true 
  },
  status: {
    type: String,
    enum: ['Fresh', 'Good Quality', 'High Demand'],
    default: 'Fresh'
  }
}, { timestamps: true });

export default mongoose.model('Produce', produceSchema);