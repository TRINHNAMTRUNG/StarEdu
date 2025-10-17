// import { de } from "zod/v4/locales";

import { ta } from "zod/v4/locales";

// export interface ErrorDetailType {
//     field: string,
//     message: string,
//     value: any,
// }

// abstract class AppError extends Error {
//     public readonly statusCode: number;
//     public readonly errorCode: string;
//     public readonly isOperational: boolean;
//     constructor(message: string, statusCode: number, errorCode: string, isOperational: boolean) {
//         super(message);
//         this.statusCode = statusCode;
//         this.errorCode = errorCode;
//         this.isOperational = isOperational;
//         Object.setPrototypeOf(this, new.target.prototype);
//         Error.captureStackTrace(this, this.constructor);
//     }
// }

// export class LogicError extends AppError {
//     constructor(message: string, statusCode: number, errorCode: string) {
//         super(message, statusCode, errorCode, true);
//     }
// }

// export class ValidateError extends AppError {
//     public readonly errorDetails: ErrorDetailType[];
//     constructor(message: string, statusCode: number, errorCode: string, errorDetails: ErrorDetailType[]) {
//         super(message, statusCode, errorCode, true);
//         this.errorDetails = errorDetails;
//     }
// }

// export class SystemError extends AppError {
//     public readonly stackInfo?: string;
//     constructor(message: string, statusCode: number, errorCode: string, stackInfo?: string) {
//         super(message, statusCode, errorCode, true);
//         this.stackInfo = stackInfo;
//     }
// }

// export default AppError;
import httpStatus from "http-status";
export interface ErrorDetailType {
    field: string;
    value: any;
    message: string;
}

export interface IAppError {
    message: string;
    statusCode: number;
    errorCode: string;
    isOperational: boolean;
    errorDetails?: ErrorDetailType[];
    stackInfo?: string;
    timestamp?: string;
    requestId?: string;
}

abstract class AppError extends Error {
    constructor(
        public readonly message: string,
        public readonly statusCode: number,
        public readonly errorCode: string,
        public readonly isOperational: boolean,
        public requestId?: string,
        public readonly timestamp: Date = new Date()
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    };

    static badRequestError(message: string, requestId?: string): BadRequestError {
        return new BadRequestError(message, requestId);
    }

    static unauthorizedError(message: string, requestId?: string): UnauthorizedError {
        return new UnauthorizedError(message, requestId);
    }
    static forbiddenError(message: string, requestId?: string): ForbiddenError {
        return new ForbiddenError(message, requestId);
    }
    static notFoundError(message: string, requestId?: string): NotFoundError {
        return new NotFoundError(message, requestId);
    }
    static conflictError(message: string, requestId?: string): ConflictError {
        return new ConflictError(message, requestId);
    }
    static validationError(message: string, errorDetails: ErrorDetailType[], requestId?: string): ValidationError {
        return new ValidationError(message, errorDetails, requestId);
    }
    static internalServerError(message: string, stackInfo?: string, requestId?: string): InternalServerError {
        return new InternalServerError(message, stackInfo, requestId);
    }

    setRequestId(requestId: string) {
        this.requestId = requestId;
    }

    toJson(): IAppError {
        return {
            message: this.message,
            statusCode: this.statusCode,
            errorCode: this.errorCode,
            isOperational: this.isOperational,
            requestId: this.requestId,
            timestamp: this.timestamp.toISOString(),
        };
    }
}

export class BadRequestError extends AppError {
    constructor(
        message: string,
        requestId?: string
    ) {
        super(
            message,
            400,
            httpStatus["400_NAME"],
            true,
            requestId
        );
    }
}

export class UnauthorizedError extends AppError {
    constructor(
        message: string,
        requestId?: string
    ) {
        super(
            message,
            401,
            httpStatus["401_NAME"],
            true,
            requestId
        )
    }
}

export class ForbiddenError extends AppError {
    constructor(
        message: string,
        requestId?: string
    ) {
        super(
            message,
            403,
            httpStatus["403_NAME"],
            true,
            requestId
        )
    }
}

export class NotFoundError extends AppError {
    constructor(
        message: string,
        requestId?: string
    ) {
        super(
            message,
            404,
            httpStatus["404_NAME"],
            true,
            requestId
        )
    }
}

export class ConflictError extends AppError {
    constructor(
        message: string,
        requestId?: string
    ) {
        super(
            message,
            409,
            httpStatus["409_NAME"],
            true,
            requestId
        )
    }
}

export class ValidationError extends AppError {
    public readonly errorDetails: ErrorDetailType[];
    constructor(
        message: string,
        errorDetails: ErrorDetailType[],
        requestId?: string
    ) {
        super(
            message,
            422,
            httpStatus["422_NAME"],
            true,
            requestId
        );
        this.errorDetails = errorDetails;
    }
    toJson(): IAppError {
        return {
            ...super.toJson(),
            errorDetails: this.errorDetails
        }
    }
}

export class InternalServerError extends AppError {
    public readonly stackInfo?: string;
    constructor(
        message: string,
        stackInfo?: string,
        requestId?: string
    ) {
        super(
            message,
            500,
            httpStatus["500_NAME"],
            false,
            requestId
        );
        this.stackInfo = stackInfo;
    }

    toJson(): IAppError {
        return {
            ...super.toJson(),
            stackInfo: this.stackInfo
        }
    }
}


export default AppError;