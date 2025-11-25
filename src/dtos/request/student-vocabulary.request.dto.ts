import { IsMongoId, IsNotEmpty } from "class-validator";

export class CourseIdQueryDto {
    @IsNotEmpty()
    @IsMongoId()
    course_id!: string;
}

export class SetIdParamDto {
    @IsMongoId()
    setId!: string;
}
