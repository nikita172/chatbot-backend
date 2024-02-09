const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  brandName: {
    type: String,
    required: true
  },
  productType: {
    type: String,
    required: true
  },
  aboutProductShort: {
    type: String,
    required: true
  },
  mrp: {
    type: Number,
    require: true,
  },
  img: {
    type: String,
    required: true
  },
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);