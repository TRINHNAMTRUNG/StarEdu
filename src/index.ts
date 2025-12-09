import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();
import { ENV } from "./config/environment";
import app from "./config/app";
import connectToDatabase from "./config/database";

// Render sets PORT automatically, fallback to ENV.PORT
const PORT = process.env.PORT || ENV.PORT || 3090;

app.listen(PORT, async () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    await connectToDatabase();
});
