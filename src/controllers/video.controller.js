import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteOnCloudinary,
  uploadOnCloudinaary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

// Get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy,
    sortType,
    userId = req.user._id,
  } = req.query;

  if (!isValidObjectId(userId)) {
    throw new ApiError(404, "User Id is not valid");
  }

  const user = await User.findById({
    _id: userId,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const allVideos = await Video.aggregate([
    {
      $match: {
        videoOwner: new mongoose.Types.ObjectId(userId),
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $sort: {
        [sortBy]: sortType,
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  Video.aggregatePaginate(allVideos, { page, limit });

  if (!allVideos) {
    throw new ApiError(500, "Somthing went wrong while fetching all videos");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, allVideos, "Videos fetched successfully"));
});

// Get video, upload to cloudinary, create video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, isPublished = true } = req.body;

  if (
    !title ||
    (title?.trim() === "" && !description) ||
    description?.trim() === ""
  ) {
    throw new ApiError(404, `Title or Description shouldn't be empty`);
  }

  const videoFileLocalPath = req.files?.videoFile?.[0].path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0].path;

  if (!videoFileLocalPath) {
    throw new ApiError(404, "Video path is missing");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(
      500,
      "something went wrong while uploading video file on cloudinary"
    );
  }

  const video = await Video.create({
    videoFile: {
      public_id: videoFile?.public_id,
      url: videoFile?.url,
    },
    thumbnail: {
      public_id: thumbnail?.public_id,
      url: thumbnail?.url,
    },
    title,
    description,
    isPublished,
    videoOwner: req.user._id,
    duration: videoFile?.duration,
  });

  if (!video) {
    throw new ApiError(
      500,
      "Something went wrong while uploading video on database"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully"));
});

// Get video by id
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Video is not valid");
  }

  const video = await Video.findById({
    _id: videoId,
  });

  if (!video) {
    throw new ApiError(500, "Something went wrong while fetching video by Id");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched by Id"));
});

// Update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailFile = req.file?.path;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Video Id is not valid");
  }

  const previosVideo = await Video.findById({
    _id: videoId,
  });

  if (!previosVideo) {
    throw new ApiError(404, "Video is missing");
  }

  if (
    !title ||
    (title?.trim() === "" && !description) ||
    description?.trim() === ""
  ) {
    throw new ApiError(404, `Title or Description shouldn't be empty`);
  }

  if (previosVideo.owner.toString() !== req.user._id) {
    throw new ApiError(
      500,
      `You don't have permission to update this video data`
    );
  }

  let updateFields = {
    $set: {
      title,
      description,
    },
  };

  let newThumbnailUploadOnCloud;
  if (thumbnailFile) {
    await deleteOnCloudinary(previosVideo.thumbnailFile?.public_id);

    newThumbnailUploadOnCloud = await uploadOnCloudinaary(thumbnailFile);

    if (newThumbnailUploadOnCloud) {
      throw new ApiError(
        500,
        "Something went wrong while uploading thumbnail on Cloudinary"
      );
    }

    updateFields.$set = {
      public_id: newThumbnailUploadOnCloud?.public_id,
      url: newThumbnailUploadOnCloud?.url,
    };
  }

  const updatedVideoDetails = await Video.findByIdAndUpdate(
    videoId,
    updateFields,
    {
      new: true,
    }
  );

  if (!updatedVideoDetails) {
    throw new ApiError(500, "Something went wrong while updating the details");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoDetails,
        "Video details updated successfully"
      )
    );
});

// Delete video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Video id is not valid");
  }

  const video = await Video.findById({
    _id: videoId,
  });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.videoOwner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this video!");
  }

  if (video.videoFile) {
    await deleteOnCloudinary(video.videoFile.public_id, "video");
  }

  if (video.thumbnail) {
    await deleteOnCloudinary(video.thumbnail.public_id);
  }

  const deleteVideoId = await Video.deleteOne(videoId);

  if (deleteVideoId) {
    throw new ApiError(500, "Something went wrong while deleting the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleteVideoId, "Video deleted successfully"));
});

// Toggle pulish status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Video id is not valid");
  }

  const video = await Video.findById({
    _id: videoId,
  });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.videoOwner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this video!");
  }

  // toggle video status
  video.isPublished = !video.isPublished;

  await video.save({ validateBeforeSave: false });

  //return responce
  return res
    .status(200)
    .json(new ApiResponse(200, video, "video toggle successfully!!"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
