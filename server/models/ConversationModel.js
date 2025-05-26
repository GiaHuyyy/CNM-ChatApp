const mongoose = require("mongoose");

// Add a FileSchema to represent multiple files
const FileSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  name: String,
  type: String,
  size: Number,
});

const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      default: "",
    },
    msgByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    files: [FileSchema],
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
      },
    ],
    seen: {
      type: Boolean,
      default: false,
    },
    seenBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    callData: {
      callType: {
        type: String,
        enum: ["audio", "video"],
      },
      callStatus: {
        type: String,
        enum: ["missed", "answered", "rejected", "completed"],
      },
      callDuration: {
        type: Number,
        default: 0,
      },
    },
    replyTo: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      text: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    sharedContent: {
      originalText: String,
      originalSender: String,
      originalImage: String,
      originalFile: String,
      originalFileName: String,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const conversationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    // Thêm field pinnedMessages để lưu các tin nhắn đã ghim
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      default: "",
    },
    profilePic: {
      type: String,
      default: "",
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    mutedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deputyAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const MessageModel = mongoose.model("Message", messageSchema);
const ConversationModel = mongoose.model("Conversation", conversationSchema);

module.exports = { MessageModel, ConversationModel };
