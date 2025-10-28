const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    _id: { type: String },
    name: { type: String },
    lastName: { type: String },
    email: { type: String, unique: true, required: true },
    profilePic: { type: String },
    status: { type: Boolean, default: false },
    friends: { type: [String], default: [] }
});

const chatSchema = new mongoose.Schema({
    members: { type: [String], default: [] },
    lastMessage: { text: { type: String, }, senderId: { type: String, }, },
})

module.exports = mongoose.model("User", userSchema);
module.exports = mongoose.model("Chat", chatSchema);