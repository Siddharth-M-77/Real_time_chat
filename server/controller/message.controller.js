import ConversationModel from "../models/conversation.model.js";
import Message from "../models/messages.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

//

//   try {
//     const receiverId = req.params.id;
//     const senderId = req.user._id;
//     const { message } = req.body;

//     if (!message) {
//       return res.status(400).json({ message: "Message content is required." });
//     }

//     // check existing conversation
//     let conversation = await ConversationModel.findOne({
//       participants: { $all: [senderId, receiverId] },
//     });

//     // if no conversation, create new
//     if (!conversation) {
//       conversation = new ConversationModel({
//         participants: [senderId, receiverId],
//         messages: [],
//       });
//     }

//     // create new message
//     const messageData = await Message.create({
//       senderId,
//       receiverId,
//       message,
//     });

//     // ✅ add message reference into conversation
//     if (messageData) {
//       conversation.messages.push(messageData._id);
//       await conversation.save();
//     }

//     res.status(200).json({
//       success: true,
//       message: "Message sent successfully.",
//       data: messageData,
//       conversation,
//     });
//   } catch (error) {
//     console.error("Error sending message:", error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };

// controller/message.controller.js
export const getMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const otherId = req.params.id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await ConversationModel.find({
      participants: userId,
    })
      .populate("participants", "fullname profile email")
      .populate("messages");
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const receiverId = req.params.id; // frontend se ayega
    const senderId = req.user._id; // login user
    const { message } = req.body; // text message

    let msgType = "text";
    let msgContent = message;
    let fileName = null;

    // ✅ Agar file bheji gayi hai to Cloudinary pe upload karo
    if (req.file) {
      const uploadedUrl = await uploadToCloudinary(req.file);
      msgType = "file";
      msgContent = uploadedUrl;
      fileName = req.file.originalname;
    }

    // ✅ Conversation find ya create karo
    let conversation = await ConversationModel.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = new ConversationModel({
        participants: [senderId, receiverId],
        messages: [],
      });
    }

    // ✅ Message create
    const newMessage = await Message.create({
      senderId,
      receiverId,
      message: msgContent,
      type: msgType,
      fileName,
    });

    conversation.messages.push(newMessage._id);
    await conversation.save();

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
      conversation,
    });
  } catch (error) {
    console.error("❌ Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
