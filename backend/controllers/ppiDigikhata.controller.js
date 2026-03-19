 import Transaction from "../models/Transaction.model.js";
import Account from "../models/Account.model.js";
import PpiWallet from "../models/PpiWallet.model.js";
import User from "../models/User.model.js";
import {
  addRecipient,
  addRecipientBank,
  getRecipients,
  getSenderInformation,
  initiateTransaction,
  onboardSender,
  sendTransactionOtp,
  transactionInquiry,
  validateSenderAadhaar,
  validateSenderPan,
  verifyCustomerOtp,
} from "../services/digikhataPpi.service.js";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function mapTxStatus(providerData) {
  const txStatus = providerData?.tx_status;
  if (typeof txStatus === "number") {
    // EKO-style mapping from docs:
    // 0 Success, 1 Fail, 2 Initiated, 3 Refund Pending, 4 Refunded, 5 Hold
    if (txStatus === 0) return "SUCCESS";
    if (txStatus === 1) return "FAILED";
    if (txStatus === 2 || txStatus === 3 || txStatus === 5) return "PENDING";
    if (txStatus === 4) return "SUCCESS";  // Refunded is considered successful
  }

  const code = providerData?.status_code ?? providerData?.code ?? providerData?.status;
  const text = String(code ?? "").toLowerCase();

  if (!text) return "PENDING";  // Default to PENDING for safety
  if (text.includes("pending")) return "PENDING";
  if (text.includes("fail") || text.includes("error")) return "FAILED";
  if (text.includes("success")) return "SUCCESS";

  // Some providers use numeric codes like "00" for success.
  if (text === "00") return "SUCCESS";
  
  return "PENDING";  // Safer default
}

function normalizeEkoError(payload) {
  const rawMessage = payload?.message || payload?.reason || "";
  let message = rawMessage || "Transaction failed";

  const lowerMessage = rawMessage.toLowerCase();

  // Replace technical technical jargon with human-readable messages
  if (lowerMessage.includes("okeykey") || lowerMessage.includes("request to bbps")) {
    message = "Bank system is temporarily busy. Please try again after some time.";
  } else if (lowerMessage.includes("jdbc") || lowerMessage.includes("hibernate") || lowerMessage.includes("internal error")) {
    message = "External bank server is experiencing technical issues. Please try again later.";
  }

  return { message, raw: payload };
}

function sendError(res, e) {
  const status = e?.statusCode || e?.response?.status || 500;
  const message = e?.message || "Bank server error. Please try again.";
  return res.status(status).json({
    success: false,
    message,
  });
}

// Simple transaction endpoint (backward compatible)
export async function initiatePpiTransaction(req, res) {
  try {
    const { senderMobile, recipientAccount, amount, description } = req.body || {};

    if (!senderMobile) throw badRequest("senderMobile is required");
    if (!recipientAccount) throw badRequest("recipientAccount is required");

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw badRequest("amount must be a positive number");

    // Check PPI wallet balance before transaction
    const ppiWallet = await PpiWallet.findOne({ 
      user: req.user.id, 
      status: "ACTIVE" 
    });
    
    if (!ppiWallet) {
      throw badRequest("PPI wallet not found. Please complete sender onboarding first.");
    }
    
    if (!ppiWallet.canTransact(amt)) {
      throw badRequest(`Insufficient wallet balance. Available: ₹${ppiWallet.remainingLimit}`);
    }

    const clientRefId = `PPI_${Date.now()}`;

    const tx = await Transaction.create({
      amount: amt,
      type: "PPI",
      status: "PENDING",
      initiatedBy: req.user?.id,
      idempotencyKey: clientRefId,
      meta: {
        channel: "DIGIKHATA_PPI",
        senderMobile,
        recipientAccount,
        description,
        clientRefId,
        ppiWalletId: ppiWallet._id,
      },
    });

    try {
      const providerData = await createPpiTransaction({
        senderMobile,
        recipientAccount,
        amount: amt,
        clientRefId,
        description,
      });

      const finalStatus = mapProviderStatus(providerData);
      tx.status = finalStatus;
      tx.meta = {
        ...tx.meta,
        providerResponse: providerData,
      };
      await tx.save();

      // Deduct from PPI wallet if successful
      if (finalStatus === "SUCCESS") {
        try {
          await ppiWallet.deductBalance(amt);
        } catch (balanceError) {
          console.error("Balance deduction failed:", balanceError);
          // Transaction succeeded but balance deduction failed - log for manual reconciliation
        }
      }

      if (finalStatus === "FAILED") {
        return res.status(400).json({
          success: false,
          message: providerData?.message || "PPI transaction failed",
          transaction: tx,
        });
      }

      return res.json({
        success: true,
        data: {
          transaction: tx,
          provider: providerData,
          walletInfo: {
            remainingLimit: ppiWallet.remainingLimit,
            monthlyLimit: ppiWallet.monthlyLimit
          }
        },
      });
    } catch (err) {
      tx.status = "FAILED";
      tx.meta = {
        ...tx.meta,
        providerError: {
          message: err?.message,
          response: err?.response?.data,
          status: err?.response?.status,
        },
      };
      await tx.save();
      throw err;
    }
  } catch (e) {
    const status = e.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: e?.message || "PPI transaction failed",
    });
  }
}

// -------------------- Sender --------------------

export async function senderInfo(req, res) {
  try {
    let { customerId } = req.params;
    
    // If no customerId provided, try to find from user's PPI wallet
    if (!customerId && req.user) {
      const ppiWallet = await PpiWallet.findOne({ 
        user: req.user.id,
        status: "ACTIVE"
      });
      if (ppiWallet) {
        customerId = ppiWallet.customerId;
      }
    }
    
    // If still no customerId, generate from user's mobile or create a default
    if (!customerId && req.user) {
      // Try to get user data from registered user
      const user = await User.findById(req.user.id);
      
      if (user && user.email) {
        // Extract numbers from email or create a default ID
        customerId = user.email.replace(/[^0-9]/g, '') || `CUST${req.user.id}`;
      } else {
        customerId = `CUST${req.user.id}`;
      }
      
      console.log(`Generated Customer ID: ${customerId} for user: ${req.user.id}`);
    }
    
    if (!customerId) throw badRequest("customerId is required");
    
    let data = await getSenderInformation({ customerId });
    
    // If user is authenticated, enrich with wallet info
    if (req.user) {
      try {
        const ppiWallet = await PpiWallet.findOne({ 
          user: req.user.id,
          status: "ACTIVE"
        });
        
        if (ppiWallet) {
          data = {
            ...data,
            walletInfo: {
              monthlyLimit: ppiWallet.monthlyLimit,
              remainingLimit: ppiWallet.remainingLimit,
              kycStatus: ppiWallet.kycStatus,
              lastResetDate: ppiWallet.lastResetDate
            }
          };
        }
      } catch (walletError) {
        console.error("Failed to fetch wallet info:", walletError);
      }
    }
    
    return res.json({ 
      success: true, 
      data,
      customerId, // Send back the customerId for reference
      message: customerId ? `Using Customer ID: ${customerId}` : "Please provide a Customer ID"
    });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function senderOnboard(req, res) {
  try {
    const { customerId, name, mobile, extra } = req.body || {};
    
    // Auto-generate customerId if not provided
    let finalCustomerId = customerId;
    if (!finalCustomerId && mobile) {
      finalCustomerId = mobile; // Use mobile as customer ID
    } else if (!finalCustomerId && req.user) {
      // Generate from user ID
      finalCustomerId = `CUST${req.user.id}`;
    }
    
    if (!finalCustomerId && !mobile) throw badRequest("customerId or mobile is required");
    
    const data = await onboardSender({ 
      customerId: finalCustomerId, 
      name, 
      mobile: mobile || finalCustomerId, 
      extra 
    });
    
    // Create or update PPI wallet when sender is onboarded
    if (req.user && finalCustomerId) {
      try {
        await PpiWallet.findOrCreate({
          user: req.user.id,
          customerId: finalCustomerId,
          mobile: mobile || finalCustomerId,
          name: name || ''
        });
      } catch (walletError) {
        console.error("Failed to create PPI wallet:", walletError);
        // Don't fail the onboarding, just log the error
      }
    }
    
    return res.json({ 
      success: true, 
      data,
      customerId: finalCustomerId,
      message: `Sender onboarded with Customer ID: ${finalCustomerId}`
    });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function senderVerifyOtp(req, res) {
  try {
    const { customerId, otp, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!otp) throw badRequest("otp is required");
    const data = await verifyCustomerOtp({ customerId, otp, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function senderValidateAadhaar(req, res) {
  try {
    const { customerId } = req.params;
    const { aadhaar, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!aadhaar) throw badRequest("aadhaar is required");
    const data = await validateSenderAadhaar({ customerId, aadhaar, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function senderValidatePan(req, res) {
  try {
    const { customerId } = req.params;
    const { pan, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!pan) throw badRequest("pan is required");
    const data = await validateSenderPan({ customerId, pan, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

// -------------------- Recipients --------------------

export async function recipientList(req, res) {
  try {
    const { customerId } = req.params;
    if (!customerId) throw badRequest("customerId is required");
    
    console.log(`[PPI Controller] Getting recipient list for: ${customerId}`);
    
    const data = await getRecipients({ customerId });
    
    // ✅ Ensure proper response format with all recipient details
    const response = {
      success: true,
      message: "Recipient list retrieved successfully",
      data: {
        customer_id: data.customer_id || customerId,
        recipients: data.recipients || data.recipient || [],
        total_recipients: (data.recipients || data.recipient || []).length,
        last_updated: new Date().toISOString()
      }
    };
    
    console.log(`[PPI Controller] Recipient list response:`, response);
    return res.json(response);
  } catch (e) {
    return sendError(res, e);
  }
}

export async function recipientAdd(req, res) {
  try {
    const { customerId } = req.params;
    const { name, mobile, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!name) throw badRequest("name is required");
    if (!mobile) throw badRequest("mobile is required");
    
    console.log(`[PPI Controller] Adding recipient: ${customerId}, name: ${name}, mobile: ${mobile}`);
    
    const data = await addRecipient({ customerId, name, mobile, extra });
    
    // ✅ Ensure recipient_id is properly returned in response
    const response = {
      success: true,
      message: "Recipient added successfully",
      data: {
        customer_id: data.customer_id || customerId,
        recipient: {
          recipient_id: data.recipient?.recipient_id || data.recipient_id,
          name: data.recipient?.name || name,
          mobile: data.recipient?.mobile || mobile,
          bank: data.recipient?.bank || null,
          created_at: new Date().toISOString()
        }
      }
    };
    
    console.log(`[PPI Controller] Recipient added response:`, response);
    return res.json(response);
  } catch (e) {
    return sendError(res, e);
  }
}

export async function recipientAddBank(req, res) {
  try {
    const { customerId } = req.params;
    const { recipientId, accountNumber, ifsc, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!recipientId) throw badRequest("recipientId is required");
    if (!accountNumber) throw badRequest("accountNumber is required");
    if (!ifsc) throw badRequest("ifsc is required");
    const data = await addRecipientBank({ customerId, recipientId, accountNumber, ifsc, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

// -------------------- Transactions --------------------

export async function txnSendOtp(req, res) {
  try {
    const { customerId } = req.params;
    const { amount, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw badRequest("amount must be a positive number");
    const data = await sendTransactionOtp({ customerId, amount: amt, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function txnInitiate(req, res) {
  try {
    const { customerId } = req.params;
    const { recipientId, amount, otp, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!recipientId) throw badRequest("recipientId is required");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw badRequest("amount must be a positive number");
    if (!otp) throw badRequest("otp is required (use 123456 in mock mode)");

    const clientRefId = `PPI_${Date.now()}`;

    const tx = await Transaction.create({
      amount: amt,
      type: "PPI",
      status: "PENDING",
      initiatedBy: req.user?.id,
      idempotencyKey: clientRefId,
      meta: {
        channel: "PPI_DIGIKHATA",
        customerId,
        recipientId,
        clientRefId,
      },
    });

    try {
      const provider = await initiateTransaction({
        customerId,
        recipientId,
        amount: amt,
        otp,
        clientRefId,
        extra,
      });

      const finalStatus = mapTxStatus(provider);
      tx.status = finalStatus;
      tx.meta = { ...tx.meta, providerResponse: provider };
      await tx.save();

      // ✅ Deduct from PPI Wallet if SUCCESS
      if (finalStatus === "SUCCESS") {
        try {
          const ppiWallet = await PpiWallet.findOne({ 
            user: req.user.id, 
            status: "ACTIVE" 
          });
          
          if (ppiWallet) {
            await ppiWallet.deductBalance(amt);
            // Link transaction to PPI wallet
            tx.meta.ppiWalletId = ppiWallet._id;
          } else {
            console.warn(`PPI Wallet not found for user ${req.user.id}`);
          }
        } catch (balanceError) {
          console.error("Balance deduction failed:", balanceError);
          // Don't fail the transaction, but log the error
        }
      }

      if (finalStatus === "FAILED") {
        const norm = normalizeEkoError(provider);
        return res.status(400).json({
          success: false,
          message: norm.message,
          transaction: tx,
          provider,
        });
      }

      return res.json({
        success: true,
        data: { transaction: tx, provider },
      });
    } catch (err) {
      tx.status = "FAILED";
      tx.meta = {
        ...tx.meta,
        providerError: {
          message: err?.message,
          response: err?.response?.data,
          status: err?.response?.status,
        },
      };
      await tx.save();
      throw err;
    }
  } catch (e) {
    return sendError(res, e);
  }
}

// -------------------- Admin Functions --------------------

export async function createWalletForUser(req, res) {
  try {
    const { email, name, mobile, customerId, initialBalance = 25000 } = req.body || {};
    
    // Only admin can create wallet for users
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required to create wallet for users" 
      });
    }
    
    if (!email) throw badRequest("email is required");
    if (!name) throw badRequest("name is required");
    if (!mobile) throw badRequest("mobile is required");
    
    // Find user by email
    const User = (await import("../models/User.model.js")).default;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found with this email" 
      });
    }
    
    // Check if wallet already exists
    const existingWallet = await PpiWallet.findOne({ 
      $or: [{ user: user._id }, { customerId }] 
    });
    
    if (existingWallet) {
      return res.status(400).json({ 
        success: false, 
        message: "Wallet already exists for this user or Customer ID",
        existingWallet: {
          customerId: existingWallet.customerId,
          mobile: existingWallet.mobile,
          status: existingWallet.status
        }
      });
    }
    
    // Create new wallet
    const finalCustomerId = customerId || mobile || `CUST${user._id}`;
    
    const wallet = await PpiWallet.create({
      user: user._id,
      customerId: finalCustomerId,
      mobile,
      name,
      monthlyLimit: initialBalance,
      remainingLimit: initialBalance,
      kycStatus: "MIN",
      status: "ACTIVE"
    });
    
    console.log(`[PPI Admin] Wallet created for user ${email}, Customer ID: ${finalCustomerId}`);
    
    return res.json({ 
      success: true, 
      message: "Wallet created successfully for user",
      wallet: {
        customerId: wallet.customerId,
        name: wallet.name,
        mobile: wallet.mobile,
        monthlyLimit: wallet.monthlyLimit,
        remainingLimit: wallet.remainingLimit,
        kycStatus: wallet.kycStatus,
        status: wallet.status,
        user: {
          email: user.email,
          fullName: user.fullName || name
        },
        createdAt: wallet.createdAt
      }
    });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function deletePpiWallet(req, res) {
  try {
    const { customerId } = req.params;
    if (!customerId) throw badRequest("customerId is required");
    
    // Only admin or wallet owner can delete
    const ppiWallet = await PpiWallet.findOne({ customerId });
    if (!ppiWallet) {
      return res.status(404).json({ 
        success: false, 
        message: "PPI wallet not found" 
      });
    }
    
    // Check if user is admin or wallet owner
    if (req.user.role !== 'ADMIN' && ppiWallet.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to delete this wallet" 
      });
    }
    
    // Delete the wallet
    await PpiWallet.deleteOne({ customerId });
    
    return res.json({ 
      success: true, 
      message: `PPI wallet for Customer ID: ${customerId} deleted successfully`,
      deletedWallet: {
        customerId: ppiWallet.customerId,
        user: ppiWallet.user,
        name: ppiWallet.name
      }
    });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function updateCustomerId(req, res) {
  try {
    const { oldCustomerId } = req.params;
    const { newCustomerId, name, mobile } = req.body || {};
    
    if (!oldCustomerId) throw badRequest("oldCustomerId is required");
    if (!newCustomerId) throw badRequest("newCustomerId is required");
    
    // Find existing wallet
    const oldWallet = await PpiWallet.findOne({ customerId: oldCustomerId });
    if (!oldWallet) {
      return res.status(404).json({ 
        success: false, 
        message: "PPI wallet not found" 
      });
    }
    
    // Check authorization
    if (req.user.role !== 'ADMIN' && oldWallet.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to update this wallet" 
      });
    }
    
    // Check if new Customer ID already exists
    const existingWallet = await PpiWallet.findOne({ customerId: newCustomerId });
    if (existingWallet) {
      return res.status(409).json({ 
        success: false, 
        message: "New Customer ID already exists" 
      });
    }
    
    // Update the wallet
    const updatedWallet = await PpiWallet.findOneAndUpdate(
      { customerId: oldCustomerId },
      { 
        customerId: newCustomerId,
        name: name || oldWallet.name,
        mobile: mobile || oldWallet.mobile
      },
      { new: true }
    );
    
    return res.json({ 
      success: true, 
      message: `Customer ID updated from ${oldCustomerId} to ${newCustomerId}`,
      oldCustomerId,
      newWallet: updatedWallet
    });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function getWalletDetails(req, res) {
  try {
    const { customerId } = req.params;
    
    let wallet;
    if (customerId) {
      wallet = await PpiWallet.findOne({ customerId }).populate('user', 'email fullName');
    } else if (req.user) {
      // Get current user's wallet
      wallet = await PpiWallet.findOne({ user: req.user.id }).populate('user', 'email fullName');
    }
    
    if (!wallet) {
      return res.status(404).json({ 
        success: false, 
        message: "PPI wallet not found" 
      });
    }
    
    // Check authorization
    if (req.user.role !== 'ADMIN' && wallet.user._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to view this wallet" 
      });
    }
    
    return res.json({ 
      success: true, 
      wallet: {
        customerId: wallet.customerId,
        name: wallet.name,
        mobile: wallet.mobile,
        monthlyLimit: wallet.monthlyLimit,
        remainingLimit: wallet.remainingLimit,
        kycStatus: wallet.kycStatus,
        status: wallet.status,
        lastResetDate: wallet.lastResetDate,
        createdAt: wallet.createdAt,
        user: wallet.user
      }
    });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function reloadWalletBalance(req, res) {
  try {
    const { customerId, amount, reason } = req.body || {};
    
    // Only admin can reload wallet
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required to reload wallet balance" 
      });
    }
    
    if (!customerId) throw badRequest("customerId is required");
    if (!amount || amount <= 0) throw badRequest("amount must be positive");
    
    const wallet = await PpiWallet.findOne({ customerId });
    if (!wallet) {
      return res.status(404).json({ 
        success: false, 
        message: "PPI wallet not found" 
      });
    }
    
    const oldBalance = wallet.remainingLimit;
    const oldMonthlyLimit = wallet.monthlyLimit;
    
    // Add amount to both remaining and monthly limit
    wallet.remainingLimit += amount;
    wallet.monthlyLimit += amount;
    
    await wallet.save();
    
    console.log(`[PPI Admin] Wallet reloaded: ${customerId}, amount: ₹${amount}, reason: ${reason}`);
    
    return res.json({ 
      success: true, 
      message: `Wallet reloaded successfully with ₹${amount}`,
      customerId,
      reloadDetails: {
        amount,
        reason: reason || "Manual reload by admin",
        oldBalance,
        newBalance: wallet.remainingLimit,
        oldMonthlyLimit,
        newMonthlyLimit: wallet.monthlyLimit,
        reloadedBy: req.user.id,
        reloadedAt: new Date()
      }
    });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function getWalletBalanceInfo(req, res) {
  try {
    const { customerId } = req.params;
    
    let wallet;
    if (customerId) {
      wallet = await PpiWallet.findOne({ customerId });
    } else if (req.user) {
      wallet = await PpiWallet.findOne({ user: req.user.id });
    }
    
    if (!wallet) {
      return res.status(404).json({ 
        success: false, 
        message: "PPI wallet not found" 
      });
    }
    
    // Check if user is admin or wallet owner
    if (req.user.role !== 'ADMIN' && wallet.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to view this wallet" 
      });
    }
    
    wallet.resetMonthlyLimitIfNeeded();
    await wallet.save();
    
    const daysUntilReset = calculateDaysUntilMonthEnd(wallet.lastResetDate);
    const canTransact = wallet.canTransact(1); // Check with ₹1
    
    return res.json({ 
      success: true, 
      walletInfo: {
        customerId: wallet.customerId,
        name: wallet.name,
        mobile: wallet.mobile,
        currentBalance: wallet.remainingLimit,
        monthlyLimit: wallet.monthlyLimit,
        usedThisMonth: wallet.monthlyLimit - wallet.remainingLimit,
        percentageUsed: ((wallet.monthlyLimit - wallet.remainingLimit) / wallet.monthlyLimit * 100).toFixed(2),
        kycStatus: wallet.kycStatus,
        status: wallet.status,
        canTransact,
        lastResetDate: wallet.lastResetDate,
        nextResetDate: getNextMonthReset(wallet.lastResetDate),
        daysUntilReset,
        isLimitReached: wallet.remainingLimit <= 0,
        recommendations: getRecommendations(wallet.remainingLimit, wallet.monthlyLimit, daysUntilReset)
      }
    });
  } catch (e) {
    return sendError(res, e);
  }
}

function calculateDaysUntilMonthEnd(lastResetDate) {
  const now = new Date();
  const lastReset = new Date(lastResetDate);
  
  // If reset already happened this month, calculate until next month end
  if (now.getMonth() === lastReset.getMonth() && now.getFullYear() === lastReset.getFullYear()) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const diffTime = nextMonth - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // If reset hasn't happened this month, it should reset now
  return 0;
}

function getNextMonthReset(lastResetDate) {
  const now = new Date();
  const lastReset = new Date(lastResetDate);
  
  // If reset already happened this month, next reset is next month 1st
  if (now.getMonth() === lastReset.getMonth() && now.getFullYear() === lastReset.getFullYear()) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  
  // Reset should happen now
  return now;
}

function getRecommendations(remainingLimit, monthlyLimit, daysUntilReset) {
  const percentageUsed = ((monthlyLimit - remainingLimit) / monthlyLimit * 100);
  const recommendations = [];
  
  if (remainingLimit <= 0) {
    recommendations.push({
      type: "critical",
      message: "Monthly limit exhausted. Wait for auto-reset or contact admin for reload.",
      action: "WAIT_FOR_RESET"
    });
  } else if (percentageUsed >= 90) {
    recommendations.push({
      type: "warning", 
      message: `Only ₹${remainingLimit} remaining (${100-percentageUsed.toFixed(1)}% left). Use wisely.`,
      action: "USE_WISELY"
    });
  } else if (percentageUsed >= 75) {
    recommendations.push({
      type: "info",
      message: `${daysUntilReset} days until monthly reset. Plan transactions accordingly.`,
      action: "PLAN_TRANSACTIONS"
    });
  }
  
  if (remainingLimit < 1000) {
    recommendations.push({
      type: "suggestion",
      message: "Low balance. Consider reloading for emergencies.",
      action: "CONSIDER_RELOAD"
    });
  }
  
  return recommendations;
}

export async function listAllWallets(req, res) {
  try {
    // Only admin can list all wallets
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }
    
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter = {};
    if (status) filter.status = status;
    
    const wallets = await PpiWallet.find(filter)
      .populate('user', 'email fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await PpiWallet.countDocuments(filter);
    
    return res.json({ 
      success: true, 
      wallets,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function txnInquiry(req, res) {
  try {
    const { clientRefId } = req.params;
    if (!clientRefId) throw badRequest("clientRefId is required");
    const data = await transactionInquiry({ clientRefId });

    // ✅ Update local transaction status if it was PENDING
    const tx = await Transaction.findOne({ idempotencyKey: clientRefId });
    if (tx && tx.status === "PENDING") {
      const newStatus = mapTxStatus(data);
      if (newStatus !== "PENDING") {
        tx.status = newStatus;
        tx.meta = { ...tx.meta, inquiryResponse: data };
        await tx.save();

        if (newStatus === "SUCCESS") {
          const amt = tx.amount;
          try {
            const ppiWallet = await PpiWallet.findOne({ 
              user: tx.initiatedBy, 
              status: "ACTIVE" 
            });
            
            if (ppiWallet) {
              await ppiWallet.deductBalance(amt);
              tx.meta.ppiWalletId = ppiWallet._id;
            } else {
              console.warn(`PPI Wallet not found for user ${tx.initiatedBy}`);
            }
          } catch (balanceError) {
            console.error("Balance deduction failed during inquiry:", balanceError);
          }
        }
      }
    }

    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

