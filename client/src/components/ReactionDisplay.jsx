import PropTypes from "prop-types";

export default function ReactionDisplay({ reactions, currentUserId }) {
  if (!reactions || reactions.length === 0) return null;

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {});

  // Sort emojis - put current user's reactions first
  const sortedEmojis = Object.entries(groupedReactions).sort((a, b) => {
    // Check if current user reacted with either emoji
    const userReactedWithA = a[1].some((r) => r.userId === currentUserId);
    const userReactedWithB = b[1].some((r) => r.userId === currentUserId);

    if (userReactedWithA && !userReactedWithB) return -1;
    if (!userReactedWithA && userReactedWithB) return 1;

    // If tie, sort by count (most reactions first)
    return b[1].length - a[1].length;
  });

  return (
    <div className="-mb-5 flex flex-wrap gap-1 mx-1">
      {sortedEmojis.map(([emoji, users]) => {
        const userReacted = users.some((u) => u.userId === currentUserId);
        return (
          <div
            key={emoji}
            className={`flex items-center rounded-full ${userReacted ? "bg-blue-100" : "bg-white"} px-1.5 py-0.5 shadow`}
            title={users.map((u) => u.userName).join(", ")}
          >
            <span className="mr-0.5 text-sm">{emoji}</span>
            <span className="text-xs text-gray-600">{users.length}</span>
          </div>
        );
      })}
    </div>
  );
}

ReactionDisplay.propTypes = {
  reactions: PropTypes.array,
  currentUserId: PropTypes.string.isRequired,
};
