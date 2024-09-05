import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import CaptchaService from "../services/CaptchaService";
import { ResponseError } from "../exceptions/ResponseError";

class CaptchaController {
  async get2Captcha(_: Request, response: Response) {
    try {
      const quotes = await CaptchaService.get2Captcha();

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

export default new CaptchaController();
