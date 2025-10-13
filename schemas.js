const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    _id: { type: String},
    email: { type: String, unique: true, required: true },
    status: { type: Boolean, default: false },
    friends: { type: [String], default: [] }
});

module.exports = mongoose.model("User", userSchema);