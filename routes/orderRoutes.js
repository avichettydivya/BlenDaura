import express from "express";
import mongoose from "mongoose";
import Order from "../models/order.js";
import Product from "../models/Product.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   USER — CREATE ORDER
========================= */
router.post("/", protect, async (req, res) => {
  try {
    const { items, paymentMode, shippingDetails } = req.body;

    // 🔒 BASIC VALIDATION
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (
      !shippingDetails ||
      !shippingDetails.name ||
      !shippingDetails.email ||
      !shippingDetails.phone ||
      !shippingDetails.address
    ) {
      return res.status(400).json({ message: "Shipping details required" });
    }

    // 📧 EMAIL VALIDATION (STRONG)
const email = shippingDetails.email?.trim();

const emailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

if (!email) {
  return res.status(400).json({ message: "Email is required" });
}

if (!emailRegex.test(email)) {
  return res.status(400).json({ message: "Invalid email address" });
}


    // 📞 PHONE VALIDATION
    if (!/^[0-9]{10}$/.test(shippingDetails.phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    let calculatedTotal = 0;
    const verifiedItems = [];

    // 🔒 VERIFY PRODUCTS + CALCULATE TOTAL + CHECK STOCK
    for (let item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({ message: "Product not found" });
      }

      if (product.stock < item.qty) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }

      // Calculate backend total
      calculatedTotal += product.price * item.qty;

      // Reduce stock
      product.stock -= item.qty;
      await product.save();

      verifiedItems.push({
        product: product._id,
        qty: item.qty,
        price: product.price,
      });
    }

    // 🧾 CREATE ORDER
    const order = await Order.create({
      user: req.user.id,
      items: verifiedItems,
      total: calculatedTotal,
      paymentMethod: paymentMode || "UPI",
      shippingDetails,
      paymentStatus: "pending",
      status: "pending",
    });

    res.status(201).json(order);
  } catch (err) {
    console.error("ORDER CREATE ERROR:", err);
    res.status(500).json({ message: "Order creation failed" });
  }
});

/* =========================
   USER — SUBMIT UTR
========================= */
router.put("/:id/utr", protect, async (req, res) => {
  try {
    const { utr } = req.body;

    if (!utr) {
      return res.status(400).json({ message: "UTR is required" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 🔒 Ownership Check
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    order.utr = utr;
    order.paymentStatus = "verification_pending";

    await order.save();

    res.json({ message: "Payment details submitted successfully" });
  } catch (err) {
    console.error("UTR SAVE ERROR:", err);
    res.status(500).json({ message: "Failed to save UTR" });
  }
});

/* =========================
   USER — GET OWN ORDERS
========================= */
router.get("/", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* =========================
   ADMIN — GET ALL ORDERS
========================= */
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "email")
      .populate("items.product", "name")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* =========================
   ADMIN — UPDATE STATUS
========================= */
router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    order.status = req.body.status;
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
});

/* =========================
   ADMIN — MARK PAID
========================= */
router.put("/:id/mark-paid", protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    order.paymentStatus = "paid";
    order.status = "processing";
    order.paymentRef = req.body.paymentRef || "UPI-MANUAL";

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Mark paid failed" });
  }
});

export default router;
