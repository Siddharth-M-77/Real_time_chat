import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profile: {
      type: String,
      default:
        "https://res.cloudinary.com/dh2t8zj8n/image/upload/v1690008000/DefaultProfile_1_pq7m9p.jpg",
    },
  },
  { timeStamps: true }
);

const UserModel = mongoose.model("UserModel", userSchema);
export default UserModel;
