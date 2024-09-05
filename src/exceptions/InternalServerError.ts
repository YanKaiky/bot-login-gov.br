import { StatusCodes } from 'http-status-codes';
import { ResponseError } from './ResponseError';

export class InternalServerError extends ResponseError {
  constructor(message: string){
    super(StatusCodes.INTERNAL_SERVER_ERROR, message);
  }
}