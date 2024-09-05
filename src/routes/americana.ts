import express from "express";
import AmericanaController from "../controllers/AmericanaController";

const router = express.Router();

router.get("/americana", AmericanaController.getData);

export default router;