import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],

    total: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["UPI", "COD"],
      default: "UPI",
    },

    paymentStatus: {
  type: String,
  enum: ["pending", "verification_pending", "paid"],
  default: "pending",
},


    paymentRef: {
      type: String,
    },

    shippingDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },

    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered"],
      default: "pending",
    },
    utr: {
  type: String,
  default: "",
},

  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;

