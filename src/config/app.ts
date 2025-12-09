
import express from "express";
import cors from "cors";
import { ENV } from "./environment";
import router from "../routes/index";
import { errorConverter, errorHandler, notFoundHandler, requestIdMiddleware } from "../middlewares/handleErorr.middleware";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration: Allow all origins in development, specific origin in production
app.use(cors({
    origin: ENV.NODE_ENV === 'development' ? true : ENV.ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"]
}));

// Add request ID to all requests
app.use(requestIdMiddleware);

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.use("/api", router);

app.use(notFoundHandler);

app.use(errorConverter);

app.use(errorHandler);

export default app;
