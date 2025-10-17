import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString, IsUrl, Length, Matches } from "class-validator";
import { UserBaseReqDto } from "../UserBase";
import { PickType } from "@nestjs/mapped-types";
import { Gender } from "../../models/user.model";

export class RefreshTokenReqDto {
    @IsNotEmpty()
    @IsString()
    refreshToken!: string;
}

export class LogoutReqDto {
    @IsNotEmpty()
    @IsString()
    refreshToken!: string;
}

export class LoginReqDto extends PickType(UserBaseReqDto, [
    'phone',
    'password'
]) {
    @IsNotEmpty()
    @IsString()
    @Length(6, 100)
    password!: string;

    @IsNotEmpty()
    @IsPhoneNumber("VN")
    phone!: string;
}



/**
 * --------------
 *  STUDENT APIs
 * --------------
 */

// /student/register
export class StudentRegisterReqDto extends PickType(UserBaseReqDto, [
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
    name!: string;

    @IsNotEmpty()
    @IsEnum(Gender)
    gender!: Gender;
}

// /student/verify-account
export class VerifyOtpReqDto extends PickType(UserBaseReqDto, [
    'phone'
]) {
    @IsNotEmpty()
    @IsPhoneNumber("VN")
    phone!: string;

    @IsNotEmpty()
    @IsString()
    @Length(4, 4)
    @Matches(/^\d{4}$/, { message: "Mã OTP phải gồm đúng 4 chữ số" })
    code!: string;
}


/**
 * --------------
 *  ADMIN APIs
 * --------------
 */

// /admin/ban-users
export class BanUserReqDto {
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    userIds!: string[];
}

/**
 * --------------
 *  TEACHER APIs
 * --------------
 */
