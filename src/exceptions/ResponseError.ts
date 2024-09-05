import { ResponseErrorInterface } from './ResponseErrorInterface';

export class ResponseError extends Error implements ResponseErrorInterface {
  constructor(public status: number, message: string){
    super(message);
  }
}