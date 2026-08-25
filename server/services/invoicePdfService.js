const PDFDocument = require('pdfkit');

const money = (value) => `INR ${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

function generateInvoicePdf(invoice, purchaseOrder, supplier) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 46 });
    const chunks = [];
    document.on('data', chunk => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    const pageWidth = document.page.width - 92;
    document.fillColor('#312e81').fontSize(23).font('Helvetica-Bold').text('CogniYard', { align: 'left' });
    document.fillColor('#18181b').fontSize(17).text('FINAL TAX INVOICE', 46, 50, { align: 'right' });
    document.moveDown(1.4);

    document.fontSize(9).fillColor('#52525b');
    document.text(`Invoice Number: ${invoice.invoiceNumber}`);
    document.text(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`);
    document.text(`Purchase Order: ${invoice.poNumber}`);
    document.text(`Payment Terms: ${invoice.paymentTerms || 'Net 30'}`);
    document.moveDown();

    const partyY = document.y;
    document.font('Helvetica-Bold').fillColor('#18181b').text('SUPPLIER', 46, partyY);
    document.font('Helvetica').fillColor('#52525b')
      .text(supplier?.companyName || supplier?.name || invoice.supplierName, 46, partyY + 16, { width: pageWidth / 2 - 12 })
      .text(supplier?.address || 'Address on supplier master record', 46, partyY + 30, { width: pageWidth / 2 - 12 })
      .text(supplier?.taxId ? `Tax ID: ${supplier.taxId}` : 'Tax ID: Not provided', 46, partyY + 58, { width: pageWidth / 2 - 12 });

    const rightX = 46 + pageWidth / 2 + 12;
    document.font('Helvetica-Bold').fillColor('#18181b').text('BUYER', rightX, partyY);
    document.font('Helvetica').fillColor('#52525b')
      .text(process.env.BUYER_COMPANY_NAME || 'CogniYard Operations', rightX, partyY + 16)
      .text(process.env.BUYER_ADDRESS || 'Main Yard & Procurement Centre', rightX, partyY + 30)
      .text(`Receiving status: ${purchaseOrder.status}`, rightX, partyY + 58);

    document.y = partyY + 92;
    const tableTop = document.y;
    const columns = [46, 82, 280, 355, 438];
    const widths = [30, 190, 66, 75, 78];
    document.rect(46, tableTop, pageWidth, 24).fill('#312e81');
    document.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    ['#', 'Item / Description', 'Quantity', 'Price / Unit', 'Line Total'].forEach((label, index) => {
      document.text(label, columns[index], tableTop + 8, { width: widths[index], align: index >= 2 ? 'right' : 'left' });
    });

    let rowY = tableTop + 24;
    invoice.items.forEach((item, index) => {
      if (rowY > 690) {
        document.addPage();
        rowY = 54;
      }
      if (index % 2 === 0) document.rect(46, rowY, pageWidth, 28).fill('#f4f4f5');
      document.fillColor('#27272a').font('Helvetica').fontSize(8);
      document.text(String(index + 1), columns[0], rowY + 9, { width: widths[0] });
      document.text(item.description || item.productName, columns[1], rowY + 9, { width: widths[1] });
      document.text(String(item.quantity), columns[2], rowY + 9, { width: widths[2], align: 'right' });
      document.text(money(item.unitPrice), columns[3], rowY + 9, { width: widths[3], align: 'right' });
      document.text(money(item.totalPrice), columns[4], rowY + 9, { width: widths[4], align: 'right' });
      rowY += 28;
    });

    rowY += 14;
    const totalsX = 335;
    const writeTotal = (label, value, bold = false) => {
      document.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9).fillColor('#27272a');
      document.text(label, totalsX, rowY, { width: 95 });
      document.text(money(value), 430, rowY, { width: 110, align: 'right' });
      rowY += bold ? 20 : 17;
    };
    writeTotal('Subtotal', invoice.subtotal);
    writeTotal(`Tax (${invoice.taxRate || 0}%)`, invoice.taxAmount);
    if (invoice.shippingAmount) writeTotal('Shipping', invoice.shippingAmount);
    document.moveTo(totalsX, rowY).lineTo(540, rowY).strokeColor('#a1a1aa').stroke();
    rowY += 8;
    writeTotal('TOTAL', invoice.totalAmount, true);

    document.y = Math.max(rowY + 20, 690);
    document.font('Helvetica').fontSize(8).fillColor('#71717a')
      .text('Generated from persisted CogniYard purchase-order and receiving data. Verify supplier submission before payment.', 46, document.y, { width: pageWidth, align: 'center' });
    document.end();
  });
}

module.exports = { generateInvoicePdf };
