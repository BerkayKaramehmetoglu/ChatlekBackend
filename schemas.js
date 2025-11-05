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
    lastMessage: { lastMessage: { type: String, }, senderId: { type: String, }, },
})

const User = mongoose.model("User", userSchema);
const Chat = mongoose.model("Chat", chatSchema);

module.exports = { User, Chat };