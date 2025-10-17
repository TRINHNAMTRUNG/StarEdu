
// middleware/errorHandler.ts
import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import AppError, { ValidationError, InternalServerError } from "../utils/AppError";
import ResponseFormat from "../utils/ResponseFormat";
import { ErrorDetailType } from "../utils/AppError";
import { v4 as uuidv4 } from "uuid";

// Extend Request interface to include requestId
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    req.requestId = uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
};

// Error converter middleware
export const errorConverter = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let error: AppError;
    const requestId = req.requestId;

    if (err instanceof AppError) {
        // Already an AppError, just pass it through but ensure requestId
        error = err;
        if (!error.requestId) {
            error.requestId = requestId;
        }
    } else if (err instanceof mongoose.Error.ValidationError) {
        // Xử lý Mongoose validation errors
        /** Ví dụ err từ Mongoose
         * {
            "name": "ValidationError",
            "message": "User validation failed: email: Email is invalid",
            "errors": {
                "email": {
                "message": "Email is invalid",
                "name": "ValidatorError",
                "path": "email",
                "value": "abc@",
                "kind": "regexp"
                }
            }
         */
        const errorDetails: ErrorDetailType[] = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message,
            value: (e as any).value
        }));
        error = new ValidationError("Database validation failed", errorDetails, requestId);
    } else if (err instanceof mongoose.Error.CastError) {
        // Xử lý Mongoose cast errors
        error = AppError.badRequestError(
            `Invalid ${err.path}: Cannot cast ${err.value} to ${err.kind}`,
            requestId
        );
    } else if (err.code === 11000) {
        // Xử lý MongoDB duplicate key error
        const duplicatedField = Object.keys(err.keyValue)[0];
        error = AppError.conflictError(
            `${duplicatedField} already exists`,
            requestId
        );
    } else {
        // Xử lý các errors khác
        const statusCode = err.statusCode || 500;
        const message = err.message || "Something went wrong";

        if (statusCode === 500) {
            error = new InternalServerError(message, err.stack, requestId);
        } else {
            error = AppError.badRequestError(message, requestId);
        }
    }

    next(error);
};

// Error handler middleware
export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { NODE_ENV } = process.env;
    const requestId = req.requestId || err.requestId;

    // Log error in development or for operational errors in production
    if (NODE_ENV === "development") {
        console.error("🚨 Error Details:", {
            requestId,
            url: req.url,
            method: req.method,
            error: `${err.name} - ${err.message}`
        });
    } else if (!err.isOperational) {
        // Log system errors in production
        console.error("💥 System Error:", {
            requestId,
            message: err.message,
            stack: err.stack,
            url: req.url,
            method: req.method
        });
    }

    // Don't leak error details in production for system errors
    let response;
    if (NODE_ENV === "production" && !err.isOperational) {
        response = ResponseFormat.errorResponse(
            "Something went wrong",
            500,
            "INTERNAL_SERVER_ERROR",
            undefined,
            undefined,
            requestId
        );
    } else {
        response = ResponseFormat.fromAppError(err);
    }

    res.status(err.statusCode).json(response);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const error = AppError.notFoundError(
        `Route ${req.method} ${req.originalUrl} not found`,
        req.requestId
    );
    next(error);
};