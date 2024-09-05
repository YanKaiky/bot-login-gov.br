import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import AmericanaService from "../services/AmericanaService";
import chalk from "chalk";
import { ResponseError } from "../exceptions/ResponseError";

class AmericanaController {
  async getData(request: Request, response: Response) {
    try {
      const data = await AmericanaService.getData();


      return response.status(200).json(data);
    } catch (error: any) {
      console.log(chalk.red(error.message));

      if (error instanceof ResponseError) {
        return response
          .status(error.status)
          .json({ errors: {message: error.message} });
      }

      return response
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ errors: {message: error.message} });
    }
  }

}

export default new AmericanaController();
