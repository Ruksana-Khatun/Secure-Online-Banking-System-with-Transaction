import React, { useState, useEffect } from 'react';
import { Card, Button, Spin, message, Progress, Typography, Row, Col } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, SyncOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const AepsPendingApproval = () => {
  const [status, setStatus] = useState('PENDING');
    const [agentData, setAgentData] = useState(null);
  const [outletIdGenerated, setOutletIdGenerated] = useState(false);
  const [checking, setChecking] = useState(false);

  const API_BASE = '/api/aeps';

  // Check application status
  const checkStatus = async () => {
    try {
      setChecking(true);
      const response = await axios.get(`${API_BASE}/agent/profile`);
      
      if (response.data.success && response.data.data) {
        const agent = response.data.data;
        setAgentData(agent);
        setStatus(agent.status);

        // If approved, show success popup
        if (agent.status === 'APPROVED' && agent.outletId && !outletIdGenerated) {
          setOutletIdGenerated(true);
          showSuccessPopup(agent);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setChecking(false);
    }
  };

  // Show success popup with outlet ID
  const showSuccessPopup = (agent) => {
    message.success({
      content: (
        <div>
          <Title level={4} style={{ color: '#52c41a', margin: 0 }}>
            Outlet ID Generated Successfully!
          </Title>
          <div style={{ marginTop: '16px' }}>
            <p><strong>Phone Number:</strong> {agent.mobile}</p>
            <p><strong>Outlet ID:</strong> {agent.outletId}</p>
            <Button
              type="primary"
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(agent.outletId);
                message.success('Outlet ID copied to clipboard!');
              }}
              style={{ marginTop: '8px' }}
            >
              Copy Outlet ID
            </Button>
          </div>
        </div>
      ),
      duration: 0,
      key: 'outlet-success',
    });
  };

  // Auto-check status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (status === 'PENDING') {
        checkStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [status]);

  // Initial check
  useEffect(() => {
    checkStatus();
  }, []);

  const renderStatusContent = () => {
    switch (status) {
      case 'PENDING':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '64px', color: '#faad14', marginBottom: '24px' }}>
              <ClockCircleOutlined />
            </div>
            <Title level={2} style={{ color: '#faad14', marginBottom: '16px' }}>
              Application Submitted!
            </Title>
            <Text style={{ fontSize: '18px', color: '#666', marginBottom: '32px', display: 'block' }}>
              Your AEPS agent application is under review.
              <br />
              Waiting for admin approval...
            </Text>
            
            <div style={{ marginBottom: '32px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>
                <Text type="secondary">
                  <SyncOutlined spin /> Auto-checking status every 30 seconds
                </Text>
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              loading={checking}
              onClick={checkStatus}
              style={{ marginRight: '16px' }}
            >
              Check Status Now
            </Button>
            <Button size="large" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        );

      case 'APPROVED':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '64px', color: '#52c41a', marginBottom: '24px' }}>
              <CheckCircleOutlined />
            </div>
            <Title level={2} style={{ color: '#52c41a', marginBottom: '16px' }}>
              Application Approved!
            </Title>
            <Text style={{ fontSize: '18px', color: '#666', marginBottom: '32px', display: 'block' }}>
              Congratulations! Your AEPS agent application has been approved.
            </Text>

            {agentData && (
              <Card style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>Outlet ID:</Text>
                  </Col>
                  <Col span={12}>
                    <Text code>{agentData.outletId}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Mobile:</Text>
                  </Col>
                  <Col span={12}>
                    <Text>{agentData.mobile}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Status:</Text>
                  </Col>
                  <Col span={12}>
                    <Text style={{ color: '#52c41a' }}>Approved</Text>
                  </Col>
                </Row>
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Button
                    type="primary"
                    onClick={() => {
                      navigator.clipboard.writeText(agentData.outletId);
                      message.success('Outlet ID copied to clipboard!');
                    }}
                  >
                    Copy Outlet ID
                  </Button>
                </div>
              </Card>
            )}

            <div style={{ marginTop: '32px' }}>
              <Button
                type="primary"
                size="large"
                onClick={() => window.location.href = '/aeps/otp-verification'}
              >
                Continue to OTP Verification
              </Button>
            </div>
          </div>
        );

      case 'REJECTED':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '64px', color: '#ff4d4f', marginBottom: '24px' }}>
              ✕
            </div>
            <Title level={2} style={{ color: '#ff4d4f', marginBottom: '16px' }}>
              Application Rejected
            </Title>
            <Text style={{ fontSize: '18px', color: '#666', marginBottom: '32px', display: 'block' }}>
              Your application has been rejected.
              {agentData?.rejectionReason && (
                <div style={{ marginTop: '16px' }}>
                  <Text strong>Reason: </Text>
                  <Text>{agentData.rejectionReason}</Text>
                </div>
              )}
            </Text>

            <Button
              type="primary"
              size="large"
              onClick={() => window.location.href = '/aeps/register'}
            >
              Submit New Application
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
          maxWidth: 600,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            AEPS Application Status
          </Title>
          <Text type="secondary">
            Track your agent application status
          </Text>
        </div>

        {status === 'PENDING' && (
          <div style={{ marginBottom: '32px' }}>
            <Progress
              percent={50}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              showInfo={false}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <Text type="secondary">Application Submitted</Text>
              <Text type="secondary">Admin Review</Text>
              <Text type="secondary">Approval</Text>
            </div>
          </div>
        )}

        {renderStatusContent()}

        {status === 'PENDING' && (
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Need help? Contact support at support@aeps.com
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AepsPendingApproval;
