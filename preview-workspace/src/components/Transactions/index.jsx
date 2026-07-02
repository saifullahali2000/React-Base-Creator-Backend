import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getTransactions } from '../../api/transactions';
import Header from '../Header';
import './index.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchName, setSearchName] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('date_desc');
  const { user } = useContext(AuthContext);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getTransactions({ name: searchName, category: categoryFilter, sort: sortOrder });
      if (data.success) {
        setTransactions(data.data.transactions);
        setFilteredTransactions(data.data.transactions);
      } else {
        setError(data.message || 'Failed to load transactions');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchName, categoryFilter, sortOrder]);

  const categories = ['All', ...new Set(transactions.map((t) => t.category))];

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const completedCount = filteredTransactions.filter((t) => t.status === 'Completed').length;
  const pendingCount = filteredTransactions.filter((t) => t.status === 'Pending').length;

  const getStatusClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'status-completed';
      case 'Pending':
        return 'status-pending';
      case 'Failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  return (
    <div className='transactions-page'>
      <Header />
      <div className='transactions-container'>
        <div className='page-header'>
          <div>
            <h1 className='page-title'>Transactions</h1>
            <p className='page-subtitle'>Welcome back, {user?.name || 'User'}</p>
          </div>
        </div>

        <div className='stats-grid'>
          <div className='stat-card'>
            <div className='stat-label'>Total Transactions</div>
            <div className='stat-value'>{filteredTransactions.length}</div>
          </div>
          <div className='stat-card'>
            <div className='stat-label'>Total Amount</div>
            <div className='stat-value'>${totalAmount.toFixed(2)}</div>
          </div>
          <div className='stat-card'>
            <div className='stat-label'>Completed</div>
            <div className='stat-value stat-success'>{completedCount}</div>
          </div>
          <div className='stat-card'>
            <div className='stat-label'>Pending</div>
            <div className='stat-value stat-warning'>{pendingCount}</div>
          </div>
        </div>

        <div className='filters-section'>
          <div className='filter-group'>
            <input
              type='text'
              placeholder='Search by customer name...'
              className='search-input'
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div className='filter-group'>
            <select
              className='filter-select'
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value === 'All' ? '' : e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat === 'All' ? '' : cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
          <div className='filter-group'>
            <select className='filter-select' value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value='date_desc'>Newest First</option>
              <option value='date_asc'>Oldest First</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className='loading-container'>
            <div className='spinner'></div>
            <p className='loading-text'>Loading transactions...</p>
          </div>
        ) : error ? (
          <div className='error-container'>
            <p className='error-text'>{error}</p>
            <button className='retry-button' onClick={fetchData}>
              Retry
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className='empty-state'>
            <p className='empty-text'>No transactions found</p>
          </div>
        ) : (
          <div className='table-container'>
            <table className='transactions-table'>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className='cell-id'>{transaction.id}</td>
                    <td className='cell-customer'>{transaction.customer}</td>
                    <td className='cell-date'>{new Date(transaction.date).toLocaleDateString()}</td>
                    <td className='cell-category'>{transaction.category}</td>
                    <td className='cell-amount'>${parseFloat(transaction.amount).toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;