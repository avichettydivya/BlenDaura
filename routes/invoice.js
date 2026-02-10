import express from "express";
import Order from "../models/order.js";
import PDFDocument from "pdfkit";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

router.get("/:id", protect, adminOnly, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("items.product", "name");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${order._id}.pdf`
  );
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  // 🧾 HEADER
  doc.fontSize(20).text("BlenDaura", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text("Invoice", { align: "center" });

  doc.moveDown(2);

  // 👤 CUSTOMER
  doc.fontSize(12).text(`Name: ${order.shippingDetails.name}`);
  doc.text(`Email: ${order.shippingDetails.email}`);
  doc.text(`Phone: ${order.shippingDetails.phone}`);
  doc.text(`Address: ${order.shippingDetails.address}`);

  doc.moveDown();

  // 📦 ORDER DETAILS
  doc.text(`Order ID: ${order._id}`);
  doc.text(`Date: ${new Date(order.createdAt).toDateString()}`);
  doc.text(`Payment: ${order.paymentMethod}`);
  doc.text(`Status: ${order.paymentStatus}`);

  doc.moveDown();

  // 🛒 ITEMS
  doc.fontSize(14).text("Items");
  doc.moveDown(0.5);

  order.items.forEach((item, i) => {
    doc.fontSize(12).text(
      `${i + 1}. ${item.product.name} × ${item.qty} — ₹${item.price}`
    );
  });

  doc.moveDown();

  // 💰 TOTAL
  doc.fontSize(14).text(`Total Amount: ₹${order.total}`, {
    align: "right",
  });

  doc.moveDown(2);

  doc.fontSize(10).text(
    "Thank you for shopping with BlenDaura 🎨",
    { align: "center" }
  );

  doc.end();
});

export default router;
