import express from "express";
import DetranController from "../controllers/DetranController";

const router = express.Router();

router.get("/detran", DetranController.getDFDetran);

export default router;
