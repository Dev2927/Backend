import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get the channel stats like total video views, total subscribers, total videos, total likes etc.
const getChannelStats = asyncHandler(async (req, res) => {
  const countLikes = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $group: {
        _id: null,
        totalVideoLikes: {
          $sum: {
            $cond: [{ $ifNull: ["$video", false] }, 1, 0],
          },
        },
        totalTweetLikes: {
          $sum: {
            $cond: [{ $ifNull: ["$tweet", false] }, 1, 0],
          },
        },
        totalCommentLikes: {
          $sum: {
            $cond: [{ $ifNull: ["comment", false] }, 1, 0],
          },
        },
      },
    },
  ]);

  const countSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $count: "subscribers",
    },
  ]);

  const countAllVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $count: "videos",
    },
  ]);

  const countAllViews = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $group: {
        _id: null,
        allVideoViews: {
          $sum: "$views",
        },
      },
    },
  ]);

  const stats = {
    subscribers: countSubscribers[0]?.subscribers || 0,
    totalVideos: countAllVideos[0]?.videos || 0,
    totalVideoViews: countAllViews[0]?.allVideoViews || 0,
    totalVideoLikes: countLikes[0]?.totalVideoLikes || 0,
    totalTweetLikes: countLikes[0]?.totalTweetLikes || 0,
    totalCommentLikes: countLikes[0]?.totalCommentLikes || 0,
  };
  
  return res
  .status(200)
  .json(new ApiResponse(200, stats, 'All stats fetch successfully'))
});

// Get all the videos uploaded by the channel
const getChannelVideos = asyncHandler(async (req, res) => {

  const getAllVideo = await Video.find({
    owner: req.user._id
  })

  if(!getAllVideo){
    throw new ApiError(500, "Something went wrong while fetching video")
  }

  return res
  .status(200)
  .json(new ApiResponse(200, getAllVideo, 'All videos fetch successfully'))

});

export { getChannelStats, getChannelVideos };
