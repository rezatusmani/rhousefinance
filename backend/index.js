const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Add the express.json() middleware to parse JSON requests
app.use(express.json());

// Allow all origins
app.use(cors());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Setup file upload using multer
const upload = multer({ dest: 'uploads/' });

// Fetch all transactions, sorted by transaction date
app.get('/transactions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
        res.json(result.rows);  // Send back all the rows as JSON
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Unable to fetch transactions' });
    }
});

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    let mapping;
    try {
        mapping = JSON.parse(req.body.mapping);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid mapping format' });
    }

    if (!mapping.map) {
        return res.status(400).json({ error: 'Mapping is missing or invalid' });
    }

    try {
        const filePath = path.join(__dirname, 'uploads', req.file.filename);
        const fileContent = fs.readFileSync(filePath, 'utf8');

        Papa.parse(fileContent, {
            header: true,
            dynamicTyping: true,
            complete: async (results) => {
                const parsedData = results.data;

                let transactions = parsedData.map(row => {
                    let transaction = {
                        account: mapping.name,
                        date: row[mapping.map['date']] || new Date().toISOString().split('T')[0],
                        amount: row[mapping.map['amount']],
                        balance: row[mapping.map['balance']],
                        category: row[mapping.map['category']] || "NO_CATEGORY",
                        description: row[mapping.map['description']],
                        type: 'Unselected'
                    };

                    // Skip invalid rows
                    if (!transaction.amount && !transaction.balance) return null;

                    // Autofill mappings
                    for (const autofillMap of mapping.autofillMaps || []) {
                        const valueToCheck = (transaction[autofillMap.fillBasedOn] || '').toLowerCase();
                        for (const key of Object.keys(autofillMap.map)) {
                            if (valueToCheck.includes(key.toLowerCase())) {
                                transaction[autofillMap.fill] = autofillMap.map[key];
                                break;
                            }
                        }
                    }

                    return transaction;
                }).filter(transaction => transaction !== null);

                if (transactions.length > 0) {
                    await saveToDatabase(transactions);
                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Error deleting file:', err);
                    });
                    res.status(200).json(transactions);
                } else {
                    res.status(400).json({ error: 'No valid transactions found' });
                }
            },
            error: (error) => {
                console.error('CSV Parsing Error:', error);
                res.status(500).json({ error: 'Error parsing CSV file' });
            }
        });
    } catch (err) {
        console.error('Error processing file:', err);
        res.status(500).json({ error: 'Error processing file' });
    }
});

// POST route for checking the headers of the uploaded file
app.post('/upload-and-check', (req, res) => {
    const { headers } = req.body;

    const mappingsFilePath = path.join(__dirname, 'mappings.json');

    fs.readFile(mappingsFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading mappings file' });
        }

        let mappings;
        try {
            mappings = JSON.parse(data);
        } catch (parseError) {
            return res.status(500).json({ error: 'Error parsing mappings file' });
        }

        // Check if the provided headers match any predefined mappings
        const matchingMapping = mappings.find(mapping => 
            mapping.headers.every((header, index) => headers[index] === header)
        );

        if (matchingMapping) {
            // If a matching map is found, return only the name of the map
            return res.json({ mappingFound: true, map: matchingMapping });
        } else {
            // If no matching map is found, indicate that
            return res.json({ mappingFound: false });
        }
    });
});

// Save a new mapping
app.post('/save-mapping', (req, res) => {
    const newMapping = req.body;

    const mappingsFilePath = path.join(__dirname, 'mappings.JSON');

    fs.readFile(mappingsFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error('Error reading mappings file:', err);
            return res.status(500).json({ message: 'Error reading mappings file' });
        }

        let mappings = [];
        if (data) {
            try {
                mappings = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing mappings file:', parseError);
                return res.status(500).json({ message: 'Error parsing mappings file' });
            }
        }

        // Remove existing mapping with the same headers
        mappings = mappings.filter(mapping => JSON.stringify(mapping.headers) !== JSON.stringify(newMapping.headers));

        // Add the new mapping
        mappings.push(newMapping);

        // Save the updated mappings to the file
        fs.writeFile(mappingsFilePath, JSON.stringify(mappings, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error saving mappings file:', err);
                return res.status(500).json({ message: 'Error saving mappings file' });
            }

            return res.status(200).json({ message: 'Mapping saved successfully' });
        });
    });
});

// Get mapping based on headers
app.get('/get-mapping', (req, res) => {
    const requestedHeaders = req.query.headers; // Expecting headers as a query parameter (comma-separated or JSON array)
    const mappingsFilePath = path.join(__dirname, 'mappings.JSON');

    fs.readFile(mappingsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading mappings file:', err);
            return res.status(500).json({ message: 'Error reading mappings file' });
        }

        let mappings = [];
        if (data) {
            try {
                mappings = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing mappings file:', parseError);
                return res.status(500).json({ message: 'Error parsing mappings file' });
            }
        }

        // Ensure requestedHeaders is an array
        let parsedHeaders;
        try {
            parsedHeaders = JSON.parse(requestedHeaders);
            if (!Array.isArray(parsedHeaders)) throw new Error();
        } catch {
            return res.status(400).json({ message: 'Invalid headers format' });
        }

        // Find a mapping where headers match exactly
        const mapping = mappings.find(mapping => 
            Array.isArray(mapping.headers) && 
            mapping.headers.length === parsedHeaders.length &&
            mapping.headers.every(header => parsedHeaders.includes(header))
        );

        if (mapping) {
            return res.status(200).json(mapping);
        } else {
            return res.status(404).json({ message: 'Mapping not found' });
        }
    });
});

// Delete all transactions from the database
app.delete('/transactions', (req, res) => {
    pool.query('DELETE FROM public.transactions', (err, result) => {
        if (err) {
            res.status(500).send('Error deleting transactions');
        } else {
            res.status(200).send('All transactions deleted');
        }
    });
});

// Delete a specific transaction by ID
app.delete('/transactions/:id', (req, res) => {
    const { id } = req.params;

    pool.query('DELETE FROM public.transactions WHERE id = $1', [id], (err, result) => {
        if (err) {
            console.error('Error deleting transaction:', err);
            res.status(500).send('Error deleting transaction');
        } else {
            res.status(200).send(`Transaction with ID ${id} deleted`);
        }
    });
});

const saveToDatabase = async (transactions) => {
    const query = 'INSERT INTO public.transactions (amount, category, type, date, description, notes, account, balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
    for (const transaction of transactions) {
        try {
            const checkQuery = 'SELECT * FROM public.transactions WHERE amount = $1 AND date = $2 AND description = $3';
            const result = await pool.query(checkQuery, [
                transaction.amount, 
                transaction.date,
                transaction.description
            ]);

            if (result.rows.length === 0) {
                await pool.query(query, [
                    transaction.amount, 
                    transaction.category,
                    transaction.type,
                    transaction.date,
                    transaction.description,
                    transaction.notes || '',  // Default to empty string if no notes
                    transaction.account,
                    transaction.balance,
                ]);
            }
        } catch (error) {
            console.error(`Error inserting transaction ${JSON.stringify(transaction)}:`, error);
        }
    }
};

// PUT route to update any field of a transaction
app.put('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
        return res.status(400).send('No fields provided for update');
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const query = `UPDATE public.transactions SET ${setClause} WHERE id = $${fields.length + 1}`;
    
    try {
        await pool.query(query, [...values, id]);
        res.status(200).send('Transaction updated');
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).send('Error updating transaction');
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
