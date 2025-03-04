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
    const recipientSelector = document.getElementById('recipientSelector');
    const addNewRecipientBtn = document.getElementById('addNewRecipient');
    const paymentMethodSelector = document.getElementById('paymentMethodSelector');
    
    // API base URL - Update with your actual API endpoint
    // For local development with ngrok
    const API_BASE_URL = 'https://429fef3d9e8a.ngrok.app';
    
    // Store transaction data
    let transactionData = null;
    
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
            
            if (data.status === 'success') {
                transactionData = data;
                displayTransferData(data);
                
                // If user has history, populate selectors
                if (data.user_history) {
                    populateRecipients(data.user_history.recipients, data.recipient.id);
                    populatePaymentMethods(data.user_history.payment_methods, data.payment_method.id);
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
    
    // Function to populate recipient selector
    function populateRecipients(recipients, selectedId) {
        if (!recipients || recipients.length === 0) {
            // Hide selector if no previous recipients
            document.querySelector('.recipient-section').classList.add('no-history');
            return;
        }
        
        recipientSelector.innerHTML = '';
        
        recipients.forEach(recipient => {
            const option = document.createElement('div');
            option.className = 'recipient-option';
            if (recipient.id === selectedId) {
                option.classList.add('selected');
            }
            
            option.innerHTML = `
                <div class="avatar">${recipient.name.charAt(0)}</div>
                <div class="recipient-details">
                    <div class="recipient-name">${recipient.name}</div>
                    <div class="recipient-country">${recipient.country}</div>
                </div>
            `;
            
            option.dataset.id = recipient.id;
            recipientSelector.appendChild(option);
            
            // Add click event
            option.addEventListener('click', function() {
                document.querySelectorAll('.recipient-option').forEach(el => {
                    el.classList.remove('selected');
                });
                this.classList.add('selected');
                // In a real app, you would update the transaction here
            });
        });
        
        // Show the selector
        document.querySelector('.recipient-section').classList.remove('no-history');
    }
    
    // Function to populate payment method selector
    function populatePaymentMethods(paymentMethods, selectedId) {
        if (!paymentMethods || paymentMethods.length === 0) {
            // Hide selector if no previous payment methods
            document.querySelector('.payment-section').classList.add('no-history');
            return;
        }
        
        paymentMethodSelector.innerHTML = '';
        
        paymentMethods.forEach(method => {
            const option = document.createElement('div');
            option.className = 'payment-option';
            if (method.id === selectedId) {
                option.classList.add('selected');
            }
            
            option.innerHTML = `
                <div class="card-icon ${method.card_type.toLowerCase()}"></div>
                <div class="payment-details">
                    <div class="card-type">${method.card_type}</div>
                    <div class="card-number">${method.card_number}</div>
                </div>
                ${method.is_default ? '<div class="default-badge">Default</div>' : ''}
            `;
            
            option.dataset.id = method.id;
            paymentMethodSelector.appendChild(option);
            
            // Add click event
            option.addEventListener('click', function() {
                document.querySelectorAll('.payment-option').forEach(el => {
                    el.classList.remove('selected');
                });
                this.classList.add('selected');
                // In a real app, you would update the transaction here
            });
        });
        
        // Show the selector
        document.querySelector('.payment-section').classList.remove('no-history');
    }
    
    // Function to display transfer data
    function displayTransferData(data) {
        console.log("Displaying transfer data:", data);
        
        // Extract data for easier access
        const transaction = data.transaction;
        const recipient = data.recipient;
        const payment = data.payment_method;
        
        // Set recipient info
        document.getElementById('recipientName').textContent = recipient.name;
        document.getElementById('recipientCountry').textContent = recipient.country;
        
        // Set amounts
        document.getElementById('sendAmount').textContent = formatCurrency(transaction.send_amount);
        document.getElementById('sendCurrency').textContent = transaction.send_currency;
        
        document.getElementById('receiveAmount').textContent = formatCurrency(transaction.receive_amount);
        document.getElementById('receiveCurrency').textContent = transaction.receive_currency;
        
        // Set delivery method
        document.getElementById('deliveryMethod').textContent = 
            transaction.delivery_method === 'bank_deposit' ? 'Bank deposit' : 'Cash pickup';
        
        // Set fees and total
        document.getElementById('transferFee').textContent = 
            `${formatCurrency(transaction.fee_amount)} ${transaction.send_currency}`;
        document.getElementById('totalAmount').textContent = 
            `${formatCurrency(transaction.total_amount)} ${transaction.send_currency}`;
        
        // Set exchange rate
        document.getElementById('exchangeRate').textContent = 
            `1 ${transaction.send_currency} = ${transaction.exchange_rate} ${transaction.receive_currency}`;
        
        // Set card info if available
        if (payment && payment.card_number) {
            document.getElementById('cardNumber').textContent = payment.card_number;
        }
        
        // Store user ID for form submissions
        if (data.sender && data.sender.id) {
            localStorage.setItem('currentUserId', data.sender.id);
        }
        
        // Hide loading, show content
        loadingContainer.style.display = 'none';
        transferContent.style.display = 'block';
    }
    
    // Function to show error
    function showError() {
        loadingContainer.style.display = 'none';
        errorContainer.style.display = 'block';
    }
    
    // Set up continue button
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
            document.getElementById('successMessage').style.display = 'block';
            document.getElementById('transferDetails').style.display = 'none';
            
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
    
    // Set up add new recipient button
    if (addNewRecipientBtn) {
        addNewRecipientBtn.addEventListener('click', function() {
            document.getElementById('addRecipientForm').style.display = 'block';
            document.getElementById('recipientSelector').style.display = 'none';
            this.style.display = 'none';
        });
    }
    
    // Set up add recipient form submission
    const addRecipientForm = document.getElementById('addRecipientForm');
    if (addRecipientForm) {
        addRecipientForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const userId = localStorage.getItem('currentUserId');
            if (!userId) {
                alert('User ID not found. Please refresh the page.');
                return;
            }
            
            const formData = {
                user_id: userId,
                full_name: document.getElementById('newRecipientName').value,
                country: document.getElementById('newRecipientCountry').value,
                bank_name: document.getElementById('newRecipientBank').value,
                bank_account_number: document.getElementById('newRecipientAccount').value
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
                
                const data = await response.json();
                
                // Refresh the page to show the new recipient
                window.location.reload();
                
            } catch (error) {
                console.error('Error adding recipient:', error);
                alert('There was an error adding the recipient. Please try again.');
            }
        });
    }
    
    // Set up add payment method form submission
    const addPaymentForm = document.getElementById('addPaymentForm');
    if (addPaymentForm) {
        addPaymentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const userId = localStorage.getItem('currentUserId');
            if (!userId) {
                alert('User ID not found. Please refresh the page.');
                return;
            }
            
            const formData = {
                user_id: userId,
                card_number: document.getElementById('newCardNumber').value,
                card_type: document.getElementById('newCardType').value,
                expiration_date: document.getElementById('newCardExpiry').value,
                cvv: document.getElementById('newCardCvv').value,
                billing_name: document.getElementById('newCardName').value,
                country: document.getElementById('newCardCountry').value,
                zip_code: document.getElementById('newCardZip').value,
                is_default: document.getElementById('newCardDefault').checked
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
                
                const data = await response.json();
                
                // Refresh the page to show the new payment method
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
