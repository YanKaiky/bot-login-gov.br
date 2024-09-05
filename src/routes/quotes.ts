import express from "express";
import QuotesController from "../controllers/QuotesController";

const router = express.Router();

router.get("/quotes", QuotesController.getQuotes);

router.get("/bank-quotes", QuotesController.getCrawlerQuotes);

export default router;
