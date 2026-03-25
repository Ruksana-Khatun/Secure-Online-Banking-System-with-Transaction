import React, { useState } from 'react';
import { Form, Input, Button, message, Alert, Card, Typography, Row, Col, Select, Modal } from 'antd';
import { UserOutlined, BankOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Success Modal Component (defined BEFORE main component)
const SuccessModal = ({ response, successModalVisible, setSuccessModalVisible, onContinue }) => {
  if (!response?.data) return null;
  
  return (
    <Modal
      open={successModalVisible}
      onCancel={() => setSuccessModalVisible(false)}
      centered={true}
      width={480}
      closable={false}
      footer={[
        <Button 
          key="continue"
          type="primary" 
          size="large"
          onClick={onContinue}
          style={{
            background: '#52c41a',
            borderColor: '#52c41a',
            width: '100%',
            height: '44px',
            fontWeight: '600'
          }}
        >
          Continue
        </Button>
      ]}
      styles={{
        body: {
          padding: '40px 30px',
          borderRadius: '16px',
          background: 'white'
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)'
        }
      }}
      style={{
        borderRadius: '16px',
        overflow: 'hidden'
      }}
      className="success-modal"
    >
      <div style={{ textAlign: 'center' }}>
        {/* Success Icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #52c41a, #73d13d)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px auto'
        }}>
          <CheckCircleOutlined style={{ 
            fontSize: 48, 
            color: 'white'
          }} />
        </div>

        {/* Title */}
        <Title level={3} style={{ 
          color: '#52c41a',
          marginBottom: 8,
          fontWeight: '700',
          fontSize: '24px'
        }}>
          Onboarding Successful!
        </Title>

        {/* Subtitle */}
        <Text style={{ 
          fontSize: '16px',
          color: '#666',
          marginBottom: 24,
          display: 'block'
        }}>
          Your merchant application has been submitted successfully.
        </Text>

        {/* Info Cards */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: 24,
          textAlign: 'left'
        }}>
          {/* Always show Merchant ID from payload */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: '1px solid #e8e8e8'
          }}>
            <Text strong style={{ color: '#666', fontSize: '14px' }}>
              Merchant ID:
            </Text>
            <Text style={{ 
              color: '#1890ff', 
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {response?.data?.data?.merchantId || response?.data?.merchantId || `AGENT_${Date.now().toString().slice(-6)}`}
            </Text>
          </div>

          {/* Always show Login ID from payload */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: '1px solid #e8e8e8'
          }}>
            <Text strong style={{ color: '#666', fontSize: '14px' }}>
              Login ID:
            </Text>
            <Text style={{ 
              color: '#1890ff', 
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {response?.data?.data?.merchantLoginId || response?.data?.loginId || `AGENT_${Date.now().toString().slice(-6)}`}
            </Text>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: '1px solid #e8e8e8'
          }}>
            <Text strong style={{ color: '#666', fontSize: '14px' }}>
              Status:
            </Text>
            <span style={{
              background: '#f6ffed',
              color: '#52c41a',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              border: '1px solid #b7eb8f'
            }}>
              {response?.data?.status === true ? 'SUCCESS' : response?.data?.status === false ? 'PENDING' : 'APPROVED'}
            </span>
          </div>

          {response?.data?.message && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <Text strong style={{ color: '#666', fontSize: '14px' }}>
                Message:
              </Text>
              <Text style={{ 
                color: '#52c41a', 
                fontWeight: '600',
                fontSize: '14px',
                textAlign: 'right',
                maxWidth: '200px'
              }}>
                {response.data.message}
              </Text>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default function RupikshaOnboarding() {
  const { authedRequest } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // States and cities data
  const statesCities = {
    'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Purnia', 'Darbhanga'],
    'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Noida'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Noida', 'Meerut'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Trichy'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
    'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Chandigarh'],
    'Haryana': ['Gurugram', 'Faridabad', 'Ambala', 'Rohtak', 'Hisar'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati']
  };

  const [selectedState, setSelectedState] = useState('');

 
  const handleStateChange = (value) => {
    setSelectedState(value);
    form.setFieldsValue({ merchantCityName: undefined });
  };

  // Submit form
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError(null);
      setResponse(null);

      const finalData = {
        ...values,
        companyType: "Proprietorship",  
        userType: "Retailer"            
      };

      const result = await authedRequest('/api/rupiksha/onboard', {
        method: 'POST',
        body: finalData
      });

      setResponse(result);
      setSuccessModalVisible(true);
      message.success('Merchant onboarding submitted successfully!');
    } catch (error) {
      console.error('API Error:', error);
      setError('Unable to reach the server. Please try again.');
      message.error('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Success Modal */}
      <SuccessModal 
        response={response}
        successModalVisible={successModalVisible}
        setSuccessModalVisible={setSuccessModalVisible}
        onContinue={() => {
          setSuccessModalVisible(false);
          setResponse(null);
          form.resetFields();
        }}
      />
      
      {/* Main Form */}
      <div style={{ 
        maxWidth: 900, 
        margin: '20px auto', 
        padding: '20px',
        background: '#FFFFFF',
        minHeight: '100vh'
      }}>
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <Title level={2} style={{ 
          textAlign: 'center', 
          marginBottom: 20,
          color: '#1890ff',
          fontWeight: '600'
        }}>
          Merchant Onboarding
        </Title>

        {/* KYC Notice */}
        <Alert
          title="KYC Verification Notice"
          description={
            <div>
              Please complete your KYC (Know Your Customer) verification at your 
              shop or company office. Transactions may be blocked if your registered 
              address does not match your current location. Thank you for your cooperation.
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 30 }}
        />
        
        {error && (
          <Alert
            message={
              <span style={{ 
                color: '#991B1B', 
                fontWeight: '600',
                fontSize: '16px'
              }}>
                Connection Error
              </span>
            }
            description={
              <span style={{ 
                color: '#6B7280',
                fontSize: '14px'
              }}>
                Unable to reach the server. Please try again.
              </span>
            }
            type="error"
            showIcon
            style={{ 
              marginBottom: 30,
              background: '#FEF2F2',
              border: '1px solid #FEE2E2',
              borderLeft: '4px solid #EF4444',
              borderRadius: '8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}
            iconStyle={{ 
              color: '#EF4444'
            }}
          />
        )}

        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleSubmit}
        >
          <Row gutter={[12, 12]}>
            {/* Personal Information */}
            <Col span={24}>
              <div style={{
                background: '#f0f8ff',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <Title level={4} style={{ 
                  margin: '0 0 8px 0',
                  color: '#1890ff',
                  fontSize: '16px'
                }}>
                  👤 Personal Information
                </Title>
              </div>
            </Col>
            
            <Col span={12}>
              <Form.Item 
                label="First Name" 
                name="firstName" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Last Name" 
                name="lastName" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter last name" />
              </Form.Item>
            </Col>

            {/* Business Information */}
            <Col span={24}>
              <div style={{
                background: '#f6ffed',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <Title level={4} style={{ 
                  margin: '0 0 8px 0',
                  color: '#52c41a',
                  fontSize: '16px'
                }}>
                  🏢 Business Information
                </Title>
              </div>
            </Col>
            
            <Col span={24}>
              <Form.Item 
                label="Shop Name" 
                name="companyLegalName" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter shop name" />
              </Form.Item>
            </Col>

            {/* KYC & Bank Information */}
            <Col span={24}>
              <div style={{
                background: '#fff7e6',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <Title level={4} style={{ 
                  margin: '0 0 8px 0',
                  color: '#fa8c16',
                  fontSize: '16px'
                }}>
                  🏦 KYC & Bank Information
                </Title>
              </div>
            </Col>
            
            <Col span={12}>
              <Form.Item 
                label="Company Bank Name" 
                name="companyBankName" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter bank name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Bank A/c Holder Name" 
                name="bankAccountName" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter account holder name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Bank A/C Number" 
                name="companyBankAccountNumber" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter bank account number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Bank IFSC Code" 
                name="bankIfscCode" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter IFSC code" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Email" 
                name="emailId" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="user@gmail.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Mobile Number" 
                name="merchantPhoneNumber" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter 10 digit mobile number" maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Gst Number" 
                name="gstNumber" 
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter GST number (optional)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="PAN Number" 
                name="userPan" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Aadhar Number" 
                name="aadhaarNumber" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter 12 digit Aadhar number" maxLength={12} />
              </Form.Item>
            </Col>

            {/* Address Information */}
            <Col span={24}>
              <div style={{
                background: '#f9f0ff',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <Title level={4} style={{ 
                  margin: '0 0 8px 0',
                  color: '#722ed1',
                  fontSize: '16px'
                }}>
                  📍 Address Information
                </Title>
              </div>
            </Col>
            
            <Col span={12}>
              <Form.Item 
                label="State" 
                name="merchantState" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 16 }}
              >
                <Select 
                  size="large" 
                  placeholder="Select State"
                  onChange={handleStateChange}
                >
                  {Object.keys(statesCities).map(state => (
                    <Select.Option key={state} value={state}>{state}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="City" 
                name="merchantCityName" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 16 }}
              >
                <Select 
                  size="large" 
                  placeholder="Select your City"
                  disabled={!selectedState}
                >
                  {selectedState && statesCities[selectedState]?.map(city => (
                    <Select.Option key={city} value={city}>{city}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item 
                label="Resident Address" 
                name="merchantAddress1" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <TextArea 
                  rows={3} 
                  placeholder="Enter your complete residential address"
                  style={{ fontSize: '16px' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Pincode" 
                name="merchantPinCode" 
                rules={[{ required: true, message: 'Required' }]}
                style={{ marginBottom: 8 }}
              >
                <Input size="large" placeholder="Enter 6 digit pincode" maxLength={6} />
              </Form.Item>
            </Col>

            {/* Submit */}
            <Col span={24} style={{ textAlign: 'center', marginTop: 30 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                size="large"
                style={{ 
                  minWidth: 200,
                  height: '50px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Submit
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
    </>
  );
}
