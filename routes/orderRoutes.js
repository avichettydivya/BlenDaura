import express from "express";
import Order from "../models/order.js";
import Product from "../models/Product.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   USER — CREATE ORDER
========================= */
router.post("/", protect, async (req, res) => {
  console.log("📦 ORDER BODY RECEIVED:", JSON.stringify(req.body, null, 2));

  try {
    const { items, total, paymentMode, shippingDetails } = req.body;


    // 🔒 BASIC VALIDATION
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ message: "Invalid order total" });
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

    // 📧 EMAIL CHECK
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingDetails.email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // 📞 PHONE CHECK
    if (!/^[0-9]{10}$/.test(shippingDetails.phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // 🔒 VERIFY PRODUCTS
    for (let item of items) {
      const productExists = await Product.findById(item.product);
      if (!productExists) {
        return res.status(400).json({ message: "Invalid product in cart" });
      }
    }

    const order = await Order.create({
      user: req.user.id,
      
      items,
      total,
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
router.put("/:id/utr", async (req, res) => {
  try {
    const { utr } = req.body;

    if (!utr) {
      return res.status(400).json({ message: "UTR is required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
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
  const orders = await Order.find({ user: req.user.id }).populate(
    "items.product",
    "name image price"
  );
  res.json(orders);
});

/* =========================
   ADMIN — GET ALL ORDERS
========================= */
router.get("/all", protect, adminOnly, async (req, res) => {
  const orders = await Order.find()
    .populate("user", "email")
    .populate("items.product", "name");
  res.json(orders);
});

/* =========================
   ADMIN — UPDATE STATUS
========================= */
router.put("/:id/status", protect, adminOnly, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.status = req.body.status;
  await order.save();

  res.json(order);
});

/* =========================
   ADMIN — MARK PAID
========================= */
router.put("/:id/mark-paid", protect, adminOnly, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.paymentStatus = "paid";
  order.status = "processing";
  order.paymentRef = req.body.paymentRef || "UPI-MANUAL";

  await order.save();
  res.json(order);
});

export default router;
