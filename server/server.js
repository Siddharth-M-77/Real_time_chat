import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";
import connectDB from "./DB/db.js";
import userRoute from "./routes/user.route.js";
import messageRoute from "./routes/message.route.js";
import Message from "./models/messages.model.js";

connectDB();

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 9000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/users", userRoute);
app.use("/message", messageRoute);

// 📨 Fetch all messages
app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

io.on("connection", (socket) => {
  console.log("🟢 User Connected:", socket.id);

  // ✅ User joins with their userId
  socket.on("join", (userId) => {
    socket.join(userId);
  });
  socket.on("typing", ({ senderId, receiverId, isTyping }) => {
    // sirf receiver ko emit kare
    socket.to(receiverId).emit("typing", { senderId, isTyping });
  });

  // ✅ Send message
  socket.on("sendMessage", async (data) => {
    console.log("📩 Message Received:", data);

    try {
      const newMessage = new Message({
        senderId: data.senderId,
        receiverId: data.receiverId,
        message: data.message,
      });
      await newMessage.save();

      // ✅ Send only to sender + receiver
      io.to(data.receiverId).emit("receiveMessage", newMessage);
      io.to(data.senderId).emit("receiveMessage", newMessage);
    } catch (error) {
      console.error("❌ Error saving message:", error);
    }
  });

  // 🔴 User disconnect
  socket.on("disconnect", () => {
    console.log("🔴 User Disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port: ${PORT}`);
});
