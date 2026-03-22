// Mock AEPS Service for testing
class MockAepsService {
  constructor() {
    this.isMockMode = process.env.AEPS_MODE === 'mock';
  }

  // Check if mock mode is enabled
  isMockEnabled() {
    return this.isMockMode;
  }

  // Mock agent status check
  async checkAgentStatus(userId) {
    if (!this.isMockMode) return null;
    
    return {
      success: true,
      data: {
        agentId: 'MOCK_AGENT_ID_001',
        agent_id: 'MOCK_AGENT_ID_001', // For compatibility
        userId: userId,
        status: 'APPROVED',
        kycStatus: 'DONE',
        outletId: 'MOCK_OUTLET_001',
        approvedAt: new Date().toISOString()
      }
    };
  }

  // Mock cash withdrawal
  async cashWithdrawal(data) {
    if (!this.isMockMode) return null;
    
    const { amount, customerAadhaar, customerMobile, bankAccountNo } = data;
    
    return {
      success: true,
      data: {
        transaction_id: `TXN_${Date.now()}`,
        rrn: `RRN${Date.now()}`,
        amount: amount,
        status: 'SUCCESS',
        customerAadhaar,
        customerMobile,
        bankAccountNo,
        processedAt: new Date().toISOString()
      }
    };
  }

  // Mock fingerprint verification
  verifyMockFingerprint(fingerprintData) {
    if (!this.isMockMode) return false;
    return fingerprintData === 'MOCK_FINGER_DATA';
  }
}

export default new MockAepsService();
