import React, { useState, useEffect } from 'react';
import { Card, Table, Button, message, Typography, Row, Col, Statistic, Select } from 'antd';
import { DollarOutlined, HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth'; // ✅ authedRequest use karenge

const { Title, Text } = Typography;
const { Option } = Select;

const AepsTransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    totalCommission: 0,
  });

  const navigate = useNavigate();
  const { authedRequest } = useAuth(); // ✅ Token auto attach

  // ─────────────────────────────────────────────
  // Fetch Transactions
  // ─────────────────────────────────────────────
  const fetchTransactions = async (page = 1, status = '') => {
    try {
      setLoading(true);

      // Query params build karo
      const params = new URLSearchParams({
        page,
        limit: pagination.pageSize,
        status,
      }).toString();

      // ✅ authedRequest use karo — token auto attach hoga
      const data = await authedRequest(`/api/aeps/transactions?${params}`);

      if (data.success) {
        const txList = data.data.transactions || [];

        setTransactions(txList);
        setPagination((prev) => ({
          ...prev,
          current: page,
          total: data.data.pagination?.total || 0,
        }));

        // Stats calculate karo
        setStats({
          totalTransactions: data.data.pagination?.total || txList.length,
          totalAmount: txList.reduce((sum, tx) => sum + (tx.amount || 0), 0),
          totalCommission: txList.reduce((sum, tx) => sum + (tx.commission || 0), 0),
        });
      }
    } catch (err) {
      message.error(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTransactions(1, statusFilter);
  }, []);

  // Table pagination change
  const handleTableChange = (paginationConfig) => {
    fetchTransactions(paginationConfig.current, statusFilter);
  };

  // Status filter change
  const handleStatusChange = (value) => {
    const newStatus = value || '';
    setStatusFilter(newStatus);
    fetchTransactions(1, newStatus);
  };

  // Refresh
  const handleRefresh = () => {
    fetchTransactions(pagination.current, statusFilter);
  };

  // Currency format
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);

  // ─────────────────────────────────────────────
  // Table Columns
  // ─────────────────────────────────────────────
  const columns = [
    {
      title: 'Transaction ID',
      dataIndex: 'clientRefId',
      key: 'clientRefId',
      render: (text) => <Text code style={{ fontSize: 11 }}>{text}</Text>,
      width: 160,
    },
    {
      title: 'Customer Mobile',
      dataIndex: 'customerMobile',
      key: 'customerMobile',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong style={{ color: '#52c41a' }}>{formatCurrency(amount)}</Text>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Commission',
      dataIndex: 'commission',
      key: 'commission',
      render: (commission) => (
        <Text style={{ color: '#1890ff' }}>{formatCurrency(commission)}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          SUCCESS: '#52c41a',
          FAILED: '#ff4d4f',
          PENDING: '#faad14',
          REFUNDED: '#722ed1',
        };
        return (
          <Text strong style={{ color: colorMap[status] || '#555' }}>
            {status}
          </Text>
        );
      },
    },
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString('en-IN'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Outlet ID',
      dataIndex: 'outletId',
      key: 'outletId',
      render: (text) => <Text code style={{ fontSize: 11 }}>{text}</Text>,
    },
  ];

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <Card style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <Title level={2} style={{ color: '#1890ff', margin: 0 }}>
            <HistoryOutlined /> AEPS Transaction History
          </Title>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Total Transactions"
                value={stats.totalTransactions}
                prefix={<HistoryOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Total Amount"
                value={stats.totalAmount}
                prefix={<DollarOutlined />}
                formatter={(v) => formatCurrency(v)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Total Commission"
                value={stats.totalCommission}
                prefix={<DollarOutlined />}
                formatter={(v) => formatCurrency(v)}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filter */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Select
              placeholder="Status se filter karo"
              style={{ width: '100%' }}
              allowClear
              onChange={handleStatusChange}
              value={statusFilter || undefined}
            >
              <Option value="SUCCESS">✅ Success</Option>
              <Option value="FAILED">❌ Failed</Option>
              <Option value="PENDING">⏳ Pending</Option>
              <Option value="REFUNDED">↩️ Refunded</Option>
            </Select>
          </Col>
        </Row>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={transactions}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} transactions`,
          }}
          onChange={handleTableChange}
          rowKey="_id"
          scroll={{ x: 900 }}
          locale={{ emptyText: '📭 No transactions found' }}
        />

        {/* Actions */}
        <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button type="primary" size="large" onClick={() => navigate('/aeps/withdrawal')}>
            💸 New Withdrawal
          </Button>
          <Button size="large" onClick={() => navigate('/dashboard')}>
            🏠 Dashboard
          </Button>
        </div>

      </Card>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: 20,
  },
  card: {
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
};

export default AepsTransactionHistory;