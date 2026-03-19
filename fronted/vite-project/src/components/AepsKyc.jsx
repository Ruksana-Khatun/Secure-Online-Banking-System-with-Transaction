import React, { useState } from 'react';
import {
  Form, Input, Button, Card, message, Typography, Steps, Upload
} from 'antd';
import {
  IdcardOutlined,
  CheckCircleOutlined,
  ScanOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const { Title, Text } = Typography;

const AepsKyc = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [shopPhoto, setShopPhoto] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const navigate = useNavigate();
  useAuth();

  // ─────────────────────────────────────────────
  // Step 1 — Aadhaar + PAN submit
  // ─────────────────────────────────────────────
  const handleDocumentSubmit = (values) => {
    setAadhaarNumber(values.aadhaarNumber);
    setPanNumber(values.panNumber);
    setCurrentStep(1);
  };

  // ─────────────────────────────────────────────
  // Step 2 — Photo upload (optional mock mein)
  // ─────────────────────────────────────────────
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.jpg,.jpeg,.png',
    beforeUpload: (file) => {
      const isImage = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
      if (!isImage) {
        message.error('only JPG ya PNG file upload!');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('File lees then 5MB!');
        return false;
      }
      setShopPhoto(file);
      message.success(`${file.name} selected!`);
      return false; // auto upload band
    },
  };

  // ─────────────────────────────────────────────
  // Step 3 — Final KYC Submit
  // ─────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    try {
      setLoading(true);

      // ✅ Real API call connect kiya
      await authedRequest('/api/aeps/agent/kyc-submit', {
        method: 'POST',
        body: { aadhaarNumber, panNumber, shopPhotoUploaded: !!shopPhoto },
      });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSubmitted(true);
      setCurrentStep(2);
      message.success('KYC successfully submit!');

    } catch (error) {
      message.error(error.message || 'KYC submit failed!');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Step Content
  // ─────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {

      // ── Step 0: Documents ──────────────────────
      case 0:
        return (
          <div>
            <div style={styles.stepHeader}>
              <IdcardOutlined style={styles.stepIcon} />
              <Title level={3} style={styles.stepTitle}>Documents Verify</Title>
              <Text type="secondary">Enter Aadhaar and PAN number</Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleDocumentSubmit}
              style={{ marginTop: 24 }}
            >
              {/* Aadhaar */}
              <Form.Item
                name="aadhaarNumber"
                label="Aadhaar Number"
                rules={[
                  { required: true, message: 'Aadhaar number required' },
                  { pattern: /^\d{12}$/, message: '12 digit Aadhaar number required' },
                ]}
              >
                <Input
                  prefix={<IdcardOutlined />}
                  placeholder="xxxx xxxx xxxx"
                  maxLength={12}
                  size="large"
                />
              </Form.Item>

              {/* PAN */}
              <Form.Item
                name="panNumber"
                label="PAN Number"
                rules={[
                  { required: true, message: 'PAN number required' },
                  { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: 'Valid  (e.g. ABCDE1234F)' },
                ]}
                normalize={(val) => val?.toUpperCase()}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  size="large"
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 32 }}>
                <Button type="primary" htmlType="submit" size="large" block>
                  Next →
                </Button>
              </Form.Item>
            </Form>
          </div>
        );

      // ── Step 1: Photo Upload ───────────────────
      case 1:
        return (
          <div>
            <div style={styles.stepHeader}>
              <UploadOutlined style={styles.stepIcon} />
              <Title level={3} style={{ ...styles.stepTitle, color: '#f8fafc' }}>Shop Photo Upload</Title>
              <Text style={{ color: '#94a3b8' }}>
                Apni dukaan ki photo upload karo (optional in mock mode)
              </Text>
            </div>

            <div style={styles.uploadBox}>
              {shopPhoto ? (
                <div style={styles.uploadSuccess}>
                  <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a' }} />
                  <Text strong style={{ color: '#52c41a', marginTop: 8, display: 'block' }}>
                    {shopPhoto.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Photo selected!</Text>
                </div>
              ) : (
                <Upload {...uploadProps} showUploadList={false}>
                  <div style={styles.uploadPlaceholder}>
                    <UploadOutlined style={{ fontSize: 40, color: '#1890ff' }} />
                    <Text style={{ marginTop: 8, display: 'block' }}>
                      Click to upload shop photo
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      JPG, PNG • Max 5MB
                    </Text>
                  </div>
                </Upload>
              )}
            </div>

            <div style={styles.mockNote}>
              🧪 Mock Mode — Photo upload optional.
            </div>

            <div style={styles.btnRow}>
              <Button size="large" onClick={() => setCurrentStep(0)}>
                ← Back
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={() => setCurrentStep(2)}
                style={{ flex: 1 }}
              >
                Review →
              </Button>
            </div>
          </div>
        );

      // ── Step 2: Review + Submit ────────────────
      case 2:
        if (submitted) {
          // Success Screen
          return (
            <div style={styles.successBox}>
              <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
              <Title level={2} style={{ color: '#52c41a', marginTop: 16 }}>
                KYC Complete!
              </Title>
              <Text style={{ fontSize: 16, color: '#555', display: 'block', marginBottom: 8 }}>
                Your KYC has been successfully submitted.
              </Text>
              <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
                Now you can withdraw cash! 💸
              </Text>
              <Button
                type="primary"
                size="large"
                onClick={() => navigate('/aeps/withdrawal')}
                style={{ minWidth: 200 }}
              >
                💸 Cash Withdrawal
              </Button>
            </div>
          );
        }

        // Review Screen
        return (
          <div>
            <div style={styles.stepHeader}>
              <ScanOutlined style={styles.stepIcon} />
              <Title level={3} style={styles.stepTitle}>Review & Submit</Title>
              <Text type="secondary">Check all details and submit</Text>
            </div>

            {/* Summary Card */}
            <div style={styles.summaryCard}>
              <div style={styles.summaryRow}>
                <Text type="secondary">Aadhaar Number</Text>
                <Text strong>
                  {aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, 'XXXX XXXX $3')}
                </Text>
              </div>
              <div style={styles.summaryRow}>
                <Text type="secondary">PAN Number</Text>
                <Text strong>{panNumber}</Text>
              </div>
              <div style={styles.summaryRow}>
                <Text type="secondary">Shop Photo</Text>
                <Text strong style={{ color: shopPhoto ? '#52c41a' : '#faad14' }}>
                  {shopPhoto ? `✓ ${shopPhoto.name}` : '⚠ Skip kiya (Mock)'}
                </Text>
              </div>
            </div>

            <div style={styles.btnRow}>
              <Button size="large" onClick={() => setCurrentStep(1)}>
                ← Back
              </Button>
              <Button
                type="primary"
                size="large"
                loading={loading}
                onClick={handleFinalSubmit}
                style={{ flex: 1, background: '#52c41a', borderColor: '#52c41a' }}
              >
                {loading ? 'wait submting...' : '✅ Submit'}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'radial-gradient(circle at top left, #1e293b, #0f172a)',
      padding: '40px 20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '12px'
        }}
        bodyStyle={{ padding: '24px' }}
      >

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            🪪 AEPS KYC Verification
          </Title>
          <Text type="secondary">
            Complete KYC and activate AEPS services
          </Text>
        </div>

        {/* Stepper */}
        <Steps
          current={submitted ? 2 : currentStep}
          style={{ marginBottom: 32 }}
          items={[
            { title: 'Documents', icon: <IdcardOutlined /> },
            { title: 'Photo', icon: <UploadOutlined /> },
            { title: 'Submit', icon: <CheckCircleOutlined /> },
          ]}
        />

        {/* Step Content */}
        {renderStep()}

        {/* Back to OTP */}
        {!submitted && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button type="link" onClick={() => navigate('/aeps/otp-verification')}>
              ← Back to OTP Verification
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(circle at top left, #1e293b, #0f172a)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  stepHeader: {
    textAlign: 'center',
    marginBottom: 24,
  },
  stepIcon: {
    fontSize: 48,
    color: '#0ea5e9',
    marginBottom: 12,
  },
  stepTitle: {
    marginBottom: 4,
    color: '#f8fafc',
  },
  uploadBox: {
    border: '2px dashed rgba(148, 163, 184, 0.3)',
    borderRadius: 12,
    padding: 32,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
    cursor: 'pointer',
    background: 'rgba(30, 64, 175, 0.05)',
    transition: 'border-color 0.2s ease',
  },
  uploadSuccess: {
    textAlign: 'center',
  },
  uploadPlaceholder: {
    textAlign: 'center',
  },
  mockNote: {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 12,
    color: '#fbbf24',
    marginBottom: 24,
    textAlign: 'center',
  },
  summaryCard: {
    background: 'rgba(30, 64, 175, 0.1)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: 12,
    padding: '16px 20px',
    marginTop: 24,
    marginBottom: 24,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
  },
  successBox: {
    textAlign: 'center',
    padding: '20px 0',
  },
};

export default AepsKyc;