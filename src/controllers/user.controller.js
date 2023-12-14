import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
  // Get user details from frontend
  // Validation - not empty
  // Check if user already exists: username, email
  // Check for images, check for avatar
  // Upload them to cloudinary, avatar
  // Create user object - create entry in DB
  // Remove password and refresh token field from response
  // Check for user creation
  // Return res

  const { fullname, email, username, password } = req.body;
  console.log("email: ", email);

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
});

export { registerUser };
