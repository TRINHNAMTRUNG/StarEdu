import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();
import { ENV } from "./config/environment";
import app from "./config/app";
import connectToDatabase from "./config/database";



app.listen(ENV.PORT, async () => {
    console.log(`Server is running on port ${ENV.PORT}`);
    await connectToDatabase();
});
