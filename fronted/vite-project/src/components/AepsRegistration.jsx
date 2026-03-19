import React, { useState } from 'react';
import { Form, Input, Button, Card, Steps, message, Select, Row, Col, Divider, Space, Typography, Alert, Modal } from 'antd';
import { UserOutlined, BankOutlined, PhoneOutlined, MailOutlined, IdcardOutlined, ShopOutlined, HomeOutlined, EnvironmentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Step } = Steps;
const { Option } = Select;
const { Title, Text } = Typography;

const AepsRegistration = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const API_BASE = '/api/aeps';

  const steps = [
    {
      title: 'Personal Details',
      description: 'Basic Information',
      icon: <UserOutlined />,
    },
    {
      title: 'Contact Information',
      description: 'Contact Details',
      icon: <PhoneOutlined />,
    },
    {
      title: 'Bank Details',
      description: 'Bank Account Information',
      icon: <BankOutlined />,
    },
    {
      title: 'Address Information',
      description: 'Shop & Address Details',
      icon: <HomeOutlined />,
    },
  ];

  // Indian states for dropdown
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
    'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Lakshadweep', 'Puducherry'
  ];

  const handleSubmit = async (values) => {
    console.log("[FRONTEND] ========== REGISTRATION SUBMIT START ==========");
    console.log("[FRONTEND] API Base URL:", API_BASE);

    try {
      setLoading(true);
      const allData = { ...formData, ...values };
      console.log("[FRONTEND] Form data keys:", Object.keys(allData));
      console.log("[FRONTEND] Mobile:", allData.mobile, "Email:", allData.email);

      console.log("[FRONTEND] Making POST request...");
      const response = await axios.post(`${API_BASE}/agent/register`, allData);
      console.log("[FRONTEND] Response status:", response.status);
      console.log("[FRONTEND] Response data:", response.data);

      if (response.data.success) {
        const { outletId, agentId, mobile } = response.data.data;
        console.log("[FRONTEND] Success! Outlet ID:", outletId, "Agent ID:", agentId);

        // Show success modal with Outlet ID
        Modal.success({
          title: '🎉 Registration Successful!',
          content: (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', marginBottom: '16px' }}>
                Your AEPS agent account has been approved automatically!
              </p>
              <div style={{
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                  Your Outlet ID
                </Text>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1890ff',
                  marginTop: '8px',
                  fontFamily: 'monospace'
                }}>
                  {outletId}
                </div>
              </div>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Please save this Outlet ID for future reference.
              </p>
            </div>
          ),
          okText: 'Continue to OTP Verification →',
          onOk: () => {
            // Redirect to OTP verification with agent data
            navigate('/aeps/otp-verification', {
              state: {
                agentId,
                mobile,
                outletId
              }
            });
          },
          width: 500,
        });

        form.resetFields();
        setFormData({});
      } else {
        console.error("[FRONTEND] Server returned error:", response.data);
        message.error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error("[FRONTEND] Error:", error.message);
      if (error.response) {
        console.error("[FRONTEND] Response status:", error.response.status);
        console.error("[FRONTEND] Response data:", error.response.data);
      } else if (error.request) {
        console.error("[FRONTEND] No response received - check backend");
      }
      message.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      setFormData({ ...formData, ...values });
      setCurrentStep(currentStep + 1);
    } catch {
      message.error('Please fill all required fields');
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card
            title={
              <Space>
                <UserOutlined style={{ color: '#1890ff' }} />
                <span>Personal Details</span>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            <Alert
              title="🧪 Test Mode Enabled"
              description="Use test data for development: Mock OTP: 123456 | Mock Fingerprint: MOCK_FINGER_DATA"
              type="info"
              showIcon
              closable
              style={{ marginTop: '24px', borderRadius: '8px' }}
            />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="firstName"
                  label="First Name"
                  rules={[{ required: true, message: 'Please enter your first name' }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Enter First Name"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="lastName"
                  label="Last Name"
                  rules={[{ required: true, message: 'Please enter your last name' }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Enter Last Name"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="panNumber"
                  label="PAN Card Number"
                  rules={[
                    { required: true, message: 'Please enter PAN number' },
                    { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: 'Invalid PAN format (e.g., ABCDE1234F)' }
                  ]}
                >
                  <Input
                    prefix={<IdcardOutlined />}
                    placeholder="Enter PAN Number (e.g., ABCDE1234F)"
                    size="large"
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="aadhaarNumber"
                  label="Aadhaar Number"
                  rules={[
                    { required: true, message: 'Please enter 12-digit Aadhaar number' },
                    { pattern: /^[0-9]{12}$/, message: 'Aadhaar must be exactly 12 digits' }
                  ]}
                >
                  <Input
                    prefix={<IdcardOutlined />}
                    placeholder="Enter 12-digit Aadhaar Number"
                    size="large"
                    maxLength={12}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );
      case 1:
        return (
          <Card
            title={
              <Space>
                <PhoneOutlined style={{ color: '#1890ff' }} />
                <span>Contact Information</span>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="email"
                  label="Email Address"
                  rules={[
                    { required: true, message: 'Please enter email' },
                    { type: 'email', message: 'Invalid email format' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="Enter Email Address"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="mobile"
                  label="Mobile Number"
                  rules={[
                    { required: true, message: 'Please enter mobile number' },
                    { pattern: /^[6-9]\d{9}$/, message: 'Invalid mobile number' }
                  ]}
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="Enter 10-digit Mobile Number"
                    size="large"
                    maxLength={10}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );
      case 2:
        return (
          <Card
            title={
              <Space>
                <BankOutlined style={{ color: '#1890ff' }} />
                <span>Bank Details</span>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="companyBankName"
                  label="Company Bank Name"
                  rules={[{ required: true, message: 'Please enter bank name' }]}
                >
                  <Select placeholder="Select Bank" size="large">
                    <Option value="State Bank of India">State Bank of India</Option>
                    <Option value="ICICI Bank">ICICI Bank</Option>
                    <Option value="HDFC Bank">HDFC Bank</Option>
                    <Option value="Axis Bank">Axis Bank</Option>
                    <Option value="Punjab National Bank">Punjab National Bank</Option>
                    <Option value="Bank of Baroda">Bank of Baroda</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="bankHolderName"
                  label="Account Holder Name"
                  rules={[{ required: true, message: 'Please enter account holder name' }]}
                >
                  <Input
                    prefix={<BankOutlined />}
                    placeholder="Enter Account Holder Name"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="bankAccountNo"
                  label="Bank Account Number"
                  rules={[{ required: true, message: 'Please enter account number' }]}
                >
                  <Input
                    prefix={<BankOutlined />}
                    placeholder="Enter Bank Account Number"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="ifscCode"
                  label="IFSC Code"
                  rules={[
                    { required: true, message: 'Please enter IFSC code' },
                    { pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: 'Invalid IFSC format' }
                  ]}
                >
                  <Input
                    prefix={<BankOutlined />}
                    placeholder="Enter IFSC Code"
                    size="large"
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );
      case 3:
        return (
          <Card
            title={
              <Space>
                <HomeOutlined style={{ color: '#1890ff' }} />
                <span>Address Information</span>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="shopName"
                  label="Shop Name"
                  rules={[{ required: true, message: 'Please enter shop name' }]}
                >
                  <Input
                    prefix={<ShopOutlined />}
                    placeholder="Enter Shop Name"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="state"
                  label="State"
                  rules={[{ required: true, message: 'Please select state' }]}
                >
                  <Select placeholder="Select State" size="large" showSearch>
                    {indianStates.map(state => (
                      <Option key={state} value={state}>{state}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="city"
                  label="City"
                  rules={[{ required: true, message: 'Please enter city' }]}
                >
                  <Input
                    prefix={<EnvironmentOutlined />}
                    placeholder="Enter City"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="pincode"
                  label="PIN Code"
                  rules={[
                    { required: true, message: 'Please enter PIN code' },
                    { pattern: /^[0-9]{6}$/, message: 'PIN must be 6 digits' }
                  ]}
                >
                  <Input
                    prefix={<EnvironmentOutlined />}
                    placeholder="Enter 6-digit PIN Code"
                    size="large"
                    maxLength={6}
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  name="address"
                  label="Complete Address"
                  rules={[{ required: true, message: 'Please enter address' }]}
                >
                  <Input.TextArea
                    placeholder="Enter Complete Address"
                    size="large"
                    rows={3}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );
      case 4:
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }}>
              ✓
            </div>
            <h2 style={{ color: '#52c41a', marginBottom: '16px' }}>
              Application Submitted Successfully!
            </h2>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
              Your AEPS agent application has been submitted and is pending admin approval.
              You will be notified once your application is approved.
            </p>
            <Button type="primary" size="large" onClick={() => window.location.href = '/aeps/pending'}>
              Check Application Status
            </Button>
          </div>
        );

      default:
        return null;
    }
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
      <Card
        style={{
          width: '100%',
          maxWidth: 800,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#1890ff', marginBottom: '8px' }}>
            Aadhar Enabled Payment Services
          </h1>
          <p style={{ color: '#666' }}>
            Registration Form
          </p>
        </div>

        <Steps current={currentStep} style={{ marginBottom: '32px' }}>
          {steps.map(item => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>

        <Form
          form={form}
          layout="vertical"
          style={{ marginBottom: '32px' }}
          onFinish={handleSubmit}
        >
          {renderStepContent()}
        </Form>

        {currentStep < 4 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={currentStep === 0}
              onClick={handlePrev}
            >
              Previous
            </Button>
            <div>
              {currentStep === steps.length - 1 ? (
                <Button
                  type="primary"
                  loading={loading}
                  onClick={() => form.submit()}
                  style={{ marginRight: 8 }}
                >
                  Submit Application
                </Button>
              ) : (
                <Button type="primary" onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AepsRegistration;
