import { IsMongoId, IsNotEmpty, IsBoolean, IsOptional } from "class-validator";

export class MarkWordLearnedReqDto {
    @IsNotEmpty()
    @IsMongoId()
    set_id!: string;

    @IsNotEmpty()
    @IsMongoId()
    word_id!: string;

    @IsOptional()
    @IsBoolean()
    recorded?: boolean;
}

export class GetProgressReqDto {
    @IsNotEmpty()
    @IsMongoId()
    set_id!: string;
}
