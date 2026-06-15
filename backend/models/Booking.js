import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    spot: { type: mongoose.Schema.Types.ObjectId, ref: "Spot", required: true },
    vehicleNumber: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    totalCost: { type: Number, required: true },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    razorpayPaymentId: { type: String },
    razorpayOrderId: { type: String },
    qrCode: { type: String },
  },
  { timestamps: true },
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
