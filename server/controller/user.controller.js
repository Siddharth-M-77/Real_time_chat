import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

export const userRegister = async (req, res) => {
  const { username, email, password, profile } = req.body;
  try {
    const existingUser = await UserModel.findOne({
      email: email,
    });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const photo = "https://avatar.iran.liara.run/public/boy";
    const newUser = new UserModel({
      username,
      email,
      password,
      profile: photo,
    });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const userLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    // ✅ bcrypt password compare
    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }
    // ✅ JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // ✅ Cookie set
    res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // only on HTTPS
        sameSite: "strict",
        maxAge: 3600000, // 1 hour
      })
      .json({
        message: "Login successful",
        user,
        token,
        success: true,
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const userLogout = (req, res) => {
  return res
    .status(200)
    .cookie("token", "", { maxage: 0 })
    .json({ message: "Logout successful" });
};

export const getOtherUser = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    if (!loggedInUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const otherUsers = await UserModel.find({
      _id: { $ne: loggedInUserId },
    }).select("-password -email");
    res.status(200).json(otherUsers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
