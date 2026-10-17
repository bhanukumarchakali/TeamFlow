import Conversation from "../models/conversationModel.js";
import member from "../models/memberModel.js";
import Message from "../models/messageModel.js";
import conversationMember from "../models/conversationMemberModel.js";

export const createConversation = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { type, name, members } = req.body;

    if (!type || !["direct", "group"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Valid conversation type is required",
      });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Conversation members are required",
      });
    }

    const workspaceMembers = await member.find({
      workspace: workspaceId,
      user: { $in: members },
    });

    if (workspaceMembers.length !== members.length) {
      return res.status(400).json({
        success: false,
        message: "All conversation members must belong to the workspace",
      });
    }

    const conversationMembers = [...new Set([req.user.userId, ...members])];

    if (type === "direct") {
      const existingConversation = await Conversation.findOne({
        workspace: workspaceId,
        type: "direct",
        members: {
          $all: members,
          $size: 2,
        },
        isActive: true,
      }).populate("members", "firstName lastName email avatar");

      if (existingConversation) {
        return res.status(200).json({
          success: true,
          message: "Direct conversation already exists",
          data: existingConversation,
        });
      }
    }

    if (type === "group" && conversationMembers.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Group conversation must have at least two members",
      });
    }

    const conversation = await Conversation.create({
      workspace: workspaceId,
      type,
      name: type === "group" ? name || "" : "",
      createdBy: req.user.userId,
      members: conversationMembers,
    });
    await conversationMember.insertMany(
      conversationMembers.map((userId) => ({
        conversation: conversation._id,
        user: userId,
      })),
    );

    await conversation.populate("members", "firstName lastName email avatar");

    return res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create conversation",
    });
  }
};

export const getMyConversations = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const archivedConversationRecords = await conversationMember
      .find({
        user: req.user.userId,
        isArchived: true,
      })
      .select("conversation");

    const archivedConversationIds = archivedConversationRecords.map(
      (record) => record.conversation,
    );

    const conversations = await Conversation.find({
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
      _id: {
        $nin: archivedConversationIds,
      },
    })
      .populate("members", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email avatar")
      .sort({
        updatedAt: -1,
      });

    const conversationsWithLatestMessage = await Promise.all(
      conversations.map(async (conversation) => {
        const latestMessage = await Message.findOne({
          conversation: conversation._id,
          isDeleted: false,
        })
          .populate("sender", "firstName lastName email avatar")
          .sort({
            createdAt: -1,
          });

        return {
          ...conversation.toObject(),
          latestMessage,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      conversations: conversationsWithLatestMessage,
    });
  } catch (error) {
    console.error("Get my conversations error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
};

export const addConversationMember = async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({
        success: false,
        message: "Members can only be added to group conversations",
      });
    }

    if (
      conversation.members.some((memberId) => memberId.toString() === userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "User is already a conversation member",
      });
    }

    const workspaceMember = await member.findOne({
      workspace: workspaceId,
      user: userId,
    });

    if (!workspaceMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this workspace",
      });
    }

    conversation.members.push(userId);

    await conversation.save();
    await conversationMember.create({
      conversation: conversation._id,
      user: userId,
    });

    await conversation.populate("members", "firstName lastName email avatar");

    const addedMember = conversation.members.find(
      (conversationMember) => conversationMember._id.toString() === userId,
    );

    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("conversationMemberAdded", {
      conversationId,
      member: addedMember,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation member added successfully",
      conversation,
    });
  } catch (error) {
    console.error("Add conversation member error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to add conversation member",
    });
  }
};

export const removeConversationMember = async (req, res) => {
  try {
    const { workspaceId, conversationId, userId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({
        success: false,
        message: "Members can only be removed from group conversations",
      });
    }

    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself from the conversation",
      });
    }

    const isMember = conversation.members.some(
      (memberId) => memberId.toString() === userId,
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a conversation member",
      });
    }

    conversation.members = conversation.members.filter(
      (memberId) => memberId.toString() !== userId,
    );

    await conversation.save();
    await conversationMember.deleteOne({
      conversation: conversation._id,
      user: userId,
    });

    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("conversationMemberRemoved", {
      conversationId,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation member removed successfully",
    });
  } catch (error) {
    console.error("Remove conversation member error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to remove conversation member",
    });
  }
};

export const updateConversation = async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Conversation name is required",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({
        success: false,
        message: "Only group conversations can be renamed",
      });
    }

    conversation.name = name.trim();

    await conversation.save();

    await conversation.populate("members", "firstName lastName email avatar");

    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("conversationUpdated", {
      conversationId,
      conversation,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation updated successfully",
      conversation,
    });
  } catch (error) {
    console.error("Update conversation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update conversation",
    });
  }
};

export const archiveConversation = async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const conversationMemberRecord = await conversationMember.findOne({
      conversation: conversationId,
      user: req.user.userId,
    });

    if (!conversationMemberRecord) {
      return res.status(404).json({
        success: false,
        message: "Conversation membership not found",
      });
    }

    conversationMemberRecord.isArchived = true;

    await conversationMemberRecord.save();

    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("conversationArchived", {
      conversationId,
      userId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation archived successfully",
    });
  } catch (error) {
    console.error("Archive conversation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to archive conversation",
    });
  }
};

export const unarchiveConversation = async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const conversationMemberRecord = await conversationMember.findOne({
      conversation: conversationId,
      user: req.user.userId,
    });

    if (!conversationMemberRecord) {
      return res.status(404).json({
        success: false,
        message: "Conversation membership not found",
      });
    }

    conversationMemberRecord.isArchived = false;

    await conversationMemberRecord.save();

    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("conversationUnarchived", {
      conversationId,
      userId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation unarchived successfully",
    });
  } catch (error) {
    console.error("Unarchive conversation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to unarchive conversation",
    });
  }
};

export const getMyArchivedConversations = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const archivedConversationRecords = await conversationMember
      .find({
        user: req.user.userId,
        isArchived: true,
      })
      .select("conversation");

    const archivedConversationIds = archivedConversationRecords.map(
      (record) => record.conversation,
    );

    const conversations = await Conversation.find({
      _id: { $in: archivedConversationIds },
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    })
      .populate("members", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email avatar")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("Get archived conversations error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch archived conversations",
    });
  }
};
