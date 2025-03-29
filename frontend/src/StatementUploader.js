import React, { useState } from 'react';
import axios from 'axios';
import './StatementUploader.css';

const StatementUploader = () => {
    const [file, setFile] = useState(null);
    const [showFileInfo, setShowFileInfo] = useState(false);
    const [showMappingPrompt, setShowMappingPrompt] = useState(false);
    const [map, setMap] = useState({});
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [headers, setHeaders] = useState([]);
    const [mappedHeaders, setMappedHeaders] = useState({
        date: null,
        amount: null,
        description: null,
        category: null,
        type: null,
        balance: null,
    });
    const [autofillMappings, setAutofillMappings] = useState([]);
    const [accountName, setAccountName] = useState("");
    
    const fields = ['date', 'amount', 'description', 'category', 'type', 'balance'];

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setShowFileInfo(true);

            // Automatically trigger mapping check when a file is selected
            checkFileMapping(e.target.files[0]);
        }
    };

    const checkFileMapping = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
            const fileContent = reader.result;
            const firstLine = fileContent.split('\n')[0];

            const headersArray = firstLine.split(','); // Adjust if necessary
            setHeaders(headersArray);

            axios
                .post(
                    'http://localhost:5000/upload-and-check',
                    { headers: headersArray },
                    {
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
                .then((response) => {
                    if (response.data.mappingFound) {
                        setMap(response.data.map);
                        setShowMappingPrompt(false); // Hide mapping prompt if found
                    } else {
                        console.log('No matching map found.');
                        setMap(null);
                        setShowMappingPrompt(true); // Show mapping prompt if not found
                    }
                })
                .catch((error) => {
                    console.error('Error uploading file:', error);
                });
        };

        reader.readAsText(file);
    };

    const handleFileUpload = () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mapping', JSON.stringify(map));

        axios
            .post('http://localhost:5000/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((response) => {
                setTimeout(() => {
                    setFile(null);
                    setShowFileInfo(false);
                }, 400);
            })
            .catch((error) => {
                console.error('Error uploading file:', error);
            });
    };

    const handleDetach = () => {
        setShowMappingPrompt(false);
        setShowFileInfo(false);
        setFile(null);
    };

    const handleDragStart = (e, header) => {
        e.dataTransfer.setData('header', header);
    };

    const handleDrop = (e, field) => {
        e.preventDefault();
        const draggedHeader = e.dataTransfer.getData('header');
        setMappedHeaders((prevState) => ({
            ...prevState,
            [field]: draggedHeader,
        }));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleClearMapping = (field) => {
        setMappedHeaders((prevState) => ({
            ...prevState,
            [field]: null,
        }));
    };

    const handleAddAutofillMapping = () => {
        setAutofillMappings((prevRules) => [
            ...prevRules,
            { fill: '', fillBasedOn: '', map: [{fillValue: '', fillBasedOnValue: ''}]},
        ]);
    };

    const handleAddAutofillMappingRule = (autofillMappingsIndex) => {
        const newMappings = [...autofillMappings];
        let newMapArray = [...newMappings[autofillMappingsIndex]["map"]];
        newMapArray = [...newMapArray, {fillValue: '', fillBasedOnValue: ''}]
        newMappings[autofillMappingsIndex]["map"] = newMapArray;
        setAutofillMappings(newMappings);
    };
    
    const handleAutofillMappingsChange = (autofillMappingsIndex, field, value) => {
        const newMappings = [...autofillMappings];
        newMappings[autofillMappingsIndex][field] = value;
        setAutofillMappings(newMappings);
    };

    const handleAutofillMappingRuleChange = (autofillMappingsIndex, autofillMappingsRuleIndex, field, value) => {
        const newMappings = [...autofillMappings];
        newMappings[autofillMappingsIndex]["map"][autofillMappingsRuleIndex][field] = value;
        setAutofillMappings(newMappings);
    };
    
    const handleDeleteAutofillMappingRule = (autofillMappingsIndex, autofillMappingsRuleIndex) => {
        const newMappings = [...autofillMappings]; // Create a copy of the rules
        newMappings[autofillMappingsIndex]["map"].splice(autofillMappingsRuleIndex, 1); // Remove the rule at the specified index
        if (newMappings[autofillMappingsIndex]["map"].length === 0)
            newMappings.splice(autofillMappingsIndex, 1); // Remove the rule at the specified index
        setAutofillMappings(newMappings); // Update the state with the modified list
    };

    const handleSave = () => {
        const accountName = document.querySelector('.statement-uploader-text-input').value.trim(); // Get and trim the account name input
    
        // Check if the account name input has text
        if (!accountName) {
            alert("Please enter an account name."); // You can customize this message
            return; // Exit the function if no account name is provided
        }

        if (!mappedHeaders['balance'] && !mappedHeaders['amount']) {
            alert("the balance or amount mappings have to have values"); // You can customize this message
            return; // Exit the function if no account name is provided
        }
    
        const jsonData = {
            name: accountName,
            headers: headers, // Headers from the file
            map: mappedHeaders, // The field mappings
            autofillMaps: autofillMappings.map(rule => ({
                fill: rule.fill,
                fillBasedOn: rule.fillBasedOn,
                map: rule.map.reduce((acc, entry) => {
                    acc[entry.fillBasedOnValue] = entry.fillValue;
                    return acc;
                }, {})
            }))                
        };
    
        // Send the JSON data to the backend
        axios.post('http://localhost:5000/save-mapping', jsonData, {
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
            console.log('Mapping saved successfully', response);
            setIsDialogOpen(false);
        })
        .catch(error => {
            console.error('Error saving mapping:', error);
        });
    };

    const handleEdit = (headersFromFile) => {
        // Ensure headersFromFile is properly formatted
        if (!headersFromFile || !Array.isArray(headersFromFile) || headersFromFile.length === 0) {
            alert('Invalid or missing headers.');
            return;
        }
    
        axios.get('http://localhost:5000/get-mapping', {
            params: { headers: JSON.stringify(headersFromFile) } // Send headers as a JSON string
        })
        .then(response => {
            const mappingData = response.data;
    
            if (mappingData) {
                setAccountName(mappingData.name); // Update state instead of using document.querySelector
                setHeaders(mappingData.headers); // Ensure headers are properly set
                setMappedHeaders(mappingData.map);
                setAutofillMappings(mappingData.autofillMaps.map(rule => ({
                    fill: rule.fill,
                    fillBasedOn: rule.fillBasedOn,
                    map: Object.entries(rule.map).map(([fillBasedOnValue, fillValue]) => ({
                        fillBasedOnValue,
                        fillValue
                    }))
                })));
    
                // Open the dialog for editing
                setIsDialogOpen(true);
            } else {
                alert('Mapping not found!');
            }
        })
        .catch(error => {
            console.error('Error fetching mapping:', error);
        });
    };
    
    return (
        <div className="statement-uploader">
            <h2>Upload Statements</h2>

            <input
                type="file"
                accept=".csv"
                id="file-input"
                onChange={handleFileChange}
            />

            <div className="file-actions">
                {!file ? (
                    <label htmlFor="file-input" className="statement-uploader-button confirm-button">
                        Choose File
                    </label>
                ) : (
                    <div className="file-info-container">
                        <div className="file-info">
                            <label>{file.name}</label>

                            {map ? (
                                <div className='file-upload-edit-detach'>
                                    <button onClick={() => handleFileUpload()} className={`statement-uploader-button confirm-button ${showFileInfo ? 'show' : 'hide'}`}>Upload</button>
                                    <button onClick={handleDetach} className={`statement-uploader-button detach-button ${showFileInfo ? 'show' : 'hide'}`}>Detach</button>
                                    <button onClick={() => handleEdit(headers)} className={`statement-uploader-button misc-button ${showFileInfo ? 'show' : 'hide'}`}>Edit Mapping</button>
                                </div>
                            ) : (
                                <div />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showMappingPrompt && (
                <div className="mapping-prompt">
                    <h3>No matching mapping found!</h3>
                    <div>
                        <button onClick={() => setIsDialogOpen(true)} className="statement-uploader-button confirm-button">
                            Create New Mapping
                        </button>
                        <button onClick={handleDetach} className="statement-uploader-button detach-button">
                            Detach
                        </button>
                    </div>
                </div>
            )}

            {isDialogOpen && (
                <div>
                    <div className="overlay"></div>
                    <div className="mapping-dialog">
                        <label>{file.name}</label>
                        <div className="mapping-dialog-content">
                            <div className='basic-mapping'>
                                <div className='account-name-entry'>
                                    Account Name:
                                    <input
                                        type="text"
                                        className="statement-uploader-text-input"
                                        value={accountName}
                                        onChange={(e) => setAccountName(e.target.value)}
                                    />
                                </div>
                                <div className="mapping-dialog-content-headers">
                                    {headers.length > 0 &&
                                        headers.map((header, index) => (
                                            <div
                                                key={index}
                                                className="mapping-dialog-content-header"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, header)}
                                            >
                                                {header}
                                            </div>
                                        ))}
                                </div>
                                <div className="map-tos">
                                    {fields.map((field) => (
                                        <div
                                            key={field}
                                            className="map-to"
                                            onDrop={(e) => handleDrop(e, field)}
                                            onDragOver={handleDragOver}
                                        >
                                            <span>{field}</span>
                                            <div className="arrow-up">↑</div>
                                            <div className={`header-container`} onClick={() => handleClearMapping(field)}>
                                                {mappedHeaders[field] ? (
                                                <div className="mapping-dialog-content-header">
                                                    {mappedHeaders[field]}
                                                </div>
                                                ) : (
                                                <div className="empty-header-container">

                                                </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="autofill-mappings">
                            {autofillMappings.map((mapping, autofillMappingsIndex) => (
                                <div key={autofillMappingsIndex} className="autofill-mapping">
                                    <div className='autofill-mapping-content'>
                                        <div className='autofill-map-fill-fillBasedOn'>
                                            <select
                                                className="statement-uploader-dropdown"
                                                value={mapping.fill}
                                                onChange={(e) => handleAutofillMappingsChange(autofillMappingsIndex, "fill", e.target.value)}
                                            >
                                                <option value="">Select</option>
                                                {fields.map((field) => (
                                                    <option key={field} value={field}>
                                                        {field}
                                                    </option>
                                                ))}
                                            </select>
                                            <span>←</span>
                                            <select
                                                className="statement-uploader-dropdown"
                                                value={mapping.fillBasedOn}
                                                onChange={(e) =>
                                                    handleAutofillMappingsChange(autofillMappingsIndex, "fillBasedOn", e.target.value)
                                                }
                                            >
                                                <option value="">Select</option>
                                                {fields.map((field) => (
                                                    <option key={field} value={field}>
                                                        {field}
                                                    </option>
                                                ))}
                                            </select>
                                            <span>:</span>
                                        </div>
                                        <div className='autofill-map-rules-section'>
                                            {mapping["map"].map((map, autofillMappingsRuleIndex) => (
                                                <div key={autofillMappingsRuleIndex} className='autofill-map-fillValue-fillBasedOnValue'>
                                                    <input
                                                        className="statement-uploader-text-input"
                                                        value={map.fillValue}
                                                        onChange={(e) =>
                                                            handleAutofillMappingRuleChange(autofillMappingsIndex, autofillMappingsRuleIndex, "fillValue", e.target.value)
                                                        }
                                                    />
                                                    <span>←</span>
                                                    <input
                                                        className="statement-uploader-text-input"
                                                        value={map.fillBasedOnValue}
                                                        onChange={(e) =>
                                                            handleAutofillMappingRuleChange(autofillMappingsIndex, autofillMappingsRuleIndex, "fillBasedOnValue", e.target.value)
                                                        }
                                                    />
                                                    <button onClick={() => handleDeleteAutofillMappingRule(autofillMappingsIndex, autofillMappingsRuleIndex)} className="statement-uploader-button detach-button">
                                                        Delete
                                                    </button>
                                                </div>
                                            ))}
                                        </div>    
                                    </div>
                                    <button className='statement-uploader-button confirm-button add-rule-button' onClick={() => handleAddAutofillMappingRule(autofillMappingsIndex)}>Add Rule</button>
                                </div>
                            ))}
                            <button className='statement-uploader-button confirm-button' onClick={handleAddAutofillMapping}>Add New Map</button>
                        </div>
                        </div>
                        {/* Additional Rules Section */}
                        <div className="mapping-dialog-buttons">
                            <button onClick={handleSave} className="statement-uploader-button confirm-button">
                                Save
                            </button>
                            <button onClick={() => setIsDialogOpen(false)} className="statement-uploader-button detach-button">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatementUploader;
