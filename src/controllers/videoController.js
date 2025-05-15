import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/Video.js";
import { User } from "../models/User.js";
import { Like } from "../models/Like.js";
import { Comment } from "../models/Comment.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  // for using Full Text based search u need to create a search index in mongoDB atlas
  // you can include field mapppings in search index eg.title, description, as well
  // Field mappings specify which fields within your documents should be indexed for text search.
  // this helps in seraching only in title, desc providing faster search results
  // here the name of search index is 'search-videos'

  const pipeline = [];

  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos",
        text: {
          query: query,
          path: ["title", "description"],
        },
      },
    });
  }

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
      $match: {
        owner: userId,
      },
    });
  }

  // fetch videos only that are set isPublished as true
  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

  //sortBy can be views, createdAt, duration
  //sortType can be ascending(-1) or descending(1)

  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });
  }

  //get owners details
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails",
    }
  );

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const video = await Video.aggregatePaginate(videoAggregate, options);
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  //first gell details
  const { title, description } = req.body;
  //then check the data
  if (!title || !description) {
    throw new ApiError(400, "Video Title and Description is required");
  }
  //check video file and thumbnail is there
  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thubmnail is required");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  console.log("video file ", videoFile);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile || !thumbnail) {
    throw new ApiError(400, "Error while uploading video and thumbnail files ");
  }

  const video = await Video.create({
    videoFile: {
      public_id: videoFile.public_id,
      url: videoFile.url,
    },
    thumbnail: {
      public_id: thumbnail.public_id,
      url: thumbnail.url,
    },
    title,
    description,
    duration: videoFile.duration,
    owner: req.user?._id,
  });

  const videoUploaded = await Video.findById(video._id);
  if (!videoUploaded) {
    throw new ApiError(500, "Error While publishing the video");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, videoUploaded, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  // i think no need
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid userId");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: videoId,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSuscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSuscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(500, "fetch to faild video");
  }

  //increase veiws if video fetch successfully

  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  //add video to user watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video details fetched successfully"));

  // const video = await Video.findById(videoId);
  // if (!video) {
  //   throw new ApiError(404, "Video not found with this id");
  // }

  // return res.status(200).json(new ApiResponse(200, video, "Video found"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  //get video from params
  const { videoId } = req.params;

  //get required details like title description
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  //check details are there and then find video in db and update it
  if (!title || !description) {
    throw new ApiError(400, "All Fileds are required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't edit this video as you are not the owner"
    );
  }

  const thubmnailToDelete = video.thumbnail.public_id;

  const thumbnailLocalPath = req.file?.thumbnail;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thubmail is missing ");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(400, "Error while uplaoding thumbnail");
  }

  const updateVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          public_id: thumbnail.public_id,
          url: thumbnail.public_id,
        },
      },
    },
    {
      new: true,
    }
  );

  if (!updateVideo) {
    throw new ApiError(500, "Failed to update video please try again");
  }

  if (updateVideo) {
    await deleteOnCloudinary(thubmnailToDelete);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updateVideo, "Video details updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't delete this video as you are not the owner"
    );
  }

  const deleteVideoThumbnail = video.thumbnail.public_id;
  const videoToDelete = video.videoFile.public_id;

  const deleteVideo = await Video.findByIdAndDelete(videoId);

  if (!deleteVideo) {
    throw new ApiError(500, "Error while deleting the video");
  }

  await deleteOnCloudinary(deleteVideoThumbnail);
  await deleteOnCloudinary(videoToDelete, "video"); //here i have to pass type if type is not image

  await Like.deleteMany({
    video: videoId,
  });

  await Comment.deleteMany({
    video: videoId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, deleteVideo, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  //check first video is available with that id then update it
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video does not exists with this Id");
  }

  if (video?.owner.toString() !== req.user?._id) {
    throw new ApiError(
      "You can't toggle publish status as you are not the owner"
    );
  }

  const togglePublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished,
      },
    },
    {
      new: true,
    }
  );

  if (!togglePublish) {
    throw new ApiError(500, "Failed to toggle video publish status");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isPublished: togglePublish.isPublished,
      },
      "Video status updated successfully"
    )
  );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
