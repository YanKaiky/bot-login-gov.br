import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import QuotesService from "../services/QuotesService";
import { ResponseError } from "../exceptions/ResponseError";

class QuotesController {
  async getQuotes(_: Request, response: Response) {
    try {
      const quotes = await QuotesService.getQuotes();

      return response.status(200).json(quotes);
    } catch (error: any) {
      console.log(error);

      if (error instanceof ResponseError) {
        response
          .status(error.status)
          .json({ message: error });
      }

      response
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  }

  async getCrawlerQuotes(_: Request, response: Response) {
    try {
      const quotes = await QuotesService.getCrawlerQuotes();

      return response.status(200).json(quotes);
    } catch (error: any) {
      console.log(error);

      if (error instanceof ResponseError) {
        response
          .status(error.status)
          .json({ message: error });
      }

      response
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  }
}

export default new QuotesController();
