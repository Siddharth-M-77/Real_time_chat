import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";

export const IsAuthenticated = async (req, res, next) => {
  try {
    const token =
      req?.headers?.authorization?.split(" ")[1] || req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "🚫 No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return res.status(401).json({ message: "❌ Invalid token." });
    }

    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "❌ User not found." });
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("IsAuthenticated error:", error);
    return res
      .status(401)
      .json({ message: "❌ Unauthorized", error: error.message });
  }
};
