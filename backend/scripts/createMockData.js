import User from "../models/User.model.js";
import PpiWallet from "../models/PpiWallet.model.js";
import Transaction from "../models/Transaction.model.js";
import bcrypt from "bcrypt";

// Mock data for testing
export async function createMockData() {
  try {
    console.log("🌱 Creating mock data for Admin Dashboard testing...");

    // Create Admin User
    const adminExists = await User.findOne({ email: "admin@test.com" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const admin = await User.create({
        fullName: "Admin User",
        email: "admin@test.com",
        passwordHash: hashedPassword,
        role: "ADMIN",
        isApproved: true,
        mobile: "9999999999"
      });
      console.log("✅ Admin user created: admin@test.com / admin123");
    }

    // Create Mock Agents
    const mockAgents = [
      {
        fullName: "Rajesh Kumar",
        email: "rajesh@agent.com",
        password: "agent123",
        mobile: "9876543210",
        address: "123 Main St, Mumbai",
        isApproved: false
      },
      {
        fullName: "Priya Sharma",
        email: "priya@agent.com", 
        password: "agent123",
        mobile: "9876543211",
        address: "456 Park Ave, Delhi",
        isApproved: true,
        outletId: "OT_1234"
      },
      {
        fullName: "Amit Patel",
        email: "amit@agent.com",
        password: "agent123", 
        mobile: "9876543212",
        address: "789 Market Rd, Bangalore",
        isApproved: true,
        outletId: "OT_5678"
      }
    ];

    for (const agentData of mockAgents) {
      const agentExists = await User.findOne({ email: agentData.email });
      if (!agentExists) {
        const hashedPassword = await bcrypt.hash(agentData.password, 10);
        const agent = await User.create({
          ...agentData,
          passwordHash: hashedPassword,
          role: "AGENT"
        });
        console.log(`✅ Agent created: ${agent.email}`);
      }
    }

    // Create Mock Users
    const mockUsers = [
      {
        fullName: "John Doe",
        email: "john@test.com",
        password: "user123",
        mobile: "8888888881",
        address: "111 First St, Mumbai"
      },
      {
        fullName: "Jane Smith", 
        email: "jane@test.com",
        password: "user123",
        mobile: "8888888882",
        address: "222 Second St, Delhi"
      },
      {
        fullName: "Mike Johnson",
        email: "mike@test.com", 
        password: "user123",
        mobile: "8888888883",
        address: "333 Third St, Bangalore"
      }
    ];

    for (const userData of mockUsers) {
      const userExists = await User.findOne({ email: userData.email });
      if (!userExists) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await User.create({
          ...userData,
          passwordHash: hashedPassword,
          role: "USER"
        });
        console.log(`✅ User created: ${user.email}`);
      }
    }

    // Create Mock PPI Wallets
    const users = await User.find({ role: "USER" });
    for (const user of users) {
      const walletExists = await PpiWallet.findOne({ user: user._id });
      if (!walletExists) {
        const wallet = await PpiWallet.create({
          user: user._id,
          customerId: `CUST${user.mobile}`,
          mobile: user.mobile,
          name: user.fullName,
          monthlyLimit: 25000,
          remainingLimit: 15000 + Math.floor(Math.random() * 10000),
          kycStatus: "FULL",
          status: "ACTIVE"
        });
        console.log(`✅ PPI Wallet created for: ${user.fullName}`);
      }
    }

    // Create Mock Transactions
    const transactionCount = await Transaction.countDocuments();
    if (transactionCount < 50) {
      const statuses = ["SUCCESS", "PENDING", "FAILED"];
      const types = ["PPI", "BANK_TRANSFER", "UPI"];
      
      for (let i = 0; i < 50; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const amount = Math.floor(Math.random() * 5000) + 100;
        
        const transaction = await Transaction.create({
          amount,
          type: randomType,
          status: randomStatus,
          initiatedBy: randomUser._id,
          idempotencyKey: `TXN_${Date.now()}_${i}`,
          meta: {
            senderMobile: randomUser.mobile,
            recipientAccount: `998877665${i}`,
            description: `Mock transaction ${i + 1}`,
            channel: randomType === "PPI" ? "DIGIKHATA_PPI" : "BANK"
          },
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random within last 30 days
        });
      }
      console.log("✅ 50 mock transactions created");
    }

    console.log("🎉 Mock data creation completed!");
    console.log("\n📋 Login Credentials:");
    console.log("Admin: admin@test.com / admin123");
    console.log("Agents: rajesh@agent.com / agent123 (pending)");
    console.log("        priya@agent.com / agent123 (approved)");
    console.log("        amit@agent.com / agent123 (approved)");
    console.log("Users: john@test.com / user123");
    console.log("       jane@test.com / user123");
    console.log("       mike@test.com / user123");

  } catch (error) {
    console.error("❌ Error creating mock data:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createMockData().then(() => {
    console.log("🚀 Mock data script completed!");
    process.exit(0);
  });
}
