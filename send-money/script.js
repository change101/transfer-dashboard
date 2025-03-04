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
    
    // Add new recipient/payment method elements
    const addRecipientBtn = document.getElementById('addRecipientBtn');
    const addPaymentBtn = document.getElementById('addPaymentBtn');
    const recipientForm = document.getElementById('recipientForm');
    const paymentForm = document.getElementById('paymentForm');
    const cancelRecipientBtn = document.getElementById('cancelRecipientBtn');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    const firstTimeView = document.getElementById('firstTimeView');
    const returningUserView = document.getElementById('returningUserView');
    
    // API base URL
    const API_BASE_URL = 'https://429fef3d9e8a.ngrok.app';
    
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
                userData = data;
                
                // Determine if user has previous transactions
                const hasHistory = data.user_history && 
                                  (data.user_history.recipients.length > 0 || 
                                   data.user_history.payment_methods.length > 0);
                
                // Show appropriate view based on history
                if (hasHistory) {
                    displayReturningUserView(data);
                } else {
                    displayFirstTimeView(data);
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
    
    // Function to display returning user view (with history)
    function displayReturningUserView(data) {
        if (firstTimeView) firstTimeView.style.display = 'none';
        if (returningUserView) returningUserView.style.display = 'block';
        
        const transferData = data.transfer_data;
        const details = transferData.details;
        
        // Fill in transaction data
        setTransactionDetails(transferData, details);
        
        // Fill in recipients if available
        if (data.user_history && data.user_history.recipients.length > 0) {
            const recipientContainer = document.getElementById('recipientOptions');
            if (recipientContainer) {
                recipientContainer.innerHTML = '';
                
                // Add each recipient option
                data.user_history.recipients.forEach((recipient, index) => {
                    const option = document.createElement('div');
                    option.className = 'recipient-option' + (index === 0 ? ' selected' : '');
                    option.dataset.id = recipient.id;
                    
                    option.innerHTML = `
                        <div class="avatar">${recipient.name.charAt(0).toUpperCase()}</div>
                        <div class="recipient-details">
                            <div class="recipient-name">${recipient.name}</div>
                            <div class="recipient-country">${recipient.country}</div>
                        </div>
                    `;
                    
                    // Add click handler
                    option.addEventListener('click', function() {
                        document.querySelectorAll('.recipient-option').forEach(el => {
                            el.classList.remove('selected');
                        });
                        this.classList.add('selected');
                    });
                    
                    recipientContainer.appendChild(option);
                });
            }
        }
        
        // Fill in payment methods if available
        if (data.user_history && data.user_history.payment_methods.length > 0) {
            const paymentContainer = document.getElementById('paymentOptions');
            if (paymentContainer) {
                paymentContainer.innerHTML = '';
                
                // Add each payment method option
                data.user_history.payment_methods.forEach((method, index) => {
                    const option = document.createElement('div');
                    option.className = 'payment-option' + (index === 0 ? ' selected' : '');
                    option.dataset.id = method.id;
                    
                    // Determine card icon class
                    let cardIconClass = 'card-generic';
                    if (method.card_type) {
                        const cardType = method.card_type.toLowerCase();
                        if (cardType.includes('visa')) cardIconClass = 'visa';
                        else if (cardType.includes('master')) cardIconClass = 'mastercard';
                        else if (cardType.includes('amex')) cardIconClass = 'amex';
                    }
                    
                    option.innerHTML = `
                        <div class="card-icon ${cardIconClass}"></div>
                        <div class="payment-details">
                            <div class="card-type">${method.card_type || 'Debit card'}</div>
                            <div class="card-number">${method.card_number}</div>
                        </div>
                        ${method.is_default ? '<div class="default-badge">Default</div>' : ''}
                    `;
                    
                    // Add click handler
                    option.addEventListener('click', function() {
                        document.querySelectorAll('.payment-option').forEach(el => {
                            el.classList.remove('selected');
                        });
                        this.classList.add('selected');
                    });
                    
                    paymentContainer.appendChild(option);
                });
            }
        }
        
        // Show content
        loadingContainer.style.display = 'none';
        transferContent.style.display = 'block';
    }
    
    // Function to display first-time user view
    function displayFirstTimeView(data) {
        if (returningUserView) returningUserView.style.display = 'none';
        if (firstTimeView) firstTimeView.style.display = 'block';
        
        const transferData = data.transfer_data;
        const details = transferData.details;
        
        // Fill in transaction data
        setTransactionDetails(transferData, details);
        
        // Show content
        loadingContainer.style.display = 'none';
        transferContent.style.display = 'block';
    }
    
    // Common function to set transaction details in either view
    function setTransactionDetails(transferData, details) {
        // Set country info
        let countryName = "Other country";
        if (transferData.country === "mx") countryName = "Mexico";
        if (transferData.country === "gt") countryName = "Guatemala";
        
        // Set country display in both views
        const countryElements = document.querySelectorAll('.recipient-country');
        countryElements.forEach(el => {
            el.textContent = countryName;
        });
        
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
        errorContainer.style.display = 'block';
        
        const errorMsgEl = document.querySelector('#errorContainer p');
        if (errorMsgEl) {
            errorMsgEl.textContent = message;
        }
    }
    
    // Set up form visibility toggles
    if (addRecipientBtn) {
        addRecipientBtn.addEventListener('click', function() {
            recipientForm.style.display = 'block';
            this.style.display = 'none';
        });
    }
    
    if (cancelRecipientBtn) {
        cancelRecipientBtn.addEventListener('click', function() {
            recipientForm.style.display = 'none';
            addRecipientBtn.style.display = 'block';
        });
    }
    
    if (addPaymentBtn) {
        addPaymentBtn.addEventListener('click', function() {
            paymentForm.style.display = 'block';
            this.style.display = 'none';
        });
    }
    
    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', function() {
            paymentForm.style.display = 'none';
            addPaymentBtn.style.display = 'block';
        });
    }
    
    // Set up continue button
    if (continueButton) {
        continueButton.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '<span class="loader"></span> Processing...';
            
            try {
                // Get selected recipient and payment method if available
                let selectedRecipientId = null;
                let selectedPaymentId = null;
                
                const selectedRecipient = document.querySelector('.recipient-option.selected');
                if (selectedRecipient) {
                    selectedRecipientId = selectedRecipient.dataset.id;
                }
                
                const selectedPayment = document.querySelector('.payment-option.selected');
                if (selectedPayment) {
                    selectedPaymentId = selectedPayment.dataset.id;
                }
                
                // Call complete transaction endpoint
                const response = await fetch(`${API_BASE_URL}/api/transaction/complete/${transactionId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        recipient_id: selectedRecipientId,
                        payment_method_id: selectedPaymentId
                    }),
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to complete transaction');
                }
                
                const data = await response.json();
                
                // Show success message
                const successMessageEl = document.getElementById('successMessage');
                if (successMessageEl) {
                    successMessageEl.style.display = 'block';
                    transferContent.style.display = 'none';
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
    
    // Set up new recipient form submission
    const newRecipientForm = document.getElementById('newRecipientForm');
    if (newRecipientForm) {
        newRecipientForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                full_name: document.getElementById('recipientName').value,
                country: userData?.transfer_data?.country?.toUpperCase() || 'MX', 
                bank_name: document.getElementById('bankName').value,
                bank_account_number: document.getElementById('accountNumber').value,
                user_id: userData?.user_id
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/recipient`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to add recipient');
                }
                
                // Refresh the page
                window.location.reload();
                
            } catch (error) {
                console.error('Error adding recipient:', error);
                alert('There was an error adding the recipient. Please try again.');
            }
        });
    }
    
    // Set up new payment method form submission
    const newPaymentForm = document.getElementById('newPaymentForm');
    if (newPaymentForm) {
        newPaymentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                user_id: userData?.user_id,
                card_number: document.getElementById('cardNumber').value,
                card_type: document.getElementById('cardType')?.value || 'Debit card',
                expiration_date: document.getElementById('cardExpiry').value,
                cvv: document.getElementById('cardCvv').value,
                billing_name: document.getElementById('cardName').value,
                country: document.getElementById('cardCountry').value,
                zip_code: document.getElementById('cardZip').value,
                is_default: document.getElementById('defaultCard')?.checked || false
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/payment-method`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to add payment method');
                }
                
                // Refresh the page
                window.location.reload();
                
            } catch (error) {
                console.error('Error adding payment method:', error);
                alert('There was an error adding the payment method. Please try again.');
            }
        });
    }
    
    // Initialize by fetching transaction data
    fetchTransactionData();
});
