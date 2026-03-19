import User from "../models/User.model.js";
import Transaction from "../models/Transaction.model.js";
import PpiWallet from "../models/PpiWallet.model.js";
import AuditLog from "../models/AuditLog.js";
import crypto from "crypto";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function sendError(res, e) {
  const status = e?.statusCode || e?.response?.status || 500;
  const message = e?.message || "Server error";
  return res.status(status).json({
    success: false,
    message,
  });
}

// Generate unique Outlet ID
function generateOutletId() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `OT_${randomNum}`;
}

// Get dashboard statistics
export async function getDashboardStats(req, res) {
  try {
    // Only admin can access
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total transactions today
    const todayTransactions = await Transaction.countDocuments({
      createdAt: { $gte: today }
    });

    // Total agents registered
    const totalAgents = await User.countDocuments({ 
      role: 'AGENT',
      isApproved: true 
    });

    // Pending approvals
    const pendingApprovals = await User.countDocuments({ 
      role: 'AGENT',
      isApproved: false 
    });

    // Total commission generated (mock calculation)
    const totalCommission = await Transaction.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$amount', 0.02] } } } }
    ]);

    const stats = {
      totalTransactionsToday: todayTransactions,
      totalAgentsRegistered: totalAgents,
      pendingApprovals: pendingApprovals,
      totalCommissionGenerated: totalCommission[0]?.total || 0,
      lastUpdated: new Date()
    };

    return res.json({
      success: true,
      data: stats
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Get all agents
export async function getAllAgents(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter = { role: 'AGENT' };
    if (status === 'approved') {
      filter.isApproved = true;
    } else if (status === 'pending') {
      filter.isApproved = false;
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const agents = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        agents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Approve agent
export async function approveAgent(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { id } = req.params;
    
    const agent = await User.findById(id);
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        message: "Agent not found" 
      });
    }

    if (agent.role !== 'AGENT') {
      return res.status(400).json({ 
        success: false, 
        message: "User is not an agent" 
      });
    }

    if (agent.isApproved) {
      return res.status(400).json({ 
        success: false, 
        message: "Agent already approved" 
      });
    }

    // Generate unique outlet ID
    let outletId;
    let attempts = 0;
    do {
      outletId = generateOutletId();
      const existing = await User.findOne({ outletId });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to generate unique outlet ID" 
      });
    }

    // Update agent
    agent.isApproved = true;
    agent.outletId = outletId;
    agent.approvedAt = new Date();
    agent.approvedBy = req.user.id;
    await agent.save();

    console.log(`[Admin] Agent approved: ${agent.email}, Outlet ID: ${outletId}`);

    return res.json({
      success: true,
      message: "Agent approved successfully",
      data: {
        agentId: agent._id,
        email: agent.email,
        fullName: agent.fullName,
        outletId: outletId,
        approvedAt: agent.approvedAt
      }
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Reject agent
export async function rejectAgent(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { id } = req.params;
    const { reason } = req.body;
    
    const agent = await User.findById(id);
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        message: "Agent not found" 
      });
    }

    if (agent.role !== 'AGENT') {
      return res.status(400).json({ 
        success: false, 
        message: "User is not an agent" 
      });
    }

    if (agent.isApproved) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot reject approved agent" 
      });
    }

    // Update agent
    agent.isRejected = true;
    agent.rejectionReason = reason || "Rejected by admin";
    agent.rejectedAt = new Date();
    agent.rejectedBy = req.user.id;
    await agent.save();

    console.log(`[Admin] Agent rejected: ${agent.email}, Reason: ${reason}`);

    return res.json({
      success: true,
      message: "Agent rejected successfully",
      data: {
        agentId: agent._id,
        email: agent.email,
        fullName: agent.fullName,
        rejectionReason: agent.rejectionReason,
        rejectedAt: agent.rejectedAt
      }
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Delete agent
export async function deleteAgent(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { id } = req.params;
    
    const agent = await User.findById(id);
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        message: "Agent not found" 
      });
    }

    if (agent.role !== 'AGENT') {
      return res.status(400).json({ 
        success: false, 
        message: "User is not an agent" 
      });
    }

    // Check if agent has transactions
    const transactionCount = await Transaction.countDocuments({ 
      initiatedBy: agent._id 
    });

    if (transactionCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot delete agent with existing transactions" 
      });
    }

    // Delete associated PPI wallet if exists
    await PpiWallet.deleteOne({ user: agent._id });

    // Delete agent
    await User.findByIdAndDelete(id);

    console.log(`[Admin] Agent deleted: ${agent.email}`);

    return res.json({
      success: true,
      message: "Agent deleted successfully",
      data: {
        deletedAgent: {
          id: agent._id,
          email: agent.email,
          fullName: agent.fullName
        }
      }
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Edit agent details
export async function editAgent(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { id } = req.params;
    const { fullName, email, mobile, address } = req.body;
    
    const agent = await User.findById(id);
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        message: "Agent not found" 
      });
    }

    if (agent.role !== 'AGENT') {
      return res.status(400).json({ 
        success: false, 
        message: "User is not an agent" 
      });
    }

    // Update fields
    if (fullName) agent.fullName = fullName;
    if (email) agent.email = email;
    if (mobile) agent.mobile = mobile;
    if (address) agent.address = address;
    
    agent.updatedAt = new Date();
    agent.updatedBy = req.user.id;
    await agent.save();

    console.log(`[Admin] Agent updated: ${agent.email}`);

    return res.json({
      success: true,
      message: "Agent updated successfully",
      data: {
        agent: {
          id: agent._id,
          fullName: agent.fullName,
          email: agent.email,
          mobile: agent.mobile,
          address: agent.address,
          updatedAt: agent.updatedAt
        }
      }
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Get agent transaction history
export async function getAgentTransactions(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { id } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Verify agent exists
    const agent = await User.findById(id);
    if (!agent || agent.role !== 'AGENT') {
      return res.status(404).json({ 
        success: false, 
        message: "Agent not found" 
      });
    }

    // Build filter
    const filter = { initiatedBy: agent._id };
    if (status) {
      filter.status = status.toUpperCase();
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(filter);

    // Calculate commission
    const totalCommission = transactions
      .filter(tx => tx.status === 'SUCCESS')
      .reduce((sum, tx) => sum + (tx.amount * 0.02), 0);

    return res.json({
      success: true,
      data: {
        agent: {
          id: agent._id,
          fullName: agent.fullName,
          email: agent.email,
          outletId: agent.outletId
        },
        transactions,
        totalCommission,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Get all users
export async function getAllUsers(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter = { role: 'USER' };
    if (status === 'suspended') {
      filter.status = 'SUSPENDED';
    } else if (status === 'active') {
      filter.status = 'ACTIVE';
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Block/Unblock user
export async function toggleUserBlock(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot block admin user" 
      });
    }

    // Toggle status
    user.status = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await user.save();

    const action = user.status === 'SUSPENDED' ? 'suspended' : 'activated';
    console.log(`[Admin] User ${action}: ${user.email}`);

    return res.json({
      success: true,
      message: `User ${action} successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          status: user.status
        }
      }
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Get all transactions
export async function getAllTransactions(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { page = 1, limit = 20, status, type, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (type) filter.type = type.toUpperCase();

    // Search functionality
    if (search) {
      filter.$or = [
        { 'meta.senderMobile': { $regex: search, $options: 'i' } },
        { 'meta.recipientAccount': { $regex: search, $options: 'i' } },
        { idempotencyKey: { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Transaction.find(filter)
      .populate('initiatedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// Legacy functions for compatibility
export async function listUsers(req, res) {
  return getAllUsers(req, res);
}

export async function suspendUser(req, res) {
  return toggleUserBlock(req, res);
}

export async function activateUser(req, res) {
  return toggleUserBlock(req, res);
}

export async function listTransactions(req, res) {
  return getAllTransactions(req, res);
}

export async function listAuditLogs(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }

    const { page = 1, limit = 50, action } = req.query;
    const filter = {};
    if (action) filter.action = action;
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("actor", "email fullName")
        .populate("targetUser", "email fullName"),
      AuditLog.countDocuments(filter)
    ]);

    res.json({ 
      success: true,
      data: {
        items, 
        total, 
        page: Number(page), 
        limit: Number(limit)
      }
    });
  } catch (e) {
    return sendError(res, e);
  }
}
