import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "manager", "admin"],
      default: "customer",
    },
    photo: { type: String }, // Base64 encoded live photo
    isVerified: { type: Boolean, default: false },
    verificationOTP: { type: String },
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
