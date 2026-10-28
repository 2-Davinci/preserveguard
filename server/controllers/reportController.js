import * as XLSX from 'xlsx';
import Produce from '../models/Produce.js';
import Order from '../models/Order.js';

// @desc    Generate and download Excel report for Dashboard
// @route   GET /api/reports/download
export const downloadDashboardReport = async (req, res, next) => {
  try {
    // 1. Fetch data from database
    const produceData = await Produce.find({}).lean(); // .lean() makes it a plain JS object
    const ordersData = await Order.find({}).populate('buyer', 'name email').populate('produceItem', 'cropType').lean();

    // 2. Format Produce Data for the spreadsheet
    const formattedProduce = produceData.map((item) => ({
      'ID': item._id.toString(),
      'Crop Type': item.cropType,
      'Weight (kg)': item.weightKg,
      'Price/kg (GHS)': item.pricePerKg,
      'Location': item.location,
      'Farmer': item.farmerName,
      'Status': item.status,
      'Date Added': new Date(item.createdAt).toLocaleDateString()
    }));

    // 3. Format Orders Data for the spreadsheet
    const formattedOrders = ordersData.map((order) => ({
      'Order ID': order._id.toString(),
      'Buyer Name': order.buyer?.name || 'Unknown',
      'Crop Ordered': order.produceItem?.cropType || 'Unknown',
      'Quantity (kg)': order.quantityKg,
      'Total Price (GHS)': order.totalPrice,
      'Delivery Location': order.deliveryLocation,
      'Status': order.status,
      'Payment Method': order.paymentMethod,
      'Order Date': new Date(order.createdAt).toLocaleDateString()
    }));

    // 4. Create a new Workbook and add Worksheets
    const workbook = XLSX.utils.book_new();
    
    const produceSheet = XLSX.utils.json_to_sheet(formattedProduce);
    const orderSheet = XLSX.utils.json_to_sheet(formattedOrders);

    // Append sheets to the workbook
    XLSX.utils.book_append_sheet(workbook, produceSheet, 'Inventory');
    XLSX.utils.book_append_sheet(workbook, orderSheet, 'Orders');

    // 5. Write the workbook to a buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 6. Set headers for file download and send response
    res.setHeader('Content-Disposition', 'attachment; filename="FarmLink_Report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.status(200).send(excelBuffer);

  } catch (error) {
    next(error);
  }
};