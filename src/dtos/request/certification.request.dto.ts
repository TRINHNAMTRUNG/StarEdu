import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length } from "class-validator";
import { CertificationType } from "../../models/certification.model";

// POST /admin/certifications
export class CreateCertificationReqDto {
    @IsNotEmpty()
    @IsString()
    @Length(1, 200)
    name!: string;

    @IsNotEmpty()
    @IsEnum(CertificationType)
    type!: CertificationType;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsString()
    issuer!: string;

    @IsOptional()
    @IsNumber()
    validityPeriod?: number;

    @IsOptional()
    @IsNumber()
    passingScore?: number;
}

// PATCH /admin/certifications/:id
export class UpdateCertificationReqDto {
    @IsOptional()
    @IsString()
    @Length(1, 200)
    name?: string;

    @IsOptional()
    @IsEnum(CertificationType)
    type?: CertificationType;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    issuer?: string;

    @IsOptional()
    @IsNumber()
    validityPeriod?: number;

    @IsOptional()
    @IsNumber()
    passingScore?: number;
}

// DELETE /admin/certifications/:id
export class CertificationIdParamDto {
    @IsMongoId()
    id!: string;
}
