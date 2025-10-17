
import { validate, ValidationError } from "class-validator";
import { NextFunction, Request, Response } from "express";
import AppError, { ErrorDetailType } from "../utils/AppError";
import { plainToInstance } from "class-transformer";

enum ValidatorType {
    BODY = "Body",
    QUERY = "Query",
    PARAMS = "Params"
}

const validateCore = (DTOClass: new () => any, validatorType: ValidatorType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            let dataSource: any;
            switch (validatorType) {
                case ValidatorType.BODY:
                    dataSource = req.body;
                    break;
                case ValidatorType.QUERY:
                    dataSource = req.query;
                    break;
                case ValidatorType.PARAMS:
                    dataSource = req.params;
                    break;
                default:
                    throw new Error("Invalid validator type");
            }

            if (!dataSource || Object.values(dataSource).length === 0) {
                throw AppError.badRequestError(
                    `${validatorType} data is empty`,
                    req.requestId
                );
            }

            const instanceDTO = plainToInstance(DTOClass, dataSource, {
                enableImplicitConversion: true
            });

            const errors = await validate(instanceDTO, { whitelist: true });

            if (errors.length > 0) {
                throw AppError.validationError(
                    "Validation failed",
                    formatErrorDetails(errors),
                    req.requestId,
                );
            }

            // Gán lại DTO đã validate vào đúng vị trí
            switch (validatorType) {
                case ValidatorType.BODY:
                    req.body = instanceDTO;
                    break;
                case ValidatorType.QUERY:
                    req.query = instanceDTO;
                    break;
                case ValidatorType.PARAMS:
                    req.params = instanceDTO;
                    break;
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};

export const log = (req: Request, res: Response, next: NextFunction) => {
    console.log("Request Body:", req.body);
    next();
}

export const validationBody = (DTOClass: new () => any) => {
    return validateCore(DTOClass, ValidatorType.BODY);
};

export const validationQuery = (DTOClass: new () => any) => {
    return validateCore(DTOClass, ValidatorType.QUERY);
};

export const validationParams = (DTOClass: new () => any) => {
    return validateCore(DTOClass, ValidatorType.PARAMS);
};

// Format lỗi để trả về đúng field dạng: "user.profile.phone.number"
const formatErrorDetails = (
    errors: ValidationError[],
    parentPath = ""
): ErrorDetailType[] => {
    return errors.flatMap((error) => {
        const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;

        if (error.constraints) {
            return Object.values(error.constraints).map((message) => ({
                field: currentPath,
                message,
                value: error.value,
            }));
        }

        if (error.children && error.children.length > 0) {
            return formatErrorDetails(error.children, currentPath);
        }

        return [];
    });
};
