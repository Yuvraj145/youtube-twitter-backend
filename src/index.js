// require('dotenv').config({path:'./env'});
import dotenv from "dotenv";
import connectDB from "./db/database.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

const port = process.env.PORT || 7000;
connectDB()
  .then(() => {
    // app.on("error", (error) => {
    //   console.log("Error", error);
    //   throw error;
    // });
    app.listen(port, () => {
      console.log(`server is running at ${port}`);
    });
  })
  .catch((err) => {
    console.log("mongodb connection failed", err);
  });
