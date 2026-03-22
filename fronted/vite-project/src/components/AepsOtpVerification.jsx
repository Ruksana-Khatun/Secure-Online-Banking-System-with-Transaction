import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Alert, Tag } from 'antd';
import { MobileOutlined, SafetyOutlined, ShopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
// ✅ Bug Fix #3: axios hataya, project ka request.js use karo
import { useAuth } from '../auth/useAuth';

const { Title, Text } = Typography;

const AepsOtpVerification = () => {
  const [loading, setLoading]   = useState(false);
  const [otpSent, setOtpSent]   = useState(false);
  const [mobile, setMobile]     = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [agentData, setAgentData] = useState(null);
  const [form] = Form.useForm();

  const location = useLocation();
  const navigate = useNavigate();

  // ✅ authedRequest — token auto attach + auto refresh
  const { authedRequest } = useAuth();

  // Auto-populate from registration state
  useEffect(() => {
    const state = location.state;
    if (state?.mobile) {
      setMobile(state.mobile);
      setAgentData({
        agentId:  state.agentId,
        outletId: state.outletId,
      });
      form.setFieldsValue({ mobile: state.mobile });
      // ✅ Bug Fix #2: mobile directly pass karo
      sendOtp(state.mobile);
    }
  }, []);

  // ✅ Start countdown helper
  const startCountdown = () => {
    setTimeLeft(60);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ✅ Bug Fix #1 + #2: Token attach kiya, mobile parameter fix kiya
  const sendOtp = async (mobileNumber) => {
    // mobileNumber parameter se lo, nahi toh state se
    const mobileToUse = mobileNumber || mobile;

    if (!mobileToUse) {
      message.error('Mobile number is required');
      return;
    }

    try {
      setLoading(true);

      const data = await authedRequest('/api/aeps/send-otp', {
        method: 'POST',
        body:   { mobile: mobileToUse },
      });

      if (data.success) {
        setOtpSent(true);
        startCountdown();
        message.success('OTP sent to your mobile number');
      }
    } catch (error) {
      message.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Token attach kiya
  const verifyOtp = async (values) => {
    try {
      setLoading(true);

      const data = await authedRequest('/api/aeps/authenticate', {
        method: 'POST',
        body:   { mobile, otp: values.otp },
      });

      if (data.success) {
        message.success('OTP verified successfully!');
        setAgentData(data.data);
        setTimeout(() => navigate('/aeps/kyc'), 2000);
      }
    } catch (error) {
      message.error(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileSubmit = (values) => {
    setMobile(values.mobile);
    sendOtp(values.mobile); // ✅ Form se mobile directly pass
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card style={{ width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}>
            <SafetyOutlined />
          </div>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            OTP Verification
          </Title>
          <Text type="secondary">
            Verify your mobile number for AEPS activation
          </Text>
        </div>

        {/* Outlet ID */}
        {agentData?.outletId && (
          <Alert
            title={
              <div style={{ textAlign: 'center' }}>
                <ShopOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                <Text strong>Your Outlet ID: </Text>
                <Tag color="success" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {agentData.outletId}
                </Tag>
              </div>
            }
            type="success"
            style={{ marginBottom: '24px', borderRadius: '8px' }}
            showIcon={false}
          />
        )}

        {/* Mobile Input Form */}
        {!otpSent ? (
          <Form form={form} layout="vertical" onFinish={handleMobileSubmit}>
            <Form.Item
              name="mobile"
              label="Mobile Number"
              rules={[
                { required: true, message: 'Please enter your mobile number' },
                { pattern: /^[6-9]\d{9}$/, message: 'Valid 10-digit mobile required' }
              ]}
            >
              <Input
                prefix={<MobileOutlined />}
                placeholder="Enter Mobile Number"
                maxLength={10}
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large" block>
                Send OTP
              </Button>
            </Form.Item>
          </Form>
        ) : (
          // OTP Form
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Text type="secondary">
                OTP sent to: <strong>{mobile}</strong>
              </Text>
            </div>

            <Form layout="vertical" onFinish={verifyOtp}>
              <Form.Item
                name="otp"
                label="Enter OTP"
                rules={[
                  { required: true, message: 'Please enter OTP' },
                  { pattern: /^\d{6}$/, message: 'OTP must be 6 digits' }
                ]}
              >
                <Input
                  size="large"
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
                  placeholder="------"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} size="large" block>
                  Verify OTP
                </Button>
              </Form.Item>
            </Form>

            {/* Resend */}
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              {timeLeft > 0 ? (
                <Text type="secondary">Resend OTP in {formatTime(timeLeft)}</Text>
              ) : (
                <Button type="link" onClick={() => sendOtp(mobile)} loading={loading}>
                  Resend OTP
                </Button>
              )}
            </div>

            {/* Mock hint */}
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                🧪 Mock Mode — Test OTP: <strong>123456</strong>
              </Text>
            </div>
          </div>
        )}

        {/* Success */}
        {agentData?.authenticated && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Text style={{ color: '#52c41a' }}>
              ✓ Authentication successful! Redirecting to KYC...
            </Text>
          </div>
        )}

        {/* Back Button */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Button type="link" onClick={() => navigate('/aeps/pending')}>
            Back to Status Check
          </Button>
        </div>

      </Card>
    </div>
  );
};

export default AepsOtpVerification;