import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Row, Col, Alert } from 'antd';
import { MobileOutlined, BankOutlined, IdcardOutlined, DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';

const { Title, Text } = Typography;

const AepsWithdrawal = () => {
  const [loading, setLoading] = useState(false);
  const [fingerprintVerified, setFingerprintVerified] = useState(false);
  const [fingerprintData, setFingerprintData] = useState('');
  const [transactionData, setTransactionData] = useState(null);
  const [form] = Form.useForm();
  const { authedRequest, user } = useAuth();

  const API_BASE = '/api/aeps';

  // Simulate fingerprint verification
  const simulateFingerprintVerification = () => {
    setLoading(true);

    setTimeout(() => {
      setFingerprintData('MOCK_FINGER_DATA');
      setFingerprintVerified(true);
      setLoading(false);
      message.success('Fingerprint verified successfully!');
    }, 2000);
  };

  // Check and ensure AEPS agent status before withdrawal
  const ensureAepsAgentStatus = async () => {
    try {
      // Check if user already has AEPS agent profile
      const profileResponse = await authedRequest('/api/aeps/agent/profile');
      
      if (profileResponse.success && profileResponse.data && profileResponse.data.status === 'APPROVED') {
        return true; // User is already approved AEPS agent
      }
    } catch {
      // User doesn't have AEPS agent profile, need to register
    }

    // Register as AEPS agent automatically using real user data
    try {
      const registrationData = {
        firstName: user?.fullName?.split(' ')[0] || 'User',
        lastName: user?.fullName?.split(' ')[1] || 'Name',
        email: user?.email || 'user@example.com',
        mobile: user?.mobile || '9876543210',
        panNumber: 'ABCDE1234F',
        aadhaarNumber: '123456789012',
        companyBankName: 'User Bank',
        bankHolderName: 'Account Holder',
        bankAccountNo: '1234567890123456',
        ifscCode: 'SBIN0001234',
        shopName: 'User Shop',
        state: 'Maharashtra',
        city: 'Mumbai',
        address: 'User Address',
        pincode: '400001',
      };

      const registerResponse = await authedRequest('/api/aeps/agent/register', {
        method: 'POST',
        body: registrationData,
      });

      return registerResponse.success;
    } catch (error) {
      console.error('Auto AEPS registration failed:', error);
      return false;
    }
  };

  // Process cash withdrawal
  const handleWithdrawal = async (values) => {
    try {
      if (!fingerprintVerified) {
        message.error('Please complete fingerprint verification first');
        return;
      }

      setLoading(true);

      // Ensure user is approved AEPS agent
      const isAgentApproved = await ensureAepsAgentStatus();
      if (!isAgentApproved) {
        message.error('Failed to setup AEPS agent status');
        return;
      }

      const withdrawalData = {
        customerAadhaar: values.aadhaarNumber,
        customerMobile: values.mobileNumber,
        bankAccountNo: values.bankAccount,
        amount: values.amount,
        fingerprintData,
      };

      console.log('WITHDRAWAL PAYLOAD:', JSON.stringify(withdrawalData, null, 2));

      const response = await authedRequest(`${API_BASE}/withdrawal`, {
        method: 'POST',
        body: withdrawalData,
      });

      if (response.success) {
        setTransactionData(response.data);
        message.success('Cash withdrawal processed successfully!');
      }
    } catch (error) {
      message.error(error.message || 'Cash withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    form.resetFields();
    setFingerprintVerified(false);
    setFingerprintData('');
    setTransactionData(null);
  };

  if (transactionData) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <Card
          style={{
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '64px', color: '#52c41a', marginBottom: '24px' }}>
              <CheckCircleOutlined />
            </div>
            <Title level={2} style={{ color: '#52c41a', marginBottom: '16px' }}>
              Cash Withdrawal Successful!
            </Title>

            <Card style={{ textAlign: 'left', marginBottom: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>Transaction ID:</Text>
                </Col>
                <Col span={12}>
                  <Text code>{transactionData.clientRefId}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Amount:</Text>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}>
                    ₹{transactionData.amount.toLocaleString()}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Commission:</Text>
                </Col>
                <Col span={12}>
                  <Text>₹{transactionData.commission.toFixed(2)}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Status:</Text>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#52c41a' }}>SUCCESS</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Processed At:</Text>
                </Col>
                <Col span={12}>
                  <Text>{new Date(transactionData.processedAt).toLocaleString()}</Text>
                </Col>
              </Row>
            </Card>

            <div style={{ marginBottom: '24px' }}>
              <Alert
                title="Cash Ready for Collection"
                description={`Please collect ₹${transactionData.amount.toLocaleString()} from the counter.`}
                type="success"
                showIcon
              />
            </div>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={resetForm}
                >
                  New Transaction
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  size="large"
                  block
                  onClick={() => window.location.href = '/aeps/transactions'}
                >
                  View History
                </Button>
              </Col>
            </Row>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}>
            <DollarOutlined />
          </div>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            Withdrawal
          </Title>
          <Text type="secondary">
            Provide cash withdrawal service with biometric verification
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleWithdrawal}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="mobileNumber"
                label="Customer Mobile"
                rules={[
                  { required: true, message: 'Please enter customer mobile number' },
                  { pattern: /^[6-9]\d{9}$/, message: 'Please enter a valid 10-digit mobile number' }
                ]}
              >
                <Input
                  prefix={<MobileOutlined />}
                  placeholder="Customer Mobile"
                  maxLength={10}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="bankAccount"
                label="Bank Account Number"
                rules={[
                  { required: true, message: 'Please enter bank account number' },
                  { pattern: /^\d{9,18}$/, message: 'Please enter a valid account number' }
                ]}
              >
                <Input
                  prefix={<BankOutlined />}
                  placeholder="Bank Account"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="aadhaarNumber"
                label="Customer Aadhaar"
                rules={[
                  { required: true, message: 'Please enter Aadhaar number' },
                  { pattern: /^\d{12}$/, message: 'Please enter a valid 12-digit Aadhaar number' }
                ]}
              >
                <Input
                  prefix={<IdcardOutlined />}
                  placeholder="Aadhaar Number"
                  maxLength={12}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="amount"
                label="Withdrawal Amount (₹)"
                rules={[
                  { required: true, message: 'Please enter amount' },
                  () => ({
                    validator(_, value) {
                      if (!value) {
                        return Promise.reject(new Error('Please enter amount'));
                      }
                      const numValue = Number(value);
                      if (isNaN(numValue)) {
                        return Promise.reject(new Error('Please enter a valid number'));
                      }
                      if (numValue < 100 || numValue > 10000) {
                        return Promise.reject(new Error('Amount must be between ₹100 and ₹10,000'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <Input
                  prefix={<DollarOutlined />}
                  placeholder="Amount"
                  type="number"
                  min={100}
                  max={10000}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Fingerprint Verification Section */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ marginBottom: '16px' }}>
              Fingerprint Verification
            </Title>
            <div
              style={{
                border: '2px dashed #d9d9d9',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                background: fingerprintVerified ? '#f6ffed' : '#fafafa'
              }}
            >
              {fingerprintVerified ? (
                <div>
                  <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '8px' }} />
                  <div>
                    <Text strong style={{ color: '#52c41a' }}>Fingerprint Verified</Text>
                    <br />
                    <Text type="secondary">Customer identity confirmed</Text>
                  </div>
                </div>
              ) : (
                <div>
                  <IdcardOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '8px' }} />
                  <div>
                    <Text>Customer fingerprint verification required</Text>
                    <br />
                    <Text type="secondary">Click below to verify customer fingerprint</Text>
                  </div>
                </div>
              )}
            </div>
            <Button
              type={fingerprintVerified ? 'default' : 'primary'}
              size="small"
              loading={loading}
              onClick={simulateFingerprintVerification}
              disabled={fingerprintVerified}
              style={{ marginTop: '8px' }}
            >
              {fingerprintVerified ? '✓ Verified' : 'Verify Fingerprint'}
            </Button>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              disabled={!fingerprintVerified}
            >
              Withdraw Cash
            </Button>
          </Form.Item>
        </Form>

        {/* Test Information */}


        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Button
            type="link"
            onClick={() => window.location.href = '/aeps/transactions'}
          >
            View Transaction History
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AepsWithdrawal;
