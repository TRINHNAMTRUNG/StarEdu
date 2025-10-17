
import { ClassTransformer, Exclude, Expose, Type } from "class-transformer";
import { IsDate, IsDateString, IsEAN, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsUrl, Length, Matches } from "class-validator";
import { Gender } from "../models/user.model";
import { Level } from "../models/student.model";


export class UserBaseReqDto {
    @IsOptional()
    @IsString()
    @Length(6, 100)
    password!: string;

    @IsOptional()
    @IsString()
    @IsUrl()
    avatar!: string;

    @IsOptional()
    @IsString()
    name!: string;

    @IsOptional()
    @IsPhoneNumber("VN")
    phone!: string;

    @IsOptional()
    @IsString()
    address!: string;

    @IsOptional()
    @IsString()
    country!: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    date_of_birth!: Date;

    @IsOptional()
    @IsEnum(Gender)
    gender!: Gender;
}

export class UserBaseResDto {
    @Expose()
    access_token!: string;

    @Expose()
    refresh_token!: string;

    @Expose()
    avatar!: string;

    @Expose()
    name!: string;

    @Expose()
    phone!: string;

    @Expose()
    address!: string;

    @Expose()
    country!: string;

    @Expose()
    date_of_birth!: string;

    @Expose()
    gender!: Gender;
}