const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Coupon  = require('../../models/couponSchema')
const Order = require('../../models/orderSchema')
const PDFDocument = require('pdfkit');
const excel = require('exceljs')
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const storage = require("../../helpers/multer");
const sharp = require("sharp");
const uploads = multer({ storage });
const { jsPDF } = require("jspdf");




const getSalesReport = async (req, res) => {

    console.log('from sales ..............>>>>>>>>>>>>........')
    try {
     


        // Fetch orders based on the date filter
        const orders = await Order.find().populate("userId");

        // Calculate totals
        let totalSales = 0;
        let totalDiscounts = 0;
        let couponDeductions = 0;

        orders.forEach(order => {
            totalSales += order.finalAmount;
            totalDiscounts += order.discount;
            couponDeductions += order.couponOffer;
        });
        // console.log('orders--------->',orders)
        // console.log('totalSales--------->',totalSales)
        // console.log('totalDiscounts--------->',totalDiscounts)
        // console.log('couponDeductions--------->',couponDeductions)
        // console.log('orders--------->',filter)
        // console.log('startDate--------->',startDate)
        // console.log('endDate--------->',endDate)
      

        // Render the sales report page
        console.log("sales data--->",orders)
        res.render('sales', {
            getsalesReport:orders,
            totalSales,
            totalDiscounts,
            couponDeductions,
          
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const salesFilter = async(req,res)=>{
    try {
         const { filter, startDate, endDate } = req.query; // Extract filter criteria
           
         
         // Define the date filter based on the selected criteria


        let dateFilter = {};
        if (filter === "daily") {
            dateFilter = { 
                invoiceDate: { 
                    $gte: new Date().setHours(0, 0, 0), 
                    $lte: new Date() 
                } 
            };
        } else if (filter === "weekly") {
            console.log("filter weekly")
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - 7);
            dateFilter = { invoiceDate: { $gte: startOfWeek, $lte: new Date() } };
        } else if (filter === "monthly") {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            dateFilter = { invoiceDate: { $gte: startOfMonth, $lte: new Date() } };
        } else if (filter === "yearly") {
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            dateFilter = { invoiceDate: { $gte: startOfYear, $lte: new Date() } };
        } else if (filter === "custom" && startDate && endDate) {
            dateFilter = { 
                invoiceDate: { 
                    $gte: new Date(startDate), 
                    $lte: new Date(endDate) 
                } 
            };
        }
        const orders = await Order.find(dateFilter).populate("userId");

        // Calculate totals
        let totalSales = 0;
        let totalDiscounts = 0;
        let couponDeductions = 0;

        orders.forEach(order => {
            totalSales += order.finalAmount;
            totalDiscounts += order.discount;
            couponDeductions += order.couponOffer;
        });
 
        res.json({
            salesReport:orders,
            totalSales,
            totalDiscounts,
            couponDeductions,
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching sales data.' });
    }
}
  







const salesFilterPDF = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let dateFilter = {};
        
        // Filtering logic
        if (filter === "daily") {
            dateFilter = { 
                invoiceDate: { $gte: new Date().setHours(0, 0, 0), $lte: new Date() } 
            };
        } else if (filter === "weekly") {
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - 7);
            dateFilter = { invoiceDate: { $gte: startOfWeek, $lte: new Date() } };
        } else if (filter === "monthly") {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            dateFilter = { invoiceDate: { $gte: startOfMonth, $lte: new Date() } };
        } else if (filter === "custom" && startDate && endDate) {
            dateFilter = { 
                invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) } 
            };
        }

        const orders = await Order.find(dateFilter).populate("userId");

        // Calculate totals
        let totalSales = 0;
        let totalDiscounts = 0;
        let couponDeductions = 0;

        orders.forEach(order => {
            totalSales += order.finalAmount;
            totalDiscounts += order.discount;
            couponDeductions += order.couponOffer;
        });

        // Create PDF document
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
        doc.pipe(res);

        // Add header
        doc.fontSize(18)
           .fillColor('#0000FF')
           .text('CUST - sales report', { align: 'left' });

        doc.moveDown(0.5);
        doc.fontSize(14)
           .fillColor('#000000')
           .text('Item Wise Sales Report', { align: 'right' });

        // Add date and filter info
        doc.moveDown(0.5);
        doc.fontSize(10)
           .text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.text(`Filter: ${filter}${filter === 'custom' ? ` (${startDate} to ${endDate})` : ''}`, { align: 'right' });

        // Add blue line
        doc.moveDown(0.5);
        doc.lineWidth(1)
           .strokeColor('#0000FF')
           .moveTo(30, doc.y)
           .lineTo(565, doc.y)
           .stroke();

        // Table headers
        const tableTop = doc.y + 10;
        const tableHeaders = ['User', 'Invoice Date', 'Payment', 'Items', 'Coupon', 'Discount', 'Total'];
        const columnWidths = [100, 80, 70, 40, 60, 60, 70];
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        const startX = (doc.page.width - tableWidth) / 2;

        // Draw headers
        doc.fontSize(9)
           .fillColor('#000000');
        
        let xPosition = startX;
        tableHeaders.forEach((header, i) => {
            const alignment = i >= 3 ? 'right' : 'left';
            doc.text(header, xPosition, tableTop, { width: columnWidths[i], align: alignment });
            xPosition += columnWidths[i];
        });

        // Draw lines below headers
        doc.lineWidth(0.5)
           .moveTo(startX, tableTop + 15)
           .lineTo(startX + tableWidth, tableTop + 15)
           .stroke();

        // Add table rows
        let rowTop = tableTop + 20;
        const rowHeight = 15;
        orders.forEach((order, i) => {
            // Alternate row backgrounds
            if (i % 2 === 0) {
                doc.fillColor('#F8F9FA')
                   .rect(startX, rowTop - 2, tableWidth, rowHeight)
                   .fill();
            }

            doc.fillColor('#000000')
               .fontSize(8);

            xPosition = startX;
            doc.text(order.userId.name, xPosition, rowTop, { width: columnWidths[0], height: rowHeight, ellipsis: true });
            xPosition += columnWidths[0];
            doc.text(order.invoiceDate.toLocaleDateString(), xPosition, rowTop, { width: columnWidths[1], height: rowHeight });
            xPosition += columnWidths[1];
            doc.text(order.paymentMethod, xPosition, rowTop, { width: columnWidths[2], height: rowHeight });
            xPosition += columnWidths[2];
            doc.text(order.orderedItems.length.toString(), xPosition, rowTop, { width: columnWidths[3], height: rowHeight, align: 'right' });
            xPosition += columnWidths[3];
            doc.text(`₹${order.couponOffer.toFixed(2)}`, xPosition, rowTop, { width: columnWidths[4], height: rowHeight, align: 'right' });
            xPosition += columnWidths[4];
            doc.text(`₹${order.discount.toFixed(2)}`, xPosition, rowTop, { width: columnWidths[5], height: rowHeight, align: 'right' });
            xPosition += columnWidths[5];
            doc.text(`₹${order.finalAmount.toFixed(2)}`, xPosition, rowTop, { width: columnWidths[6], height: rowHeight, align: 'right' });

            rowTop += rowHeight;

            // Add a new page if we're near the bottom
            if (rowTop > 700) {  // Reduced from 750 to leave space for totals
                doc.addPage();
                rowTop = 30;
                
                // Redraw headers on new page
                xPosition = startX;
                tableHeaders.forEach((header, i) => {
                    const alignment = i >= 3 ? 'right' : 'left';
                    doc.text(header, xPosition, rowTop, { width: columnWidths[i], align: alignment });
                    xPosition += columnWidths[i];
                });
                
                doc.lineWidth(0.5)
                   .moveTo(startX, rowTop + 15)
                   .lineTo(startX + tableWidth, rowTop + 15)
                   .stroke();
                
                rowTop += 20;
            }
        });

        // Add space before totals
        doc.moveDown(2);

        // Add totals
        doc.fontSize(9)
           .fillColor('#000000');

        const totalsStartX = startX + tableWidth - 200; // Adjust this value as needed for proper alignment
        doc.text(`Total Sales: ₹${totalSales.toFixed(2)}`, totalsStartX, doc.y, { width: 200, align: 'right' });
        doc.moveDown(0.5);
        doc.text(`Total Discounts: ₹${totalDiscounts.toFixed(2)}`, totalsStartX, doc.y, { width: 200, align: 'right' });
        doc.moveDown(0.5);
        doc.text(`Total Coupon Deductions: ₹${couponDeductions.toFixed(2)}`, totalsStartX, doc.y, { width: 200, align: 'right' });

        // Add footer
        doc.fontSize(8)
           .text('Powered by Stock Register', doc.page.width - 150, doc.page.height - 50, { align: 'right' });

        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Error generating sales report PDF.' });
    }
};















const salesFilterExcel = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let dateFilter = {};
        
        // Same filtering logic as PDF
        if (filter === "daily") {
            dateFilter = { 
                invoiceDate: { $gte: new Date().setHours(0, 0, 0), $lte: new Date() } 
            };
        } else if (filter === "weekly") {
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - 7);
            dateFilter = { invoiceDate: { $gte: startOfWeek, $lte: new Date() } };
        } else if (filter === "monthly") {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            dateFilter = { invoiceDate: { $gte: startOfMonth, $lte: new Date() } };
        } else if (filter === "custom" && startDate && endDate) {
            dateFilter = { 
                invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) } 
            };
        }

        const orders = await Order.find(dateFilter).populate("userId");

        // Create Excel workbook
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Add header
        worksheet.mergeCells('A1:E1');
        worksheet.getCell('A1').value = 'CUST- sales report';
        worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: '0000FF' } };
        worksheet.getCell('A1').alignment = { horizontal: 'left' };

        // Add report title
        worksheet.mergeCells('A2:E2');
        worksheet.getCell('A2').value = 'Item Wise Sales Report';
        worksheet.getCell('A2').font = { size: 14, bold: true };
        worksheet.getCell('A2').alignment = { horizontal: 'right' };

        // Add date and filter info
        worksheet.mergeCells('A3:E3');
        worksheet.getCell('A3').value = `Date: ${new Date().toLocaleDateString()} | Filter: ${filter}${filter === 'custom' ? ` (${startDate} to ${endDate})` : ''}`;
        worksheet.getCell('A3').alignment = { horizontal: 'right' };

        // Add headers
        worksheet.addRow(['User', 'Invoice Date', 'Payment Method','Number Of Items','Coupon Offer','Discount', 'Total Amount',]);
        worksheet.getRow(4).font = { bold: true };
        worksheet.getRow(4).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E6E6E6' }
        };

        // Add data
        orders.forEach(order => {
            worksheet.addRow([
                order.userId.name,
                order.invoiceDate.toLocaleDateString(),
                order.paymentMethod,
                order.orderedItems.length.toString(),
                order.couponOffer,
                order.discount,
                order.finalAmount,
               
            ]);
        });

        // Style columns
        worksheet.columns.forEach(column => {
            column.width = 20;
            column.alignment = { horizontal: 'left' };
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).json({ error: 'Error generating sales report Excel.' });
    }
};


module.exports = {
    getSalesReport,
    salesFilter,
    salesFilterPDF,
    salesFilterExcel,
}