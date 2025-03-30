import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './SpendingSummary.css';

const COLOR_PALETTE = [
    '#FF6347', '#4682B4', '#32CD32', '#FFD700', '#FF69B4',
    '#8A2BE2', '#00CED1', '#FF4500', '#7B68EE', '#20B2AA'
];

const FIXED_COLORS = {
    Unselected: '#FF6347',
    Needs: '#4682B4',
    Savings: '#32CD32',
    Wants: '#FFD700'
};

const CATEGORY_COLORS = {
    Shopping: '#FF6347',          // Tomato
    Transfer: '#4682B4',          // SteelBlue
    Automotive: '#32CD32',        // LimeGreen
    Groceries: '#FFD700',         // Gold
    Travel: '#FF69B4',            // HotPink
    Entertainment: '#8A2BE2',     // BlueViolet
    FoodAndDrink: '#00CED1',      // DarkTurquoise
    BillsAndUtilities: '#FF4500', // OrangeRed
    Home: '#7B68EE',              // MediumSlateBlue
    Gas: '#20B2AA',               // LightSeaGreen
    HealthAndWellness: '#ADFF2F', // GreenYellow
    ProfessionalServices: '#D2691E', // Chocolate
    FeesAndAdjustments: '#FF8C00', // DarkOrange
    Personal: '#FF1493',          // DeepPink
    Education: '#8B0000',         // DarkRed
    GiftsAndDonations: '#20B2AA'  // LightSeaGreen
};

const SpendingSummary = () => {
    const [data, setData] = useState([]);
    const [groupBy, setGroupBy] = useState('type');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [filterMode, setFilterMode] = useState('month');  // 'month' or 'year'
    const [income, setIncome] = useState(0);
    const [expenses, setExpenses] = useState(0);

    const colorMap = new Map();

    const getColor = (key) => {
        if (FIXED_COLORS[key]) return FIXED_COLORS[key];

        if (!colorMap.has(key)) {
            const nextColor = COLOR_PALETTE[colorMap.size % COLOR_PALETTE.length];
            colorMap.set(key, nextColor);
        }
        return colorMap.get(key);
    };

    const getPeriodString = (date) => {
        return filterMode === 'month'
            ? `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
            : `${date.getFullYear()}`;
    };

    const handlePrevPeriod = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            if (filterMode === 'month') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setFullYear(newDate.getFullYear() - 1);
            }
            return newDate;
        });
    };

    const handleNextPeriod = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            if (filterMode === 'month') {
                newDate.setMonth(newDate.getMonth() + 1);
            } else {
                newDate.setFullYear(newDate.getFullYear() + 1);
            }
            return newDate;
        });
    };

    useEffect(() => {
        fetch('http://localhost:5000/transactions')
            .then(response => response.json())
            .then(transactions => {
                const currentPeriod = getPeriodString(currentMonth);
    
                const filteredTransactions = transactions.filter(transaction => {
                    const txDate = new Date(transaction.date);
                    const txPeriod = getPeriodString(txDate);
    
                    return (
                        txPeriod === currentPeriod
                    );
                });
    
                const groupByKey = groupBy === 'type' ? 'type' : 'category';
    
                // Reset income and expenses
                let incomeTotal = 0;
                let expensesTotal = 0;
    
                const validTypes = ['Needs', 'Wants', 'Unselected'];
    
                const totals = filteredTransactions.reduce((acc, transaction) => {
                    const key = transaction[groupByKey] || "Uncategorized";
                    const { amount, type } = transaction;
    
                    let parsedAmount = parseFloat(amount);
                    if (isNaN(parsedAmount)) return acc;
    
                    parsedAmount = -parsedAmount;
    
                    if (type === 'Income') {
                        incomeTotal += Math.abs(parsedAmount);
                    } else if (validTypes.includes(type)) {
                        expensesTotal += parsedAmount;
                    }                    
    
                    acc[key] = (acc[key] || 0) + parsedAmount;
                    return acc;
                }, {});
    
                // Set income and expenses totals
                setIncome(incomeTotal);
                setExpenses(expensesTotal);
    
                const expenseData = Object.keys(totals)
                    .filter(key => validTypes.includes(key))
                    .map(key => ({
                        name: key,
                        value: Math.abs(totals[key].toFixed(2)),
                        color: getColor(key)
                    }));
    
                if (filterMode === 'month' || filterMode === 'year') {
                    const savingsAmount = Math.max(0, incomeTotal - expensesTotal);
                
                    // Only add savings when grouping by type
                    if (savingsAmount > 0 && groupBy === 'type') {
                        expenseData.push({
                            name: 'Savings',
                            value: parseFloat(savingsAmount.toFixed(2)),
                            color: getColor('Savings')
                        });
                    }
                }
    
                const totalAmount = expenseData.reduce((sum, item) => sum + item.value, 0);
    
                const formattedData = expenseData.map(item => ({
                    ...item,
                    percentage: ((item.value / totalAmount) * 100).toFixed(2)
                }));
    
                setData(formattedData);
            })
            .catch(error => console.error('Error fetching transactions:', error));
    }, [groupBy, currentMonth, filterMode]);
    
    return (
        <div className='spending-summary'>
            <div className='left-column'>
                <div className="pie-chart-container">
                    {/* Group by dropdown */}
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                        <option value="type">Group by Type</option>
                        <option value="category">Group by Category</option>
                    </select>

                    {/* Pie chart */}
                    <div className='recharts-responsive-container'>
                        {data.length === 0 ? "No data available" :
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        animationDuration={300}
                                        label={({ name, percent, value }) => 
                                            `${name}: ${(percent * 100).toFixed(0)}%$${value.toFixed(0)}`}
                                        >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        }
                    </div>

                    <div className='totals'>
                        <div className='totals-labels'>
                            Income - Expenses = Savings
                        </div>
                        <div className='totals-values'>
                            ${income.toFixed(0)} - ${Math.abs(expenses).toFixed(0)} = ${(income - Math.abs(expenses)).toFixed(0)}
                        </div>
                    </div>


                    <div className="month-navigation">
                        <button onClick={handlePrevPeriod}>&#9664;</button>
                        <div className='period-label'>
                            {filterMode === 'month'
                                ? currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
                                : currentMonth.getFullYear()}
                        </div>
                        <button onClick={handleNextPeriod}>&#9654;</button>
                    </div>

                    {/* Filter mode dropdown */}
                    <div className="filter-mode">
                        <label>Filter by: </label>
                        <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className='right-column'>

            </div>
        </div>
    );
};

export default SpendingSummary;
