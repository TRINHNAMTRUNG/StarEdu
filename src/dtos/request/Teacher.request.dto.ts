import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString, IsUrl, Length, Matches } from "class-validator";
import { UserBaseReqDto } from "../UserBase";
import { PickType } from "@nestjs/mapped-types";
import { Gender } from "../../models/user.model";
import { Type } from "class-transformer";
import { EmploymentStatus } from "../../models/teacher.model";

// /admin/teachers
export class QualificationDto {
    @IsNotEmpty()
    @IsString()
    degree!: string;

    @IsNotEmpty()
    @IsString()
    major!: string;

    @IsNotEmpty()
    @IsString()
    institution!: string;

    @IsNotEmpty()
    issueDate!: Date;
}

export class CreateTeacherReqDto extends PickType(UserBaseReqDto, [
    'avatar',
    'password',
    'phone',
    'name',
    'gender',
] as const) {
    @IsNotEmpty()
    @IsString()
    @Length(6, 100)
    password!: string;

    @IsNotEmpty()
    @IsPhoneNumber("VN")
    phone!: string;

    @IsNotEmpty()
    @IsString()
    @Length(1, 100)
    name!: string;

    @IsNotEmpty()
    @IsEnum(Gender)
    gender!: Gender;

    @IsOptional()
    @IsNumber()
    experienceYears?: number;

    @IsOptional()
    @Type(() => QualificationDto)
    qualifications?: QualificationDto[];
}



// /admin/teachers/:id
export class IdParamDto {
    @IsMongoId({ message: "Invalid teacher id" })
    userId!: string;
}
export class UpdateTeacherByAdminReqDto {
    @IsOptional()
    @IsString()
    @Length(1, 100)
    name?: string;

    @IsOptional()
    @IsPhoneNumber("VN")
    phone?: string;

    @IsOptional()
    @IsUrl()
    avatar?: string;

    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @IsOptional()
    @IsNumber()
    experienceYears?: number;

    @IsOptional()
    @Type(() => QualificationDto)
    qualifications?: QualificationDto[];
}

// /admin/teachers/set-status
export class SetTeacherStatusReqDto {
    @IsArray()
    @IsMongoId({ each: true })
    @IsNotEmpty({ each: true })
    teacherIds!: string[];

    @IsEnum(EmploymentStatus, { message: "Trạng thái không hợp lệ" })
    @IsNotEmpty()
    status!: EmploymentStatus;
}
