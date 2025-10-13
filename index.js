require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const User = require("./schemas");

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

const tempCodes = new Map();

async function findOrCreateUser(userId, email) {
  let user = await User.findById(userId);
  if (!user) {
    user = new User({ _id: userId, email, status: false, friends: [] });
    await user.save();
  }
  return user;
}

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    app.post('/friends/create', async (req, res) => {
      try {
        const { code, userId, email } = req.body;
        await findOrCreateUser(userId, email);
        tempCodes.set(code, { userId, email, code });

        res.json({ success: true, message: "The code completed successfully." });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "The code could not be generated." });
      }
    });

    app.post('/friends/use', async (req, res) => {
      try {
        const { code, userId, email } = req.body;
        await findOrCreateUser(userId, email);

        const codeData = tempCodes.get(code);
        if (!codeData)
          return res.status(404).json({ success: false, message: "There is no such Friends Code." });

        const { userId: friendId } = codeData;
        if (userId === friendId)
          return res.status(400).json({ success: false, message: "You cannot add yourself." });

        const user = await User.findById(userId);
        if (user.friends.includes(friendId))
          return res.status(400).json({ success: false, message: "You are already friends." });

        await Promise.all([
          User.updateOne({ _id: userId }, { $addToSet: { friends: friendId } }),
          User.updateOne({ _id: friendId }, { $addToSet: { friends: userId } })
        ]);

        tempCodes.delete(code);
        res.json({ success: true, message: "Added as friend." });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "An error occurred while adding a friend." });
      }
    });

    app.listen(port, () => {
      console.log(`Server çalışıyor → http://localhost:${port}`);
    });

  } catch (err) {
    console.error("Server başlatılırken hata:", err);
    process.exit(1);
  }
}

startServer();