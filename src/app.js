import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes import
import userRoutes from "./routes/userRoutes.js";
import healthcheckRouter from "./routes/healthCheckRoutes.js";
import tweetRouter from "./routes/tweetRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";
import videoRouter from "./routes/videoRoutes.js";
import commentRouter from "./routes/commentRoutes.js";
import likeRouter from "./routes/likeRoutes.js";
import playlistRouter from "./routes/playlistRoutes.js";
import dashboardRouter from "./routes/dashboardRoutes.js";

app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/users", userRoutes);

export { app };
