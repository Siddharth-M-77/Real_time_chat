import express from "express";
import {
  getOtherUser,
  userLogin,
  userRegister,
} from "../controller/user.controller.js";
import { IsAuthenticated } from "../middlewares/IsAuthenticated.js";

const router = express.Router();

router.route("/register").post(userRegister);
router.route("/login").post(userLogin);
router.route("/get-other-users").get(IsAuthenticated, getOtherUser);
export default router;
