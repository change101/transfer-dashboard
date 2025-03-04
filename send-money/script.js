document.addEventListener('DOMContentLoaded', function() {
    // Get transaction ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('id');
    
    // Debug: Log the transaction ID
    console.log("Transaction ID from URL:", transactionId);
    
    // Elements
    const loadingContainer = document.getElementById('loadingContainer');
    const transferContent = document.getElementById('transferContent');
    const errorContainer = document.getElementById('errorContainer');
    const continueButton = document.getElementById('continueButton');
    
    // API base URL - Update with your actual API endpoint
    // For local development with ngrok
    const API_BASE_URL = 'https://429fef3d9e8a.ngrok.app';
    
    // Function to format currency
    function formatCurrency(amount, currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }
    
    // Function to fetch transaction data
    async function fetchTransactionData() {
        if (!transactionId) {
            console.error("No transaction ID found in URL");
            showError();
            return;
        }
        
        try {
            const requestUrl = `${API_BASE_URL}/api/transaction/${transactionId}`;
            console.log("Fetching data from:", requestUrl);
            
            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                credentials: 'omit'
            });
            
            console.log("Response status:", response.status);
            
            if (!response.ok) {
                console.error("API returned error status:", response.status);
                throw new Error(`Failed to fetch transaction data: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("API response data:", data);
            
            if (data.status === 'success' && data.transfer_data) {
                // Check if the data has the details we need
                if (data.transfer_data.details) {
                    displayTransferData(data);
                } else {
                    console.error("Missing details in transfer_data");
                    showError("Missing transaction details");
                }
            } else {
                console.error("Data format incorrect:", data);
                showError();
            }
        } catch (error) {
            console.error('Error fetching transaction data:', error);
            showError();
        }
    }
    
    // Function to display transfer data
    function displayTransferData(data) {
        console.log("Displaying transfer data:", data);
        
        // Extract details from the transfer_data
        const transferData = data.transfer_data;
        const details = transferData.details;
        
        // Set country info
        let countryName = "Other country";
        if (transferData.country === "mx") countryName = "Mexico";
        if (transferData.country === "gt") countryName = "Guatemala";
        
        // Set recipient info if elements exist
        const recipientNameEl = document.getElementById('recipientName');
        const recipientCountryEl = document.getElementById('recipientCountry');
        
        if (recipientNameEl) recipientNameEl.textContent = "Recipient via WhatsApp";
        if (recipientCountryEl) recipientCountryEl.textContent = countryName;
        
        // Set amounts
        const sendAmountEl = document.getElementById('sendAmount');
        const sendCurrencyEl = document.getElementById('sendCurrency');
        const receiveAmountEl = document.getElementById('receiveAmount');
        const receiveCurrencyEl = document.getElementById('receiveCurrency');
        
        if (sendAmountEl) sendAmountEl.textContent = formatCurrency(details.amount_from);
        if (sendCurrencyEl) sendCurrencyEl.textContent = details.currency_from;
        if (receiveAmountEl) receiveAmountEl.textContent = formatCurrency(details.amount_to);
        if (receiveCurrencyEl) receiveCurrencyEl.textContent = details.currency_to;
        
        // Set delivery method
        const deliveryMethodEl = document.getElementById('deliveryMethod');
        if (deliveryMethodEl) {
            deliveryMethodEl.textContent = 
                transferData.delivery_method === 'bank_deposit' ? 'Bank deposit' : 'Cash pickup';
        }
        
        // Set fees and total
        const transferFeeEl = document.getElementById('transferFee');
        const totalAmountEl = document.getElementById('totalAmount');
        
        if (transferFeeEl) {
            transferFeeEl.textContent = 
                `${formatCurrency(details.transfer_fee)} ${details.currency_from}`;
        }
        
        if (totalAmountEl) {
            totalAmountEl.textContent = 
                `${formatCurrency(details.total_amount)} ${details.currency_from}`;
        }
        
        // Set exchange rate
        const exchangeRateEl = document.getElementById('exchangeRate');
        if (exchangeRateEl) {
            exchangeRateEl.textContent = 
                `1 ${details.currency_from} = ${details.exchange_rate} ${details.currency_to}`;
        }
        
        // Hide loading, show content
        loadingContainer.style.display = 'none';
        transferContent.style.display = 'block';
    }
    
    // Function to show error
    function showError(message = "Transfer data not found. Please return to WhatsApp and try again.") {
        loadingContainer.style.display = 'none';
        errorContainer.style.display = 'block';
        
        const errorMsgEl = document.querySelector('#errorContainer p');
        if (errorMsgEl) {
            errorMsgEl.textContent = message;
        }
    }
    
    // Set up continue button
    if (continueButton) {
        continueButton.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '<span class="loader"></span> Processing...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/transaction/complete/${transactionId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to complete transaction');
                }
                
                const data = await response.json();
                
                // Show success message
                const successMessageEl = document.getElementById('successMessage');
                const transferDetailsEl = document.getElementById('transferDetails');
                
                if (successMessageEl && transferDetailsEl) {
                    successMessageEl.style.display = 'block';
                    transferDetailsEl.style.display = 'none';
                } else {
                    alert('Transaction completed successfully!');
                }
                
                // Scroll to top
                window.scrollTo(0, 0);
                
            } catch (error) {
                console.error('Error completing transaction:', error);
                alert('There was an error processing your transaction. Please try again.');
            } finally {
                this.disabled = false;
                this.innerHTML = 'Send money';
            }
        });
    }
    
    // Initialize by fetching transaction data
    fetchTransactionData();
});
