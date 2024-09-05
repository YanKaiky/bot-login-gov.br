import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import DetranService from "../services/DetranService";
import { ResponseError } from "../exceptions/ResponseError";

class DetranController {
  async getDFDetran(_: Request, response: Response) {
    try {
      const quotes = await DetranService.getDFDetran();

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

export default new DetranController();
