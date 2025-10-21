require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const User = require("./schemas");

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

const tempCodes = new Map();

async function findOrCreateUser(id, name, lastName, email, profilePic) {
  let user = await User.findById(id);
  if (!user) {
    user = new User({ _id: id, name, lastName, email, profilePic, status: false, friends: [] });
    await user.save();
  }
  return user;
}

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    app.post('/friends/create', async (req, res) => {
      try {
        const { code, id } = req.body;
        tempCodes.set(code, { id, code });
        res.json({ success: true, message: "The code completed successfully." });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "The code could not be generated." });
      }
    });

    app.post('/friends/use', async (req, res) => {
      try {
        const { code, id } = req.body;
        const codeData = tempCodes.get(code);
        console.log(codeData)

        if (!codeData)
          return res.status(404).json({ success: false, message: "There is no such Friends Code." });

        const { id: friendId } = codeData;
        if (id === friendId)
          return res.status(400).json({ success: false, message: "You cannot add yourself." });

        const user = await User.findById(id);
        if (user.friends.includes(friendId))
          return res.status(400).json({ success: false, message: "You are already friends." });

        await Promise.all([
          User.updateOne({ _id: id }, { $addToSet: { friends: friendId } }),
          User.updateOne({ _id: friendId }, { $addToSet: { friends: id } })
        ]);

        tempCodes.delete(code);
        res.json({ success: true, message: "Added as friend." });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "An error occurred while adding a friend." });
      }
    });

    app.get("/get_friends/:id", async (req, res) => {
      try {
        const getfriends = await User.findById(req.params.id).select("-_id friends");
        if (!getfriends) return res.status(404).json({ message: "User not find." });
        const friends = await User.find({ _id: { $in: getfriends.friends } }).select(" -_id -friends");
        res.json(friends);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

    app.post("/create_user", async (req, res) => {
      try {
        const { id, name, lastName, email, picURL } = req.body;
        if (!name || !lastName) {
          return res.status(404).json({ success: false, message: "Name & Last Name can't be empty." });
        }
        await findOrCreateUser(id, name, lastName, email, picURL);
        res.json({ success: true, message: "User created" });
      } catch (e) {
        res.status(500).json({ success: false, message: "Server error" });
      }
    })

    app.post("/update_user", async (req, res) => {
      try {
        const { id, name, lastName, picURL } = req.body
        const filter = { _id: id };
        const update = { name: name, lastName: lastName, profilePic: picURL };
        await User.findOneAndUpdate(filter, update);
        res.json({ success: true, message: "User updated." });
      } catch (e) {
        res.status(500).json({ success: false, message: "Server error" });
      }
    })

    app.get("/get_user/:id", async (req, res) => {
      try {
        const getUser = await User.findById(req.params.id);
        if (!getUser) return res.status(404).json({ message: "User not find." });
        res.json(getUser);
      } catch (e) {
        res.status(500).json({ success: false, message: "Server error" })
      }
    })

    app.listen(port, () => {
      console.log(`Server running → http://localhost:${port}`);
    });

  } catch (err) {
    console.error("Server başlatılırken hata:", err);
    process.exit(1);
  }
}

startServer();