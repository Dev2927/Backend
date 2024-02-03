import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//Create tweet
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || content?.trim() === "") {
    throw new ApiError(404, `Please write somehing in content section`);
  }

  const addTweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  if (!addTweet) {
    throw new ApiError(500, "Something went wrong while creating the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, addTweet, "Tweet created successfully"));
});

// Get user tweets
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(404, "User Id is not valid");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: user._id,
      },
    },
  ]);

  if (!tweets) {
    throw new ApiError(500, "Something went wrong while fetching the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

//Update tweet
const updateTweet = asyncHandler(async (req, res) => {
  const { newContent } = req.body;
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(404, "Tweet Id is not valid");
  }

  if (!newContent || newContent?.trim() === "") {
    throw new ApiError(404, "Please write somehing in content section");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this tweet!");
  }

  const updateTheTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: newContent,
      },
    },
    {
      new: true,
    }
  );

  if (!updateTheTweet) {
    throw new ApiError(500, "Something went wrong while updating the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updateTheTweet, "Tweet updated successfully"));
});

//Delete tweet
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(404, "Tweet Id is not valid");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this tweet!");
  }

  const deleteTheTweet = await Tweet.deleteOne(req.user._id);

  if (!deleteTheTweet) {
    throw new ApiError(500, "Something went wrong while deleting the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleteTheTweet, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
