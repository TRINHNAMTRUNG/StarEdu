

import mongoose from "mongoose";
import { ENV } from "./environment";

const dbState = new Map<number, string>(
    [
        [0, "disconnected"],
        [1, "connected"],
        [2, "connecting"],
        [3, "disconnecting"],
        [99, "uninitialized"]
    ]
);


const connectToDatabase = async () => {
    try {
        await mongoose.connect(ENV.DB_URI, { dbName: ENV.DB_NAME });
        console.log("Connection status: ", dbState.get(mongoose.connection.readyState));
    } catch (error) {
        console.error("Error connecting to the database:", error);
        process.exit(1);
    }
}

export default connectToDatabase;
