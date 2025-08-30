import express from "express";
import {
  getConversations,
  getMessages,
  sendMessage,
} from "../controller/message.controller.js";
import { IsAuthenticated } from "../middlewares/IsAuthenticated.js";
import upload from "../utils/multer.js";

const router = express.Router();

router.post("/send/:id", IsAuthenticated, upload.single("file"), sendMessage);
router.route("/:id").get(IsAuthenticated, getMessages);
router.route("/conversations").get(IsAuthenticated, getConversations);

export default router;
