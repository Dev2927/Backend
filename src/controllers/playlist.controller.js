import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

// Create playlist
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (
    !name ||
    (name?.trim() === "" && !description) ||
    description?.trim() === ""
  ) {
    throw new ApiError(400, "Name or Description can not be empty");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Something went wrong while creating the playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

// Get user playlists
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "User Id is not valid");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $addFields: {
        playlist: {
          $first: "$videos",
        },
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(500, "Something went wrong while getting user playlist");
  }

  return res
    .status(200)
    .res(new ApiResponse(200, playlist, "User playlist fetched successfully"));
});

//Get playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(500, "Playlist Id is not valid");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(
      500,
      "Something went wrong while fetching playlist by Id"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist feteched successfully"));
});

// Add Video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(404, "Playlist Id is not valid");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Video Id is not valid");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(500, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id) {
    throw new ApiError(
      400,
      `You don't have permission to add video in this playlist`
    );
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(500, "Video not found");
  }

  if (!playlist.video.includes(videoId)) {
    throw new ApiError(500, "Your video is already exists");
  }

  const addVideos = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: {
        video: videoId,
      },
    },
    {
      new: true,
    }
  );

  if (!addVideos) {
    throw new ApiError(
      500,
      "Something went wrong while adding video to the playlist"
    );
  }

  return res
    .status(200)
    .res(new ApiResponse(200, addVideos, "Video added Successfully"));
});

// Remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(404, "Playlist Id is not valid");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Video Id is not valid");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(500, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id) {
    throw new ApiError(
      404,
      `You don't have permission to remove this video from playlist`
    );
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(500, "Playlist not found");
  }

  if (!playlist.video.includes(videoId)) {
    throw new ApiError(404, `This video doesn't exist`);
  }

  const removeVideo = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        video: videoId,
      },
    },
    {
      new: true,
    }
  );

  if (!removeVideo) {
    throw new ApiError(
      500,
      "Something went wrong while removing the video from playlist"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, removeVideo, "Video removed successfully"));
});

// Delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(404, "Playlist ID is not valid");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(500, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id) {
    throw new ApiError(
      404,
      `You don't have permission to delete this playlist`
    );
  }

  const deletePlaylist = await Playlist.deleteOne({
    _id: playlistId,
  });

  if (!deletePlaylist) {
    throw new ApiError(500, "Something went wrong while deleting the playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Playlist deleted sucessfully"));
});

//Update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(404, "Playlist Id is not valid");
  }

  if (
    !name ||
    (name?.trim() === "" && !description) ||
    description?.trim() === ""
  ) {
    throw new ApiError(404, `Name or Description shouldn't be empty`);
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(500, "Playlist not found");
  }

  if (playlist.owner.toString !== req.user._id) {
    throw new ApiError(
      404,
      `You don't have permission to update this playlist`
    );
  }

  const updatePlaylistInfo = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name: newName,
        description: newDescription,
      },
    },
    {
      new: true,
    }
  );

  if (!updatePlaylistInfo) {
    throw new ApiError(500, `Something went wrong while updating the playlist`);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Playlist updated sucessfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
