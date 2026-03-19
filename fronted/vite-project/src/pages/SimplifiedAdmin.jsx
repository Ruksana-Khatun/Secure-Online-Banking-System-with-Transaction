import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Button, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Tabs, 
  Space,
  Badge,
  Tooltip,
  Popconfirm
} from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  TeamOutlined, 
  TransactionOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  BlockOutlined,
  UnlockOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Header, Content } = Layout;
const { TabPane } = Tabs;

const SimplifiedAdmin = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // API Base URL
  const API_BASE = '/api/admin';

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ADMIN') {
      message.error('Access denied. Admin access required.');
      window.location.href = '/login';
      return;
    }

    setUser(parsedUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Load initial data
    fetchDashboardStats();
  }, []);

  // API Functions
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/dashboard/stats`);
      setStats(response.data.data);
    } catch {
      message.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async (status = '', search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API_BASE}/agents?${params}`);
      setAgents(response.data.data.agents);
    } catch {
      message.error('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (status = '', search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API_BASE}/users?${params}`);
      setUsers(response.data.data.users);
    } catch {
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (status = '', type = '', search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (type) params.append('type', type);
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API_BASE}/transactions?${params}`);
      setTransactions(response.data.data.transactions);
    } catch {
      message.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Agent Actions
  const approveAgent = async (agentId) => {
    try {
      await axios.put(`${API_BASE}/agents/${agentId}/approve`);
      message.success('Agent approved successfully');
      fetchAgents();
      fetchDashboardStats();
    } catch {
      message.error('Failed to approve agent');
    }
  };

  const rejectAgent = async (agentId, reason) => {
    try {
      await axios.put(`${API_BASE}/agents/${agentId}/reject`, { reason });
      message.success('Agent rejected successfully');
      fetchAgents();
      fetchDashboardStats();
    } catch {
      message.error('Failed to reject agent');
    }
  };

  const deleteAgent = async (agentId) => {
    try {
      await axios.delete(`${API_BASE}/agents/${agentId}`);
      message.success('Agent deleted successfully');
      fetchAgents();
    } catch {
      message.error('Failed to delete agent');
    }
  };

  // User Actions
  const toggleUserBlock = async (userId) => {
    try {
      await axios.put(`${API_BASE}/users/${userId}/block`);
      message.success('User status updated successfully');
      fetchUsers();
    } catch {
      message.error('Failed to update user status');
    }
  };

  // Table Columns
  const agentColumns = [
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Mobile',
      dataIndex: 'mobile',
      key: 'mobile',
    },
    {
      title: 'Status',
      dataIndex: 'isApproved',
      key: 'isApproved',
      render: (isApproved, record) => (
        <div>
          {isApproved ? (
            <Tag color="green">Approved</Tag>
          ) : record.isRejected ? (
            <Tag color="red">Rejected</Tag>
          ) : (
            <Tag color="orange">Pending</Tag>
          )}
          {isApproved && record.outletId && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              Outlet: {record.outletId}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {!record.isApproved && !record.isRejected && (
            <>
              <Tooltip title="Approve">
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<CheckOutlined />}
                  onClick={() => approveAgent(record._id)}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Popconfirm
                  title="Reject this agent?"
                  onConfirm={() => rejectAgent(record._id, 'Rejected by admin')}
                >
                  <Button 
                    danger 
                    size="small" 
                    icon={<CloseOutlined />}
                  />
                </Popconfirm>
              </Tooltip>
            </>
          )}
          <Tooltip title="View Transactions">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedItem(record);
                setModalType('agentTransactions');
                setModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this agent?"
              description="This action cannot be undone."
              onConfirm={() => deleteAgent(record._id)}
            >
              <Button 
                danger 
                size="small" 
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const userColumns = [
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Mobile',
      dataIndex: 'mobile',
      key: 'mobile',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'SUSPENDED' ? 'red' : 'green'}>
          {status === 'SUSPENDED' ? 'Suspended' : 'Active'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title={record.status === 'SUSPENDED' ? 'Activate User' : 'Suspend User'}>
            <Button 
              danger={record.status === 'ACTIVE'}
              type={record.status === 'SUSPENDED' ? 'primary' : 'default'}
              size="small" 
              icon={record.status === 'SUSPENDED' ? <UnlockOutlined /> : <BlockOutlined />}
              onClick={() => toggleUserBlock(record._id)}
            />
          </Tooltip>
          <Tooltip title="View Transactions">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedItem(record);
                setModalType('userTransactions');
                setModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const transactionColumns = [
    {
      title: 'Transaction ID',
      dataIndex: 'idempotencyKey',
      key: 'idempotencyKey',
      render: (text) => <code>{text}</code>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => <span>₹{amount.toLocaleString()}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={
          status === 'SUCCESS' ? 'green' : 
          status === 'PENDING' ? 'orange' : 'red'
        }>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Initiated By',
      dataIndex: ['initiatedBy', 'fullName'],
      key: 'initiatedBy',
    },
  ];

  // Load data when tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'agents':
        fetchAgents();
        break;
      case 'users':
        fetchUsers();
        break;
      case 'transactions':
        fetchTransactions();
        break;
      default:
        break;
    }
  }, [activeTab]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, color: '#1890ff' }}>
          <DashboardOutlined /> Admin Dashboard
        </h1>
        <div>
          <span>Welcome, {user?.fullName}</span>
          <Button 
            type="link" 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
          >
            Logout
          </Button>
        </div>
      </Header>
      
      <Content style={{ padding: '24px' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <span>
                <DashboardOutlined />
                Dashboard
              </span>
            } 
            key="dashboard"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Transactions Today"
                    value={stats.totalTransactionsToday || 0}
                    prefix={<TransactionOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Agents"
                    value={stats.totalAgentsRegistered || 0}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Pending Approvals"
                    value={stats.pendingApprovals || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Commission"
                    value={stats.totalCommissionGenerated || 0}
                    prefix="₹"
                    precision={2}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <TeamOutlined />
                Agents
                <Badge count={stats.pendingApprovals || 0} style={{ marginLeft: 8 }} />
              </span>
            } 
            key="agents"
          >
            <Card>
              <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
                <Select
                  placeholder="Filter by status"
                  style={{ width: 200 }}
                  onChange={(value) => fetchAgents(value)}
                  allowClear
                >
                  <Select.Option value="approved">Approved</Select.Option>
                  <Select.Option value="pending">Pending</Select.Option>
                </Select>
                <Input.Search
                  placeholder="Search agents..."
                  style={{ width: 300 }}
                  onSearch={(value) => fetchAgents('', value)}
                />
              </div>
              <Table
                columns={agentColumns}
                dataSource={agents}
                loading={loading}
                rowKey="_id"
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} agents`,
                }}
              />
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <UserOutlined />
                Users
              </span>
            } 
            key="users"
          >
            <Card>
              <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
                <Select
                  placeholder="Filter by status"
                  style={{ width: 200 }}
                  onChange={(value) => fetchUsers(value)}
                  allowClear
                >
                  <Select.Option value="active">Active</Select.Option>
                  <Select.Option value="suspended">Suspended</Select.Option>
                </Select>
                <Input.Search
                  placeholder="Search users..."
                  style={{ width: 300 }}
                  onSearch={(value) => fetchUsers('', value)}
                />
              </div>
              <Table
                columns={userColumns}
                dataSource={users}
                loading={loading}
                rowKey="_id"
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} users`,
                }}
              />
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <TransactionOutlined />
                Transactions
              </span>
            } 
            key="transactions"
          >
            <Card>
              <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
                <Select
                  placeholder="Filter by status"
                  style={{ width: 150 }}
                  onChange={(value) => fetchTransactions(value)}
                  allowClear
                >
                  <Select.Option value="SUCCESS">Success</Select.Option>
                  <Select.Option value="PENDING">Pending</Select.Option>
                  <Select.Option value="FAILED">Failed</Select.Option>
                </Select>
                <Select
                  placeholder="Filter by type"
                  style={{ width: 150 }}
                  onChange={(value) => fetchTransactions('', value)}
                  allowClear
                >
                  <Select.Option value="PPI">PPI</Select.Option>
                  <Select.Option value="BANK_TRANSFER">Bank Transfer</Select.Option>
                  <Select.Option value="UPI">UPI</Select.Option>
                </Select>
                <Input.Search
                  placeholder="Search transactions..."
                  style={{ width: 300 }}
                  onSearch={(value) => fetchTransactions('', '', value)}
                />
              </div>
              <Table
                columns={transactionColumns}
                dataSource={transactions}
                loading={loading}
                rowKey="_id"
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} transactions`,
                }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Content>

      {/* Modal for viewing transaction history */}
      <Modal
        title="Transaction History"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={1000}
      >
        {(modalType === 'agentTransactions' || modalType === 'userTransactions') && (
          <div>
            <h3>Transaction History for {selectedItem?.fullName}</h3>
            <p>Email: {selectedItem?.email}</p>
            <p>Mobile: {selectedItem?.mobile}</p>
            {selectedItem?.outletId && <p>Outlet ID: {selectedItem.outletId}</p>}
            <Table
              columns={transactionColumns}
              dataSource={[]} // Load transactions for specific user/agent
              loading={loading}
              pagination={false}
            />
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default SimplifiedAdmin;
