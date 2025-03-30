import React from 'react';
import { BrowserRouter as Router, Route, Routes, } from 'react-router-dom';
import './App.css';
import StatementUploader from './StatementUploader';
import TransactionsTable from './TransactionsTable'; // Import TransactionsTable component
import Navigation from './Navigation'; // Import Navigation component
import SpendingSummary from './SpendingSummary';
import Dashboard from './Dashboard';

function App() {
    return (
        <Router>
            <div className="app-container">
                <div className='app-header-container'>
                    <h1>RHouse Personal Finance</h1>
                </div>
                <Navigation />

                <div className='app-content-container'>
                    <Routes className="app-routes">
                        <Route path="/transactions" element={<TransactionsTable />} />
                        <Route path="/statement-uploader" element={<StatementUploader />} />
                        <Route path="/spending-summary" element={<SpendingSummary />} />
                        <Route path="*" element={<Dashboard />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
