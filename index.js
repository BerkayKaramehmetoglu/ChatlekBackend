require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());
const port = process.env.PORT;
const client = new MongoClient(process.env.MONGO_URI);

const tempCodes = new Set()

async function startServer() {
  try {
    await client.connect();

    app.post('/friends/create', async (req, res) => {
      const { code } = req.body;
      tempCodes.add(code);
      res.json({ success: true, message: "Code created." });
    })

    app.post('/friends/use', async (req, res) => {
      const { code } = req.body

      if (!tempCodes.has(code)) {
        return res.status(404).json({ success: false, message: "There is no such Friendship Code." });
      }

      //burada mongodb işlemleri yapılacak
      res.json({ success: true, message: "Friends Code is correct." });
      tempCodes.delete(code);
    })

    app.listen(port, () => {
      console.log(`http://localhost:${port}`);
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

startServer();