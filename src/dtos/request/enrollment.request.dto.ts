import { IsMongoId, IsNotEmpty } from "class-validator";

// GET /student/enrollments
// (No body, just query params page/limit)

// GET /student/enrollments/:id
export class EnrollmentIdParamDto {
    @IsMongoId()
    id!: string;
}
