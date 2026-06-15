import mongoose from "mongoose";

const SpotSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, unique: true }, // e.g., A1, B2
    location: { type: String, required: true }, // General location string
    floor: { type: String, required: true, default: '1' }, // Floor 1, Floor 2
    vehicleType: { type: String, enum: ['car', 'bike', 'ev'], default: 'car' },
    isEVChargingStation: { type: Boolean, default: false },
    evChargePerHour: { type: Number, default: 0 },
    pricePerHour: { type: Number, required: true },
    status: {
      type: String,
      enum: ['available', 'maintenance', 'reserved'],
      default: 'available',
    },
  },
  { timestamps: true },
);

export default mongoose.models.Spot || mongoose.model("Spot", SpotSchema);
