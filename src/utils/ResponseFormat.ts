import { de } from "zod/v4/locales";
import AppError, { ErrorDetailType, InternalServerError, ValidationError } from "./AppError";

export interface IResponseFormat<T = any> {
    message: string;
    statusCode: number;
    data?: T;
    error?: {
        code: string;
        details?: ErrorDetailType[];
        stackInfo?: string;
    };
    meta?: {
        timestamp: Date;
        requestId?: string;
        version?: string;
    };
}


class ResponseFormat {

    static errorResponse<T>(
        message: string,
        statusCode: number,
        errorCode: string,
        errorDerails?: ErrorDetailType[],
        stackInfo?: string,
        requestId?: string
    ): IResponseFormat<T> {
        return {
            message,
            statusCode,
            error: {
                code: errorCode,
                details: errorDerails,
                stackInfo
            },
            meta: {
                timestamp: new Date(),
                requestId,
                version: process.env.API_VERSION || "1.0.0"
            }
        };
    }

    static fromAppError(error: AppError): IResponseFormat {
        return this.errorResponse(
            error.message,
            error.statusCode,
            error.errorCode,
            error instanceof ValidationError ? error.errorDetails : undefined,
            error instanceof InternalServerError ? error.stackInfo : undefined,
            error.requestId
        );
    }

    static successResponse<T>(
        data: T,
        message: string = "Success",
        statusCode: number = 200,
        requestId?: string
    ): IResponseFormat<T> {
        return {
            message,
            statusCode,
            data,
            meta: {
                timestamp: new Date(),
                requestId,
                version: process.env.API_VERSION || "1.0.0"
            },
        };
    }
}


export default ResponseFormat;