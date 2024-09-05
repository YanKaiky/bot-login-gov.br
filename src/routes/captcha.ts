import express from "express";
import CaptchaController from "../controllers/CaptchaController";

const router = express.Router();

router.get("/captcha", CaptchaController.get2Captcha);

export default router;
