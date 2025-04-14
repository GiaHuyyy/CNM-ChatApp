const UserModel = require("../models/UserModel");
const { ConversationModel } = require("../models/ConversationModel");

async function searchFriendUser(request, response) {
  try {
    const { search } = request.body;
    const currentUserId = request.user?._id;

    if (!search) {
      return response.status(200).json({ message: "Please provide a search term", data: [], success: true });
    }

    console.log(`Searching with term: "${search}" for user: ${currentUserId}`);

    // Create regex pattern string - don't convert to RegExp object yet
    const searchPattern = search;

    // Search for users with the pattern
    const users = await UserModel.find({
      $or: [{ name: { $regex: searchPattern, $options: "i" } }, { email: { $regex: searchPattern, $options: "i" } }],
    }).select("-password");

    console.log(`Found ${users.length} matching users`);

    try {
      // Convert ID to string format for reliable comparison
      const currentUserIdStr = currentUserId ? currentUserId.toString() : "";
      console.log("Searching groups with userId or groupAdmin:", currentUserIdStr);

      // Query MongoDB for groups where:
      // 1. Name matches search pattern (case-insensitive)
      // 2. It's marked as a group
      // 3. Either the current user is a member OR is the group admin
      const groups = await ConversationModel.find({
        name: { $regex: searchPattern, $options: "i" },
        isGroup: true,
      }).select("_id name members isGroup groupAdmin");

      // Manually filter after query for accurate membership and admin checks
      const userGroups = groups.filter((group) => {
        // Check if user is a member
        const isMember = group.members.some((memberId) => memberId.toString() === currentUserIdStr);

        // Check if user is the group admin
        const isAdmin = group.groupAdmin && group.groupAdmin.toString() === currentUserIdStr;

        return isMember || isAdmin;
      });

      console.log(
        `Found ${groups.length} total groups matching "${search}", ${userGroups.length} where user is member/admin:`,
        userGroups.map((g) => ({
          id: g._id.toString(),
          name: g.name,
          isAdmin: g.groupAdmin && g.groupAdmin.toString() === currentUserIdStr,
        }))
      );

      // Process group results to match user result structure
      const formattedGroups = userGroups.map((group) => ({
        _id: group._id,
        name: group.name || `Group ${group._id.toString().slice(-5)}`,
        profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name || "Group")}&background=random`,
        email: `Group with ${group.members.length} members`,
        isGroup: true,
        memberCount: group.members.length,
        isAdmin: group.groupAdmin && group.groupAdmin.toString() === currentUserIdStr,
      }));

      // Combine and format results
      const combinedResults = [...users.map((user) => ({ ...user.toObject(), isGroup: false })), ...formattedGroups];

      if (combinedResults.length === 0) {
        return response.status(404).json({ message: "Not found" });
      }

      return response.status(200).json({
        message: "Search results",
        data: combinedResults,
        success: true,
      });
    } catch (groupError) {
      console.error("Search error:", groupError);

      // If group search fails, at least return user results
      return response.status(200).json({
        message: "Partial search results (groups failed)",
        data: users.map((user) => ({ ...user.toObject(), isGroup: false })),
        success: true,
        error: groupError.message,
      });
    }
  } catch (error) {
    console.error("Search error:", error);
    return response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = searchFriendUser;
