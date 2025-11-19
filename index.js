require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { User, Chat } = require("./schemas");
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

const tempCodes = new Map();
console.log("WebSocket server is running on ws://localhost:8080");
let clients = [];

async function findOrCreateUser(id, name, lastName, email, profilePic) {
  let user = await User.findById(id);
  if (!user) {
    user = new User({ _id: id, name, lastName, email, profilePic, status: false, friends: [] });
    await user.save();
  }
  return user;
}

async function updateUserStatus(userId, status) {
  try {
    await User.updateOne({ _id: userId }, { $set: { status } });
  } catch (error) {
    console.error(`Kullanıcı durumu güncellenemedi (${userId}):`, error);
  }
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
        if (!getfriends) return res.status(404).json([]);
        const friends = await User.find({ _id: { $in: getfriends.friends } }).select(" _id -friends");
        res.json(friends);
      } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
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
        if (!getUser) return res.status(404).json({ success: false, message: "User not find." });
        res.json(getUser);
      } catch (e) {
        res.status(500).json({ success: false, message: "Server error" })
      }
    })

    app.post("/create_chat", async (req, res) => {
      try {
        const { senderId, receiverId } = req.body;

        let chat = await Chat.findOne({
          members: { $all: [senderId, receiverId] }
        });

        if (chat)
          return res.json({success: true, message: "Chat Created"});

        chat = new Chat({
          members: [senderId, receiverId],
          lastMessage: { lastMessage: "", senderId: "" }
        });

        await chat.save();

        res.json(chat);

      } catch (e) {
        res.status(500).json({ success: false, message: "Server error." });
      }
    });

    app.get("/get_chat", async (req, res) => {
      try {
        const { senderId, receiverId } = req.query;

        const chat = await Chat.findOne({
          members: { $all: [senderId, receiverId] }
        });

        if (!chat) {
          return res.json({
            members: [],
            lastMessage: {
              lastMessage: "",
              senderId: ""
            }
          });
        }

        res.json(chat);

      } catch (e) {
        res.status(500).json({ success: false, message: "Server error." });
      }
    });

    app.put("/update_chat", async (req, res) => {
      try {
        const { senderId, receiverId, lastMessage } = req.body;

        const chat = await Chat.findOne({
          members: { $all: [senderId, receiverId] }
        });

        if (!chat)
          return res.status(404).json({ success: false, message: "Chat not found" });

        chat.lastMessage = {
          lastMessage,
          senderId
        };

        await chat.save();
        res.json(chat);

      } catch (e) {
        console.log(e);
        res.status(500).json({ success: false, message: "Server error." });
      }
    });

    app.listen(port, () => {
      console.log(`Server running → http://localhost:${port}`);
    });

  } catch (err) {
    console.error("Server başlatılırken hata:", err);
    process.exit(1);
  }
}

wss.on("connection", (ws) => {
  const clientInfo = { id: null, ws };
  clients.push(clientInfo);

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (!clientInfo.id) {
        clientInfo.id = msg.id;
        await updateUserStatus(msg.id, true);
      }
      clients.forEach((client) => {
        if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            id: msg.id,
            message: msg.message
          }));
        }
      });
    } catch (err) {
      console.error("JSON parse error:", err);
    }
  });

  ws.on("close", async () => {
    if (clientInfo.id) {
      await updateUserStatus(clientInfo.id, false);
    }
    clients = clients.filter((c) => c.ws !== ws);
  });
});

startServer();