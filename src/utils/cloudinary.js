import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    //upload to file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //file uploaded
    // console.log("file is uploaded on cloudinary ", response);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteOnCloudinary = async (public_id, resource_type = "image") => {
  try {
    if (!public_id) return null;
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: `${resource_type}`,
    });
    console.log("result of deleting file form cloudinary", result);
  } catch (error) {
    console.log("delete on cloudinary failed", error);
    return error;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
