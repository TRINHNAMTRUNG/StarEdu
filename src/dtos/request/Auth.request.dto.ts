import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString, IsUrl, Length, Matches, MaxLength } from "class-validator";
import { UserBaseReqDto } from "../UserBase";
import { PickType } from "@nestjs/mapped-types";
import { Gender } from "../../models/user.model";

export class RefreshTokenReqDto {
    @IsNotEmpty()
    @IsString()
    refresh_token!: string;  // ✅ Đổi từ refreshToken
}

export class LogoutReqDto {
    @IsNotEmpty()
    @IsString()
    refresh_token!: string;  // ✅ Đổi từ refreshToken
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
export class StudentRegisterReqDto {
    @IsNotEmpty()
    @IsString()
    phone!: string;

    @IsNotEmpty()
    @IsString()
    password!: string;

    @IsNotEmpty()
    @IsString()
    name!: string;

    @IsNotEmpty()
    @IsEnum(Gender)
    gender!: Gender;

    // ID token returned by Firebase client after confirm(code)
    @IsNotEmpty()
    @IsString()
    firebaseIdToken!: string;
}

// /student/verify-account
export class VerifyOtpReqDto {
    @IsNotEmpty()
    @IsString()
    phone!: string;

    @IsNotEmpty()
    @IsString()
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
    @IsMongoId({ each: true })  // ✅ Thêm validate ObjectId
    @IsNotEmpty({ each: true })
    userIds!: string[];
}

// /admin/unban-users
export class UnbanUserReqDto {
    @IsArray()
    @IsMongoId({ each: true })  // ✅ Thêm validate ObjectId
    @IsNotEmpty({ each: true })
    userIds!: string[];
}

/**
 * --------------
 *  TEACHER APIs
 * --------------
 */
