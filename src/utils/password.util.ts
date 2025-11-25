import bcrypt from "bcrypt";

export const encryptPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    return encryptedPassword;
}