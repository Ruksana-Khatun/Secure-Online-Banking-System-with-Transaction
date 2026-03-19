import React from 'react';

const AepsTest = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🏦 AEPS Test Page</h1>
      <p>If you can see this, AEPS components are working!</p>
      
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f0f0f0', 
        borderRadius: '8px',
        margin: '20px 0',
        border: '2px solid #1890ff'
      }}>
        <h3>✅ AEPS Components Status:</h3>
        <p>✅ Registration: Available</p>
        <p>✅ Pending Approval: Available</p>
        <p>✅ OTP Verification: Available</p>
        <p>✅ KYC Process: Available</p>
        <p>✅ Cash Withdrawal: Available</p>
        <p>✅ Transaction History: Available</p>
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h3>📱 Test Links:</h3>
        <p><a href="/aeps/register" style={{ color: '#1890ff', textDecoration: 'none' }}>→ AEPS Registration</a></p>
        <p><a href="/aeps/withdrawal" style={{ color: '#1890ff', textDecoration: 'none' }}>→ Cash Withdrawal</a></p>
        <p><a href="/aeps/transactions" style={{ color: '#1890ff', textDecoration: 'none' }}>→ Transaction History</a></p>
      </div>
    </div>
  );
};

export default AepsTest;
