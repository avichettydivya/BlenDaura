import express from "express";
import Product from "../models/Product.js";
import { protect, adminOnly } from "../middleware/auth.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });



/* =======================
   GET ALL PRODUCTS (PUBLIC)
   + CATEGORY FILTER
======================= */
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;

    const filter = category
      ? { category: new RegExp(`^${category}$`, "i") }
      : {};

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/* =======================
   GET SINGLE PRODUCT (PUBLIC)
======================= */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

/* =======================
   ADD PRODUCT (ADMIN)
======================= */
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, price, description, category } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "products",
      });

      fs.unlinkSync(req.file.path);

      const product = await Product.create({
        name,
        price,
        description,
        category,
        image: {
          public_id: result.public_id,
          url: result.secure_url,
        },
      });

      res.status(201).json(product);
    } catch (err) {
      console.error("ADD PRODUCT ERROR:", err);
      res.status(500).json({ message: "Product creation failed" });
    }
  }
);


/* =======================
   DELETE PRODUCT (ADMIN)
======================= */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.deleteOne();
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

export default router;


