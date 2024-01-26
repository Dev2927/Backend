import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

//Get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  console.log("This is videoId", videoId);

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video Id is not valid");
  }

  const findVideo = await Video.findById({ videoId });

  if (!findVideo) {
    throw new ApiError(404, "Video not found");
  }

  const getComments = await Comment.aggregate([
    {
      $match: {
        findVideo: new mongoose.Types.ObjectId(videoId),
      },
    },
  ]);

  Comment.aggregatePaginate(getComments, {
    page,
    limit,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, getComments, "Got all comments successfully"));
});

// Add a comment to a video
const addComment = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const { videoId } = req.params;

  if (!comment || comment?.trim() === "") {
    throw new ApiError(404, "Comment is not valid");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video Id is not valid");
  }

  const throwComment = await Comment.create({
    content: comment,
    video: videoId,
    owner: req.user._id,
  });

  if (!throwComment) {
    throw new ApiError(404, "Something went wrong comment is not added");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, "Comment created successfully"));
});

// Update a comment
const updateComment = asyncHandler(async (req, res) => {
  const { newContent } = req.body;
  const { commentId } = req.params;

  if (!newContent || newContent?.trim() === "") {
    throw new ApiError(404, "Comment is not valid");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Comment Id is not valid");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      404,
      `You don't have permission to update this comment!`
    );
  }

  const updateTheComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: newContent,
      },
    },
    {
      new: true,
    }
  );

  if (!updateTheComment) {
    throw new ApiError(404, "Something went wrong comment not updated");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(201, updateTheComment, "Comment updated successfully")
    );
});

// Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Comment Id is not valid");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Cmment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      404,
      `You don't have permission to update this comment!`
    );
  }

  const deleteTheComment = await Comment.deleteOne({ _id: commentId });

  if (!deleteTheComment) {
    throw new ApiError(404, "Something went wrong comment not deleted");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(201, deleteTheComment, "Comment deleted successfully")
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };
