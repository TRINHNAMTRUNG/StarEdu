
import express from "express";
import cors from "cors";
import { ENV } from "./environment";
import router from "../routes/index";
import { errorConverter, errorHandler, notFoundHandler, requestIdMiddleware } from "../middlewares/handleErorr.middleware";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: ENV.ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"]
}));

// Add request ID to all requests
app.use(requestIdMiddleware);

app.use("/api", router);

app.use(notFoundHandler);

app.use(errorConverter);

app.use(errorHandler);

export default app;
