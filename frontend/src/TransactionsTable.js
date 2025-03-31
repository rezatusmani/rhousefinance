import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TransactionsTable.css';
import 'font-awesome/css/font-awesome.min.css';

// Function to format date as M/D/YY
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2); // Get the last 2 digits of the year
    return `${month}/${day}/${year}`;
};

// Function to format date as M/D/YY
const formatDateToDateInput = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2); // Get the last 2 digits of the year
    //return YYYY-MM-DD format for input type date
    return `${date.getFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

// Decode HTML entities
const decodeHTML = (html) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
};

const formatCurrency = (value) => {
    if (!value)
        return "";
    const num = parseFloat(value).toFixed(2);
    return num.startsWith('-') ? `-$${num.slice(1)}` : `$${num}`;
};

const TransactionsTable = () => {
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [filters, setFilters] = useState({
        account: [],
        category: [],
        type: [],
        description: '',
        notes: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
    });
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [filtersVisible, setFiltersVisible] = useState(false);  // New state for toggling visibility
    
    const [inputDate, setInputDate] = useState('');
    const [inputDescription, setInputDescription] = useState('');
    const [inputCategory, setInputCategory] = useState('');
    const [inputType, setInputType] = useState('');
    const [inputAmount, setInputAmount] = useState('');
    const [inputBalance, setInputBalance] = useState('');
    const [inputNotes, setInputNotes] = useState('');

    // Fetch transactions when the component mounts
    useEffect(() => {
        axios.get('http://localhost:5000/transactions')  // Fetch from your backend
            .then((response) => {
                setTransactions(response.data);  // Store in the state
                setFilteredTransactions(response.data);  // Initialize filtered transactions
            })
            .catch((error) => {
                console.error('Error fetching transactions:', error);  // Error handling
            });
    }, []);  // This ensures it runs once when the component is mounted

    // Function to handle filter checkbox changes
    const handleFilterChange = (event, type) => {
        const { value, checked } = event.target;
        setFilters((prevFilters) => {
            const updatedFilters = { ...prevFilters };
            if (checked) {
                updatedFilters[type] = [...updatedFilters[type], value];
            } else {
                updatedFilters[type] = updatedFilters[type].filter((item) => item !== value);
            }
            return updatedFilters;
        });
    };

    // Handle description text search
    const handleDescriptionChange = (event) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            description: event.target.value
        }));
    };

    // Handle notes text search
    const handleNotesChange = (event) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            notes: event.target.value
        }));
    };

    // Handle date range filter change
    const handleDateChange = (event) => {
        const { name, value } = event.target;
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: value
        }));
    };

    // Handle amount range filter change
    const handleAmountChange = (event) => {
        const { name, value } = event.target;
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: value
        }));
    };

    // Handle the "Delete All" button click
    const handleDeleteAll = async () => {
        try {
            await axios.delete('http://localhost:5000/transactions');  // Send delete request to backend
            setTransactions([]);
            setFilteredTransactions([]);
            alert('All transactions have been deleted successfully.');
        } catch (error) {
            console.error('Error deleting all transactions:', error);
            alert('An error occurred while deleting the transactions.');
        }
    };

    const handleAddCustomTransaction = async () => {
        const newTransaction = {
            account: 'Custom Input',
            date: document.getElementById('input-date').value,
            description: document.getElementById('input-description').value,
            category: document.getElementById('input-category').value,
            type: document.getElementById('input-type').value,
            amount: document.getElementById('input-amount').value,
            balance: document.getElementById('input-balance').value,
            notes: document.getElementById('input-notes').value
        };
        try {
            const response = await axios.post('http://localhost:5000/transactions', newTransaction);  // Send new transaction to backend
            const createdTransaction = response.data;

            // Ensure the created transaction has all required fields
            const updatedTransaction = {
                ...newTransaction,
                id: createdTransaction.id || Math.random().toString(36).substr(2, 9), // Use backend ID or fallback
            };

            setTransactions((prevTransactions) => [...prevTransactions, updatedTransaction]);  // Update state with new transaction
            setFilteredTransactions((prevFiltered) => [...prevFiltered, updatedTransaction]);  // Update filtered transactions
            handleClearCustomInputs();
        } catch (error) {
            console.error('Error adding transaction:', error);  // Error handling
        }
    };

    const handleClearCustomInputs = async () => {
        console.log('inputDate', inputDate);
        setInputAmount('');
        setInputDescription('');
        setInputCategory('');
        setInputType('');
        setInputBalance('');
        setInputNotes('');
        setInputDate('');
    };

    const handleCopyTransactionData = async (transaction) => {
        setInputAmount(transaction.amount);
        setInputDescription(transaction.description);   
        setInputCategory(transaction.category);
        setInputType(transaction.type);
        setInputNotes(transaction.notes);
        setInputDate(formatDateToDateInput(transaction.date));
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/transactions/${id}`);
            setTransactions((prevTransactions) => prevTransactions.filter((transaction) => transaction.id !== id));
            setFilteredTransactions((prevFiltered) => prevFiltered.filter((transaction) => transaction.id !== id));
        } catch (error) {
            console.error(`Error deleting transaction with ID ${id}:`, error);
        }
    };

    // Apply filters to the transactions
    useEffect(() => {
        const filtered = transactions.filter((transaction) => {
            const matchesAccount = filters.account.length === 0 || filters.account.includes(transaction.account);
            const matchesCategory = filters.category.length === 0 || filters.category.includes(transaction.category);
            const matchesType = filters.type.length === 0 || filters.type.includes(transaction.type);
            const matchesDescription = filters.description === '' || decodeHTML(transaction.description).toLowerCase().includes(filters.description.toLowerCase());
            const matchesNotes = filters.notes === '' || decodeHTML(transaction.notes).toLowerCase().includes(filters.notes.toLowerCase());

            // Date range filter
            const matchesDate = (!filters.startDate || new Date(transaction.date) >= new Date(filters.startDate)) &&
                                (!filters.endDate || new Date(transaction.date) <= new Date(filters.endDate));

            // Amount range filter
            const matchesAmount = 
                (filters.minAmount === '' || parseFloat(transaction.amount) >= parseFloat(filters.minAmount)) &&
                (filters.maxAmount === '' || parseFloat(transaction.amount) <= parseFloat(filters.maxAmount));

            return matchesAccount && matchesCategory && matchesType && matchesDescription && matchesNotes && matchesDate && matchesAmount;
        });

        setFilteredTransactions(filtered);
    }, [filters, transactions]);

    const handleTypeChange = async (id, event, type) => {
        const updatedTransactions = transactions.map(transaction => 
            transaction.id === id ? { ...transaction, type: event.target.value } : transaction
        );
        setTransactions(updatedTransactions); // Update the state with new type value
        try {
            // Send the updated type to the backend
            await axios.put(`http://localhost:5000/transactions/${id}`, { type });
        } catch (error) {
            console.error(`Error updating Type to ${type}:`, error);
        }
    };

    const handleCategoryChange = async (id, event, category) => {
        const updatedTransactions = transactions.map(transaction =>
            transaction.id === id ? { ...transaction, category: event.target.value } : transaction
        );
        setTransactions(updatedTransactions); // Update the state with new category value
        try {
            // Send the updated category to the backend
            await axios.put(`http://localhost:5000/transactions/${id}`, { category });
        } catch (error) {
            console.error(`Error updating Category to ${category}:`, error);
        }
    };

    const handleNoteChange = (id, event) => {
        const updatedTransactions = filteredTransactions.map(transaction =>
            transaction.id === id ? { ...transaction, notes: event.target.value } : transaction
        );
        setFilteredTransactions(updatedTransactions); // Update only filtered transactions
    };
    
    const handleNoteBlur = async (id, notes) => {
        try {
            await axios.put(`http://localhost:5000/transactions/${id}`, { notes });
        } catch (error) {
            console.error('Error updating notes:', error);
        }
    };

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'date') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        } else if (sortConfig.key === 'amount' || sortConfig.key === 'balance') {
            aValue = parseFloat(aValue);
            bValue = parseFloat(bValue);
        } else {
            aValue = aValue?.toString().toLowerCase();
            bValue = bValue?.toString().toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Toggle the filter visibility
    const toggleFilters = () => {
        setFiltersVisible(!filtersVisible);
    };

    // Calculate the total amount for the footer
    const totalAmount = filteredTransactions.reduce((sum, transaction) => {
        return sum + parseFloat(transaction.amount || 0);
    }, 0);

    return (
        <div>
            <div className="filters-header" onClick={toggleFilters} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottomRightRadius: filtersVisible ? '0' : '10px', borderBottomLeftRadius: filtersVisible ? '0' : '10px' }}>
                <h4>Filter By</h4>
                <span style={{transform: filtersVisible ? 'rotate(90deg)' : 'rotate(0deg)'}}>
                    {'▶'}
                </span>
            </div>

            <div className="filters">
                <div className="filters-content" style={{ height: filtersVisible ? '250px' : '0', opacity: filtersVisible ? '1' : '0' }}>
                       <div className='filter-module'>
                        <h4>Account</h4>
                        <div className="checkbox-group">
                            {Array.from(new Set(transactions.map((transaction) => transaction.account))).map((account) => (
                                <label key={account}>
                                    <input
                                        type="checkbox"
                                        value={account}
                                        onChange={(e) => handleFilterChange(e, 'account')}
                                    />
                                    {account}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className='filter-module filter-modules-with-inputs'>
                        <h4>Date</h4>
                        <input
                            className='filter-input'
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleDateChange}
                        />
                        <input
                            className='filter-input'
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleDateChange}
                        />
                    </div>
                    <div className='filter-module filter-modules-with-inputs'>
                        <h4>Description</h4>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Search"
                            value={filters.description}
                            onChange={handleDescriptionChange}
                        />
                    </div>
                    <div className='filter-module'>
                        <h4>Category</h4>
                        <div className="checkbox-group">
                            {Array.from(new Set(transactions.map((transaction) => transaction.category))).map((category) => (
                                <label key={category}>
                                    <input
                                        type="checkbox"
                                        value={category}
                                        onChange={(e) => handleFilterChange(e, 'category')}
                                    />
                                    {category}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className='filter-module'>
                        <h4>Type</h4>
                        <div className="checkbox-group">
                            {Array.from(new Set(transactions.map((transaction) => transaction.type))).filter(Boolean).map((type) => (
                                <label key={type}>
                                    <input
                                        type="checkbox"
                                        value={type}
                                        onChange={(e) => handleFilterChange(e, 'type')}
                                    />
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className='filter-module filter-modules-with-inputs'>
                        <h4>Amount</h4>
                        <input
                            className='filter-input'
                            type="number"
                            name="minAmount"
                            placeholder="Min"
                            value={filters.minAmount}
                            onChange={handleAmountChange}
                        />
                        <input
                            className='filter-input'
                            type="number"
                            name="maxAmount"
                            placeholder="Max"
                            value={filters.maxAmount}
                            onChange={handleAmountChange}
                        />
                    </div>
                    <div className='filter-module filter-modules-with-inputs'>
                        <h4>Notes</h4>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Search"
                            value={filters.notes}
                            onChange={handleNotesChange}
                        />
                    </div>
                </div>
            </div>
            <div className='transaction-table-container'>
                <table>
                    <thead>
                        <tr>
                            {['account', 'date', 'description', 'category', 'type', 'amount', 'balance', 'notes'].map((column) => (
                                <th key={column} className={`table-header${column !== 'notes' ? '-sortable' : ''}`} onClick={() => column !== 'notes' ? handleSort(column) : null}>
                                    {column.charAt(0).toUpperCase() + column.slice(1)}
                                    {sortConfig.key === column ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                            ))}
                            <th className='table-header'>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                Custom Input
                            </td>
                            <td>
                                <input
                                    type="date"
                                    value={inputDate}
                                    id="input-date"
                                    onChange={(e) => setInputDate(e.target.value)}
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={inputDescription}
                                    id="input-description"
                                    placeholder="Description"
                                    onChange={(e) => setInputDescription(e.target.value)}
                                />
                            </td>
                            <td>
                                <select value={inputCategory} id="input-category" onChange={(e) => setInputCategory(e.target.value)}>
                                    <option value="NO_CATEGORY">Select a category...</option>
                                    {Array.from(new Set(transactions.map((transaction) => transaction.category))).map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}    
                                </select>
                            </td>
                            <td>
                                <select value={inputType} id="input-type" onChange={(e) => setInputType(e.target.value)}>
                                    <option value="Unselected">Select a type...</option>
                                    <option value="Needs">Needs</option>
                                    <option value="Wants">Wants</option>
                                    <option value="Savings">Savings</option>
                                    <option value="Income">Income</option>
                                    <option value="Transfer">Transfer</option>
                                </select>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    id="input-amount"
                                    onChange={(e) => setInputAmount(e.target.value)}
                                    value={inputAmount}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    placeholder="Balance"
                                    id="input-balance"
                                    onChange={(e) => setInputBalance(e.target.value)}
                                    value={inputBalance}
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={inputNotes}
                                    id="input-notes"
                                    onChange={(e) => setInputNotes(e.target.value)}

                                />
                            </td>
                            <td className='actions'>
                                <button onClick={handleAddCustomTransaction} className="add-btn">
                                    <i className="fa fa-plus"></i>
                                </button>
                                <button onClick={handleClearCustomInputs} className="delete-btn">
                                    <i className="fa fa-trash" aria-hidden="true"></i>
                                </button>
                            </td>
                        </tr>
                        {sortedTransactions.length > 0 ? (
                            sortedTransactions.map((transaction, index) => (
                                <tr key={index}>
                                    <td>{transaction.account}</td>
                                    <td>{formatDate(transaction.date)}</td>
                                    <td>{decodeHTML(transaction.description)}</td>
                                    <td>
                                        <select value={transaction.category} onChange={(e) => handleCategoryChange(transaction.id, e, e.target.value)}>
                                            //map the existing transactions to the select options
                                            <option value="NO_CATEGORY">Select a category...</option>
                                            {Array.from(new Set(transactions.map((transaction) => transaction.category))).map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}    
                                        </select>
                                    </td>
                                    <td>
                                        <select value={transaction.type} onChange={(e) => handleTypeChange(transaction.id, e, e.target.value)}>
                                            <option value="Unselected">Select a type...</option>
                                            <option value="Needs">Needs</option>
                                            <option value="Wants">Wants</option>
                                            <option value="Savings">Savings</option>
                                            <option value="Income">Income</option>
                                            <option value="Transfer">Transfer</option>
                                        </select>
                                    </td>
                                    <td>{formatCurrency(transaction.amount)}</td>
                                    <td>{formatCurrency(transaction.balance)}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={transaction.notes || ''}
                                            onChange={(e) => handleNoteChange(transaction.id, e)}
                                            onBlur={() => handleNoteBlur(transaction.id, transaction.notes)} // On blur, save note to backend
                                        />
                                    </td>
                                    <td className='actions'>
                                        <button onClick={() => handleCopyTransactionData(transaction)} className="add-btn">
                                            <i class="fa fa-clone"></i>
                                        </button>
                                        <button onClick={() => handleDelete(transaction.id)} className="delete-btn">
                                            <i className="fa fa-trash" aria-hidden="true"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7">No transactions to display</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                            <tr>
                                <td colSpan="5" className="total-row">Total:</td>
                                <td>{formatCurrency(totalAmount)}</td>
                                <td colSpan="3"></td>
                            </tr>
                    </tfoot>
                </table>
            </div>

            <button onClick={handleDeleteAll} className="delete-btn">
                Delete All
            </button>
        </div>
    );
};

export default TransactionsTable;
