import { StatusCodes } from 'http-status-codes';
import { ResponseError } from './ResponseError';

export class InvalidCredentialsError extends ResponseError {
  constructor(message?: string){
    super(StatusCodes.BAD_REQUEST, message || 'Invalid credentials.');
  }
}