// transfer-dashboard/send-money/script.js
document.addEventListener('DOMContentLoaded', function () {
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
    const API_BASE_URL = 'https://32e5da3ec239.ngrok.app';
    // const API_BASE_URL = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    // ? 'http://localhost:5001'  // Use localhost:5001 for local development
    // : window.location.origin;  // Otherwise use the same origin as the page

    const newTransferBtn = document.querySelector('.btn-new-transfer');
    if (newTransferBtn) {
        newTransferBtn.addEventListener('click', function (e) {
            e.preventDefault();
            redirectToWhatsApp();
        });
    }

    console.log("Using API base URL:", API_BASE_URL);

    // Store user data
    let userData = null;


    // View management functions
    function showView(viewId) {
        // Hide all views
        const views = [
            'firstTimeView',
            'reviewView',
            'returningUserView',
            'reviewDetailsView',
            'recipientSelectionView',
            'paymentMethodView',
            'securityCodeScreen',
            'viewDetailsContainer',
            'addRecipientForm',
            'addPaymentForm'
        ];
        
        views.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Show requested view
        const view = document.getElementById(viewId);
        if (view) {
            view.style.display = 'block';
        }
    }



    function initViewEventListeners() {
        // Initialize security code screen event listeners
        initSecurityCodeScreen();
        
        // Initialize review details view event listeners
        document.getElementById('sendMoneyButton').addEventListener('click', function() {
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            try {
                // Show security code verification screen
                showSecurityCodeScreen();
            } catch (error) {
                console.error('Error preparing transaction:', error);
                alert(`Error: ${error.message || 'Failed to prepare transaction'}`);
                
                // Reset button state
                this.disabled = false;
                this.innerHTML = 'Send money';
            }
        });
    }


    
    // Function to set up and show the review details view (Image 1)
    function showReviewDetailsView(recipientData, paymentData, transferData) {
        // Fill recipient details
        document.getElementById('reviewDetailsRecipientName').textContent = recipientData.name;
        
        // Set country with flag if available
        let countryDisplay = recipientData.country || 'Unknown';
        if (recipientData.country === 'IN' || recipientData.country === 'INDIA') {
            countryDisplay = '🇮🇳 India';
        } else if (recipientData.country === 'MX' || recipientData.country === 'MEXICO') {
            countryDisplay = '🇲🇽 Mexico';
        } else if (recipientData.country === 'GT' || recipientData.country === 'GUATEMALA') {
            countryDisplay = '🇬🇹 Guatemala';
        }
        document.getElementById('reviewDetailsDestination').textContent = countryDisplay;
        
        // Set delivery method
        document.getElementById('reviewDetailsDeliveryMethod').textContent = 
            transferData.delivery_method === 'bank_deposit' ? 'Bank deposit' : 'Cash pickup';
        
        // Set account number (masked)
        const accountNumber = recipientData.bank_account_number || '';
        const lastFour = accountNumber ? `**** ${accountNumber.slice(-4)}` : '';
        document.getElementById('reviewDetailsAccountNumber').textContent = lastFour;
        
        // Fill transfer details
        const details = transferData.details;
        document.getElementById('reviewDetailsSendAmount').textContent = 
            `${formatCurrency(details.amount_from)} ${details.currency_from}`;
            
        document.getElementById('reviewDetailsTransferFees').textContent = 
            `${formatCurrency(details.transfer_fee)} ${details.currency_from}`;
            
        document.getElementById('reviewDetailsTotal').textContent = 
            `${formatCurrency(details.total_amount)} ${details.currency_from}`;
            
        document.getElementById('reviewDetailsReceiveAmount').textContent = 
            `${formatCurrency(details.amount_to)} ${details.currency_to}`;
            
        document.getElementById('reviewDetailsExchangeRate').textContent = 
            `Exchange rate: 1 ${details.currency_from} = ${details.exchange_rate} ${details.currency_to}`;
            
        // Fill payment method details
        const cardNumber = paymentData.card_number || '';
        const lastFourCard = cardNumber ? `*${cardNumber.slice(-4)}` : '';
        document.getElementById('reviewDetailsCardNumber').textContent = lastFourCard;
        
        // Set up event listeners for edit links
        document.getElementById('editRecipientLink').addEventListener('click', function(e) {
            e.preventDefault();
            showRecipientSelectionView(transferData);
        });
        
        document.getElementById('editPaymentLink').addEventListener('click', function(e) {
            e.preventDefault();
            showPaymentMethodView();
        });
        
        // Set up send money button
        document.getElementById('sendMoneyButton').addEventListener('click', function() {
            // Show security code verification screen
            showSecurityCodeScreen();
        });
        
        // Show the view
        showView('reviewDetailsView');
    }
    
    // Function to set up and show recipient selection view (Image 2/3)
    function showRecipientSelectionView(transferData) {
        // Clear input fields
        document.getElementById('recipientNameInput').value = '';
        document.getElementById('recipientBankInput').value = '';
        document.getElementById('recipientAccountInput').value = '';
        
        // Fill transfer details
        const details = transferData.details;
        document.getElementById('recipientViewSendAmount').textContent = 
            `${formatCurrency(details.amount_from)} ${details.currency_from}`;
            
        document.getElementById('recipientViewTransferFees').textContent = 
            `${formatCurrency(details.transfer_fee)} ${details.currency_from}`;
            
        document.getElementById('recipientViewTotal').textContent = 
            `${formatCurrency(details.total_amount)} ${details.currency_from}`;
            
        document.getElementById('recipientViewReceiveAmount').textContent = 
            `${formatCurrency(details.amount_to)} ${details.currency_to}`;
            
        document.getElementById('recipientViewExchangeRate').textContent = 
            `Exchange rate: 1 ${details.currency_from} = ${details.exchange_rate} ${details.currency_to}`;
        
        // Add recent recipients if available
        const recentRecipientsList = document.getElementById('recentRecipientsList');
        recentRecipientsList.innerHTML = '';
        
        if (userData && userData.user_history && userData.user_history.recipients) {
            userData.user_history.recipients.forEach(recipient => {
                const lastFour = recipient.bank_account_number 
                    ? `*${recipient.bank_account_number.slice(-4)}` 
                    : '';
                    
                const recipientItem = document.createElement('div');
                recipientItem.className = 'recent-recipient-item';
                recipientItem.innerHTML = `
                    <div class="avatar">${recipient.name.charAt(0)}</div>
                    <div class="recent-recipient-info">
                        <div class="recent-recipient-name">${recipient.name}</div>
                        <div class="recent-recipient-account">${lastFour}</div>
                    </div>
                    <div class="view-option">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zm-8 3.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/>
                        </svg>
                    </div>
                `;
                
                // Add click event to select this recipient
                recipientItem.addEventListener('click', function() {
                    // Fill the form fields with recipient data
                    document.getElementById('recipientNameInput').value = recipient.name;
                    document.getElementById('recipientBankInput').value = recipient.bank_name || '';
                    document.getElementById('recipientAccountInput').value = recipient.bank_account_number || '';
                    
                    // Store selected recipient
                    localStorage.setItem('selectedRecipientId', recipient.id);
                    localStorage.setItem('selectedRecipient', JSON.stringify(recipient));
                });
                
                recentRecipientsList.appendChild(recipientItem);
            });
            
            // Show recent recipients section
            document.getElementById('recentRecipientsSection').style.display = 'block';
        } else {
            // Hide recent recipients section if no history
            document.getElementById('recentRecipientsSection').style.display = 'none';
        }
        
        // Set up payment method display
        if (userData && userData.user_history && userData.user_history.payment_methods && userData.user_history.payment_methods.length > 0) {
            const defaultPayment = userData.user_history.payment_methods.find(p => p.is_default) || userData.user_history.payment_methods[0];
            const lastFour = defaultPayment.card_number ? `*${defaultPayment.card_number.slice(-4)}` : '';
            document.getElementById('recipientViewCardNumber').textContent = lastFour;
            
            // Store selected payment method
            localStorage.setItem('selectedPaymentId', defaultPayment.id);
            localStorage.setItem('selectedPayment', JSON.stringify(defaultPayment));
        }
        
        // Add continue button event listener
        document.getElementById('recipientContinueButton').addEventListener('click', function() {
            // Get input values
            const name = document.getElementById('recipientNameInput').value;
            const bankName = document.getElementById('recipientBankInput').value;
            const accountNumber = document.getElementById('recipientAccountInput').value;
            
            // Validate form
            let isValid = true;
            
            if (!name) {
                document.getElementById('recipientNameInput').classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('recipientNameInput').classList.remove('is-invalid');
            }
            
            if (!bankName) {
                document.getElementById('recipientBankInput').classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('recipientBankInput').classList.remove('is-invalid');
            }
            
            if (!accountNumber) {
                document.getElementById('recipientAccountInput').classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('recipientAccountInput').classList.remove('is-invalid');
            }
            
            if (!isValid) {
                return;
            }
            
            // If we're using an existing recipient, go back to review details
            const selectedRecipientId = localStorage.getItem('selectedRecipientId');
            const selectedRecipient = localStorage.getItem('selectedRecipient') ? JSON.parse(localStorage.getItem('selectedRecipient')) : null;
            const selectedPaymentId = localStorage.getItem('selectedPaymentId');
            const selectedPayment = localStorage.getItem('selectedPayment') ? JSON.parse(localStorage.getItem('selectedPayment')) : null;
            
            if (selectedRecipientId && selectedPaymentId) {
                showReviewDetailsView(selectedRecipient, selectedPayment, transferData);
            } else {
                // TODO: If new recipient, save it first, then show review
                // For now, just show the review with form data
                const newRecipient = {
                    name: name,
                    bank_name: bankName,
                    bank_account_number: accountNumber,
                    country: transferData.country.toUpperCase()
                };
                
                showReviewDetailsView(newRecipient, selectedPayment, transferData);
            }
        });
        
        // Set up edit payment method link
        document.getElementById('editPaymentMethodLink').addEventListener('click', function(e) {
            e.preventDefault();
            showPaymentMethodView();
        });
        
        // Show view
        showView('recipientSelectionView');
    }
    
    // Function to set up and show payment method view (Image 4)
    function showPaymentMethodView() {
        // Clear input fields
        document.getElementById('paymentCardNumber').value = '';
        document.getElementById('paymentCardExpiry').value = '';
        document.getElementById('paymentCardCvv').value = '';
        document.getElementById('paymentCardName').value = '';
        document.getElementById('paymentCardZip').value = '';
        
        // If we have saved payment methods, show them
        if (userData && userData.user_history && userData.user_history.payment_methods && userData.user_history.payment_methods.length > 0) {
            // Get default or first payment method
            const defaultPayment = userData.user_history.payment_methods.find(p => p.is_default) || userData.user_history.payment_methods[0];
            const lastFour = defaultPayment.card_number ? `*${defaultPayment.card_number.slice(-4)}` : '';
            document.getElementById('savedPaymentCardNumber').textContent = lastFour;
            
            // Store selected payment method
            localStorage.setItem('selectedPaymentId', defaultPayment.id);
            localStorage.setItem('selectedPayment', JSON.stringify(defaultPayment));
            
            // Show saved payment section
            document.getElementById('savedPaymentSection').style.display = 'block';
        } else {
            // Hide saved payment section if no history
            document.getElementById('savedPaymentSection').style.display = 'none';
        }
        
        // Add save button event listener
        document.getElementById('paymentSaveButton').addEventListener('click', function() {
            // Get values from form
            const cardNumber = document.getElementById('paymentCardNumber').value;
            const cardExpiry = document.getElementById('paymentCardExpiry').value;
            const cardCvv = document.getElementById('paymentCardCvv').value;
            const cardName = document.getElementById('paymentCardName').value;
            const cardCountry = document.getElementById('paymentCardCountry').value;
            const cardZip = document.getElementById('paymentCardZip').value;
            
            // If we're using existing card, go back to previous view
            const selectedPaymentId = localStorage.getItem('selectedPaymentId');
            
            if (selectedPaymentId && !cardNumber) {
                // Go back to previous view
                const selectedRecipientId = localStorage.getItem('selectedRecipientId');
                const selectedRecipient = localStorage.getItem('selectedRecipient') ? JSON.parse(localStorage.getItem('selectedRecipient')) : null;
                const selectedPayment = localStorage.getItem('selectedPayment') ? JSON.parse(localStorage.getItem('selectedPayment')) : null;
                
                if (selectedRecipientId) {
                    // Go back to review details
                    showReviewDetailsView(selectedRecipient, selectedPayment, userData.transfer_data);
                } else {
                    // Go back to recipient selection
                    showRecipientSelectionView(userData.transfer_data);
                }
            } else {
                // Validate form if entering new card
                let isValid = true;
                
                if (!cardNumber) {
                    document.getElementById('paymentCardNumber').classList.add('is-invalid');
                    isValid = false;
                } else {
                    document.getElementById('paymentCardNumber').classList.remove('is-invalid');
                }
                
                if (!cardExpiry) {
                    document.getElementById('paymentCardExpiry').classList.add('is-invalid');
                    isValid = false;
                } else {
                    document.getElementById('paymentCardExpiry').classList.remove('is-invalid');
                }
                
                if (!cardCvv) {
                    document.getElementById('paymentCardCvv').classList.add('is-invalid');
                    isValid = false;
                } else {
                    document.getElementById('paymentCardCvv').classList.remove('is-invalid');
                }
                
                if (!cardName) {
                    document.getElementById('paymentCardName').classList.add('is-invalid');
                    isValid = false;
                } else {
                    document.getElementById('paymentCardName').classList.remove('is-invalid');
                }
                
                if (!cardZip) {
                    document.getElementById('paymentCardZip').classList.add('is-invalid');
                    isValid = false;
                } else {
                    document.getElementById('paymentCardZip').classList.remove('is-invalid');
                }
                
                if (!isValid) {
                    return;
                }
                
                // TODO: Save new payment method to backend, then show review
                // For now, just use the new data
                const newPayment = {
                    card_number: cardNumber,
                    card_type: 'Debit card',
                    expiration_date: cardExpiry
                };
                
                // Store new payment data
                localStorage.setItem('newPayment', JSON.stringify(newPayment));
                
                // Go back to previous view
                const selectedRecipientId = localStorage.getItem('selectedRecipientId');
                const selectedRecipient = localStorage.getItem('selectedRecipient') ? JSON.parse(localStorage.getItem('selectedRecipient')) : null;
                
                if (selectedRecipientId) {
                    // Go back to review details
                    showReviewDetailsView(selectedRecipient, newPayment, userData.transfer_data);
                } else {
                    // Go back to recipient selection
                    showRecipientSelectionView(userData.transfer_data);
                }
            }
        });
        
        // Show view
        showView('paymentMethodView');
    }


    

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
                // Set userData - store complete data object
                userData = data;

                // Make sure user_id is set if present in user_history
                if (data.user_history && data.user_history.user_id) {
                    userData.user_id = data.user_history.user_id;
                }

                // Check for user_id directly in data
                if (data.user_id) {
                    userData.user_id = data.user_id;
                }

                console.log("User data set:", userData);

                // Display appropriate view based on user history
                displayAppropriateView(data);
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

    // Function to display either first-time or returning user view
    function displayAppropriateView(data) {
        const transferData = data.transfer_data;
        const details = transferData.details;
        
        // Fill in transaction data (amounts, rates, etc.)
        fillTransactionDetails(transferData, details);
        
        // Hide loading
        loadingContainer.style.display = 'none';
        transferContent.style.display = 'block';
        
        // Check if we have user history
        const hasHistory = data.user_history && 
                          (data.user_history.recipients?.length > 0 || 
                           data.user_history.payment_methods?.length > 0);
                           
        // Show user interface based on history
        if (hasHistory) {
            // Check if we have recipients and payment methods
            const hasRecipients = data.user_history.recipients && data.user_history.recipients.length > 0;
            const hasPaymentMethods = data.user_history.payment_methods && data.user_history.payment_methods.length > 0;
            
            if (hasRecipients && hasPaymentMethods) {
                // Select the first recipient and payment method by default
                const firstRecipient = data.user_history.recipients[0];
                const defaultPayment = data.user_history.payment_methods.find(p => p.is_default) || data.user_history.payment_methods[0];
                
                localStorage.setItem('selectedRecipientId', firstRecipient.id);
                localStorage.setItem('selectedRecipient', JSON.stringify(firstRecipient));
                localStorage.setItem('selectedPaymentId', defaultPayment.id);
                localStorage.setItem('selectedPayment', JSON.stringify(defaultPayment));
                
                // Show review details view for returning user (Image 1)
                showReviewDetailsView(firstRecipient, defaultPayment, transferData);
            } else if (hasRecipients) {
                // Show recipient selection with prefilled recipient but need payment method
                showRecipientSelectionView(transferData);
            } else if (hasPaymentMethods) {
                // Need recipient but have payment method
                showRecipientSelectionView(transferData);
            } else {
                // Shouldn't get here with hasHistory true, but just in case
                showRecipientSelectionView(transferData);
            }
        } else {
            // First time user - start with recipient form (Image 3/5)
            showRecipientSelectionView(transferData);
        }
    }



    // Show security code screen
    function showSecurityCodeScreen() {
        // Reset security code input and error
        const securityCodeInput = document.getElementById('securityCode');
        if (securityCodeInput) {
            securityCodeInput.value = '';
            securityCodeInput.classList.remove('is-invalid');
        }
        
        const securityCodeError = document.getElementById('securityCodeError');
        if (securityCodeError) {
            securityCodeError.style.display = 'none';
        }
        
        // Disable confirm button initially
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
        
        // Show the view
        showView('securityCodeScreen');
    }




    // Initialize security code screen event listeners
    function initSecurityCodeScreen() {
        const securityCodeInput = document.getElementById('securityCode');
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        const securityCodeError = document.getElementById('securityCodeError');

        if (securityCodeInput && confirmBtn) {
            // Enable/disable button based on input
            securityCodeInput.addEventListener('input', function () {
                // Remove error styling if user types again
                securityCodeInput.classList.remove('is-invalid');
                securityCodeError.style.display = 'none';

                // Enable button if input has value
                confirmBtn.disabled = (this.value.trim().length === 0);
            });

            // Toggle password visibility
            const eyeIcon = document.querySelector('#securityCodeScreen .input-group-text');
            if (eyeIcon) {
                eyeIcon.addEventListener('click', function () {
                    securityCodeInput.type = securityCodeInput.type === 'password' ? 'text' : 'password';
                });
            }

            // Handle confirm button click
            confirmBtn.addEventListener('click', function () {
                const code = securityCodeInput.value.trim();

                // For demo purposes, let's consider valid codes are 3-4 digits
                const isValid = /^\d{3,4}$/.test(code);

                if (!isValid) {
                    // Show error styling
                    securityCodeInput.classList.add('is-invalid');
                    securityCodeError.style.display = 'block';
                    return;
                }

                // Show loading state on button
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

                // Proceed with transaction (call the complete transaction function)
                completeTransaction();
            });
        }
    }





    // Function to complete the transaction after security code verification
    function completeTransaction() {
        const isFirstTime = localStorage.getItem('firstTimeTransaction') === 'true';

        let apiUrl, requestData;

        if (isFirstTime) {
            // First-time transaction
            apiUrl = `${API_BASE_URL}/api/first-time-transaction`;
            requestData = JSON.parse(localStorage.getItem('firstTimeFormData'));
        } else {
            // Returning user transaction
            apiUrl = `${API_BASE_URL}/api/complete-transaction`;
            requestData = {
                transaction_id: transactionId,
                recipient_id: localStorage.getItem('selectedRecipientId'),
                payment_method_id: localStorage.getItem('selectedPaymentId')
            };
        }

        // Send to API
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Failed to complete transaction: ${response.status} - ${text}`);
                    });
                }
                return response.json();
            })
            .then(result => {
                if (result.status === 'success') {
                    // Hide all views
                    const transferContent = document.getElementById('transferContent');
                    if (transferContent) {
                        transferContent.style.display = 'none';
                    }

                    const securityCodeScreen = document.getElementById('securityCodeScreen');
                    if (securityCodeScreen) {
                        securityCodeScreen.style.display = 'none';
                    }

                    // Show success message
                    if (successMessage) {
                        successMessage.style.display = 'block';
                    } else {
                        alert('Transaction completed successfully!');
                    }

                    // Clear stored data
                    localStorage.removeItem('selectedRecipientId');
                    localStorage.removeItem('selectedPaymentId');
                    localStorage.removeItem('selectedRecipient');
                    localStorage.removeItem('selectedPayment');
                    localStorage.removeItem('formData');
                    localStorage.removeItem('firstTimeTransaction');
                    localStorage.removeItem('firstTimeFormData');
                } else {
                    throw new Error(result.message || 'Failed to complete transaction');
                }
            })
            .catch(error => {
                console.error('Error processing transaction:', error);

                // Reset button state
                const confirmBtn = document.getElementById('confirmPaymentBtn');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = 'Confirm payment';
                }

                alert(`Error: ${error.message || 'Failed to process transaction'}`);
            });
    }




    // Update number 
    function redirectToWhatsApp() {
        // Get the WhatsApp phone number from environment
        const whatsappPhone = '12292902911'; // Replace with your actual WhatsApp number (no + or spaces)

        // Create WhatsApp deeplink - it will open the WhatsApp chat with your number
        const whatsappLink = `https://wa.me/${whatsappPhone}?text=I%20want%20to%20start%20a%20new%20transfer`;


        // Add event listeners for WhatsApp redirection after transaction completion
        const newTransferBtn = document.querySelector('.btn-new-transfer');
        if (newTransferBtn) {
            newTransferBtn.addEventListener('click', function (e) {
                e.preventDefault();
                redirectToWhatsApp();
            });
        }


        // Redirect to WhatsApp
        window.location.href = whatsappLink;


    }


    // Function to set up the first-time user view
    function setupFirstTimeUserView() {
        // Show the existing first-time view if it exists
        const firstTimeView = document.getElementById('firstTimeView');
        if (firstTimeView) {
            firstTimeView.style.display = 'block';

            // Hide returning user view if it exists
            const returningView = document.getElementById('returningUserView');
            if (returningView) {
                returningView.style.display = 'none';
            }

            successMessage.style.display = 'block';

            // Add these lines right after it:
            // Set up WhatsApp redirect for "Send another transfer" button
            const newTransferBtn = document.querySelector('.btn-new-transfer');
            if (newTransferBtn) {
                newTransferBtn.addEventListener('click', redirectToWhatsApp);
            }

        } else {
            // If there's no first-time view in the HTML, log an error
            console.error("First-time user view element not found in the DOM");
            showError("Error loading the form. Please try again.");
        }
    }

    // Function to set up the returning user view with history
    // Updated recipient rendering with View/Delete option
    function setupReturningUserView(userHistory, transferData) {
        // Create/update the returning user container if it doesn't exist
        let returningView = document.getElementById('returningUserView');
        if (!returningView) {
            returningView = document.createElement('div');
            returningView.id = 'returningUserView';
            transferContent.appendChild(returningView);
        }

        // Create HTML for recipients
        let recipientsHTML = '<div class="section-header"><h3>Recipient</h3></div>';

        // Add previous recipients if any
        if (userHistory.recipients && userHistory.recipients.length > 0) {
            userHistory.recipients.forEach(recipient => {
                const lastFour = recipient.bank_account_number
                    ? `*${recipient.bank_account_number.slice(-4)}`
                    : '';

                recipientsHTML += `
                    <div class="recipient-option" data-id="${recipient.id}">
                        <div class="avatar">${recipient.name.charAt(0)}</div>
                        <div class="recipient-details">
                            <div class="recipient-name">${recipient.name}</div>
                            <div class="recipient-country">${lastFour}</div>
                        </div>
                        <div class="view-button" data-id="${recipient.id}" title="View details">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zm-8 3.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/>
                            </svg>
                        </div>
                    </div>
                `;
            });
        }

        // Add button to add new recipient
        recipientsHTML += `
            <div class="add-new-btn" id="addRecipientBtn">
                <span class="plus-icon">+</span> Add new recipient
            </div>
        `;

        // Create HTML for payment methods
        let paymentHTML = '<div class="section-header"><h3>Payment method</h3></div>';

        // Add previous payment methods if any
        if (userHistory.payment_methods && userHistory.payment_methods.length > 0) {
            userHistory.payment_methods.forEach(payment => {
                const lastFour = payment.card_number
                    ? `*${payment.card_number.slice(-4)}`
                    : '';

                const isDefault = payment.is_default
                    ? '<span class="default-badge">Default</span>'
                    : '';

                paymentHTML += `
                    <div class="payment-option" data-id="${payment.id}">
                        <div class="card-icon card-generic">💳</div>
                        <div class="payment-details">
                            <div class="card-type">${payment.card_type}</div>
                            <div class="card-number">${lastFour}</div>
                        </div>
                        ${isDefault}
                        <div class="view-button" data-id="${payment.id}" title="View details">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zm-8 3.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/>
                            </svg>
                        </div>
                    </div>
                `;
            });
        }

        // Add button to add new payment method
        paymentHTML += `
            <div class="add-new-btn" id="addPaymentBtn">
                <span class="plus-icon">+</span> Add new payment method
            </div>
        `;

        // Add transfer details summary
        const transferDetailsHTML = `
            <div class="section-header"><h3>Transfer</h3></div>
            <div class="amount-section">
                <div class="amount-left">
                    <label>You send</label>
                    <div class="amount send-amount">${formatCurrency(transferData.details.amount_from)}</div>
                </div>
                <div class="amount-right">
                    <span class="send-currency">${transferData.details.currency_from}</span>
                </div>
            </div>
            
            <div class="exchange-rate">
                <div class="rate-icon">↔</div>
                <span class="exchange-rate-value">1 ${transferData.details.currency_from} = ${transferData.details.exchange_rate} ${transferData.details.currency_to}</span>
            </div>
            
            <div class="amount-section">
                <div class="amount-left">
                    <label>Recipient receives</label>
                    <div class="amount receive-amount">${formatCurrency(transferData.details.amount_to)}</div>
                </div>
                <div class="amount-right">
                    <span class="receive-currency">${transferData.details.currency_to}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <label>Delivery method</label>
                <div class="select-field">
                    <span class="delivery-method">${transferData.delivery_method === 'bank_deposit' ? 'Bank deposit' : 'Cash pickup'}</span>
                    <span class="chevron-down">▼</span>
                </div>
            </div>
            
            <div class="fee-section">
                <div class="fee-line">
                    <span>Transfer fees</span>
                    <span class="transfer-fee">${formatCurrency(transferData.details.transfer_fee)} ${transferData.details.currency_from}</span>
                </div>
                <div class="total-line">
                    <span>Total</span>
                    <span class="total-amount">${formatCurrency(transferData.details.total_amount)} ${transferData.details.currency_from}</span>
                </div>
            </div>
            
            <div class="action-section">
                <button type="button" id="continueSendButton" class="continue-btn">Send money</button>
            </div>
        `;

        // Combine all HTML
        returningView.innerHTML = recipientsHTML + paymentHTML + transferDetailsHTML;
        returningView.style.display = 'block';

        // Hide the first-time view if it exists
        const firstTimeView = document.getElementById('firstTimeView');
        if (firstTimeView) {
            firstTimeView.style.display = 'none';
        }

        // Add the view details view container if it doesn't exist
        if (!document.getElementById('viewDetailsContainer')) {
            const viewDetailsContainer = document.createElement('div');
            viewDetailsContainer.id = 'viewDetailsContainer';
            viewDetailsContainer.style.display = 'none';
            transferContent.appendChild(viewDetailsContainer);
        }

        // Set up event listeners
        setupReturningUserEventListeners(userHistory);
    }


    // Add this function to manually add a new recipient to the UI
    function addRecipientToUI(recipient) {
        const recipientsContainer = document.querySelector('.section-header:contains("Recipient")').parentElement;

        // Get the add new button element (to insert before it)
        const addNewBtn = document.getElementById('addRecipientBtn');

        // Create the new recipient element
        const newRecipientElement = document.createElement('div');
        newRecipientElement.className = 'recipient-option';
        newRecipientElement.setAttribute('data-id', recipient.id);

        // Format account number for display
        const lastFour = recipient.bank_account_number
            ? `*${recipient.bank_account_number.slice(-4)}`
            : '';

        // Set inner HTML
        newRecipientElement.innerHTML = `
            <div class="avatar">${recipient.name.charAt(0)}</div>
            <div class="recipient-details">
                <div class="recipient-name">${recipient.name}</div>
                <div class="recipient-country">${lastFour}</div>
            </div>
        `;

        // Add click event listener
        newRecipientElement.addEventListener('click', function () {
            // Remove selected class from all options
            document.querySelectorAll('.recipient-option').forEach(opt =>
                opt.classList.remove('selected'));

            // Add selected class to this option
            this.classList.add('selected');

            // Store selected recipient ID
            localStorage.setItem('selectedRecipientId', recipient.id);
            localStorage.setItem('selectedRecipient', JSON.stringify(recipient));
        });

        // Insert the new recipient before the add new button
        recipientsContainer.insertBefore(newRecipientElement, addNewBtn);

        // Select this new recipient
        newRecipientElement.click();
    }




    // Function to show recipient details with delete option
    function showRecipientDetails(recipientId, userHistory) {
        // Find the recipient
        const recipient = userHistory.recipients.find(r => r.id === recipientId);
        if (!recipient) {
            console.error(`Recipient not found with ID: ${recipientId}`);
            return;
        }

        // Hide the returning user view
        const returningView = document.getElementById('returningUserView');
        if (returningView) {
            returningView.style.display = 'none';
        }

        // Get or create view details container
        let viewDetailsContainer = document.getElementById('viewDetailsContainer');
        if (!viewDetailsContainer) {
            viewDetailsContainer = document.createElement('div');
            viewDetailsContainer.id = 'viewDetailsContainer';
            transferContent.appendChild(viewDetailsContainer);
        }

        // Generate HTML for recipient details
        viewDetailsContainer.innerHTML = `
            <div class="section-header">
                <h3>Recipient Details</h3>
            </div>
            
            <div class="recipient-detail-item">
                <div class="detail-label">Full name</div>
                <div class="detail-value">${recipient.name}</div>
            </div>
            
            <div class="recipient-detail-item">
                <div class="detail-label">Country</div>
                <div class="detail-value">${recipient.country || '-'}</div>
            </div>
            
            <div class="recipient-detail-item">
                <div class="detail-label">Bank name</div>
                <div class="detail-value">${recipient.bank_name || '-'}</div>
            </div>
            
            <div class="recipient-detail-item">
                <div class="detail-label">Account number</div>
                <div class="detail-value">${recipient.bank_account_number || '-'}</div>
            </div>
            
            <div class="form-buttons">
                <button type="button" id="cancelViewRecipient" class="btn btn-outline-secondary">Back</button>
                <button type="button" id="deleteRecipient" class="btn btn-danger">Delete</button>
            </div>
        `;

        // Show the details container
        viewDetailsContainer.style.display = 'block';

        // Add event listeners for buttons
        document.getElementById('cancelViewRecipient').addEventListener('click', function () {
            viewDetailsContainer.style.display = 'none';
            returningView.style.display = 'block';
        });

        document.getElementById('deleteRecipient').addEventListener('click', function () {
            if (confirm(`Are you sure you want to delete recipient ${recipient.name}?`)) {
                deleteRecipient(recipientId);
            }
        });
    }

    // Function to show payment method details with delete option
    function showPaymentDetails(paymentId, userHistory) {
        // Find the payment method
        const payment = userHistory.payment_methods.find(p => p.id === paymentId);
        if (!payment) {
            console.error(`Payment method not found with ID: ${paymentId}`);
            return;
        }

        // Hide the returning user view
        const returningView = document.getElementById('returningUserView');
        if (returningView) {
            returningView.style.display = 'none';
        }

        // Get or create view details container
        let viewDetailsContainer = document.getElementById('viewDetailsContainer');
        if (!viewDetailsContainer) {
            viewDetailsContainer = document.createElement('div');
            viewDetailsContainer.id = 'viewDetailsContainer';
            transferContent.appendChild(viewDetailsContainer);
        }

        // Mask all but last 4 digits of card number
        const maskedCard = payment.card_number
            ? `**** **** **** ${payment.card_number.slice(-4)}`
            : 'Unknown card';

        // Generate HTML for payment details
        viewDetailsContainer.innerHTML = `
            <div class="section-header">
                <h3>Payment Method Details</h3>
            </div>
            
            <div class="payment-detail-item">
                <div class="detail-label">Card type</div>
                <div class="detail-value">${payment.card_type || 'Debit card'}</div>
            </div>
            
            <div class="payment-detail-item">
                <div class="detail-label">Card number</div>
                <div class="detail-value">${maskedCard}</div>
            </div>
            
            <div class="payment-detail-item">
                <div class="detail-label">Expiration date</div>
                <div class="detail-value">${payment.expiration_date || '-'}</div>
            </div>
            
            <div class="payment-detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value">${payment.is_default ? 'Default payment method' : 'Alternative payment method'}</div>
            </div>
            
            <div class="form-buttons">
                <button type="button" id="cancelViewPayment" class="btn btn-outline-secondary">Back</button>
                <button type="button" id="deletePayment" class="btn btn-danger">Delete</button>
            </div>
        `;

        // Show the details container
        viewDetailsContainer.style.display = 'block';

        // Add event listeners for buttons
        document.getElementById('cancelViewPayment').addEventListener('click', function () {
            viewDetailsContainer.style.display = 'none';
            returningView.style.display = 'block';
        });

        document.getElementById('deletePayment').addEventListener('click', function () {
            if (confirm(`Are you sure you want to delete payment method ending in ${payment.card_number.slice(-4)}?`)) {
                deletePaymentMethod(paymentId);
            }
        });
    }

    // Function to delete a recipient
    async function deleteRecipient(recipientId) {
        try {
            // Show loading indicator
            const deleteButton = document.getElementById('deleteRecipient');
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

            // Log for debugging
            console.log(`Attempting to delete recipient: ${recipientId}`);

            // Make API call to delete recipient
            const response = await fetch(`${API_BASE_URL}/api/recipient/${recipientId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Log response for debugging
            console.log('Delete response status:', response.status);

            // Try to parse response as JSON
            let result;
            try {
                const responseText = await response.text();
                console.log('Delete response text:', responseText);
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Failed to parse server response');
            }

            if (result && result.status === 'success') {
                alert('Recipient deleted successfully.');

                // Remove recipient from the UI
                // The simplest way is to reload the page
                location.reload();
            } else {
                const errorMessage = result?.message || 'Unknown error';
                throw new Error(`Failed to delete recipient: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error deleting recipient:', error);
            alert(`Error: ${error.message || 'Failed to delete recipient'}`);

            // Reset button state
            const deleteButton = document.getElementById('deleteRecipient');
            if (deleteButton) {
                deleteButton.disabled = false;
                deleteButton.textContent = 'Delete';
            }

            // Return to the recipient list view
            const viewDetailsContainer = document.getElementById('viewDetailsContainer');
            const returningView = document.getElementById('returningUserView');

            if (viewDetailsContainer) viewDetailsContainer.style.display = 'none';
            if (returningView) returningView.style.display = 'block';
        }
    }

    // Function to delete a payment method
    async function deletePaymentMethod(paymentId) {
        try {
            // Show loading indicator
            const deleteButton = document.getElementById('deletePayment');
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

            // Log for debugging
            console.log(`Attempting to delete payment method: ${paymentId}`);

            // Make API call to delete payment method
            const response = await fetch(`${API_BASE_URL}/api/payment-method/${paymentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Log response for debugging
            console.log('Delete response status:', response.status);

            // Try to parse response as JSON
            let result;
            try {
                const responseText = await response.text();
                console.log('Delete response text:', responseText);
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Failed to parse server response');
            }

            if (result && result.status === 'success') {
                alert('Payment method deleted successfully.');

                // Remove payment method from the UI
                // The simplest way is to reload the page
                location.reload();
            } else {
                const errorMessage = result?.message || 'Unknown error';
                throw new Error(`Failed to delete payment method: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error deleting payment method:', error);
            alert(`Error: ${error.message || 'Failed to delete payment method'}`);

            // Reset button state
            const deleteButton = document.getElementById('deletePayment');
            if (deleteButton) {
                deleteButton.disabled = false;
                deleteButton.textContent = 'Delete';
            }

            // Return to the payment list view
            const viewDetailsContainer = document.getElementById('viewDetailsContainer');
            const returningView = document.getElementById('returningUserView');

            if (viewDetailsContainer) viewDetailsContainer.style.display = 'none';
            if (returningView) returningView.style.display = 'block';
        }
    }

















    // Function to set up event listeners for returning user view
    function setupReturningUserEventListeners(userHistory) {
        // Add event listeners for recipient selection
        const recipientOptions = document.querySelectorAll('.recipient-option');
        recipientOptions.forEach(option => {
            option.addEventListener('click', function (e) {
                // Don't trigger if clicking on the view button
                if (e.target.closest('.view-button') || e.target.closest('svg') || e.target.closest('path')) {
                    return;
                }

                // Remove selected class from all options
                recipientOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                this.classList.add('selected');

                // Store selected recipient ID
                const recipientId = this.dataset.id;
                localStorage.setItem('selectedRecipientId', recipientId);

                // Find recipient data
                const selectedRecipient = userHistory.recipients.find(r => r.id === recipientId);
                if (selectedRecipient) {
                    localStorage.setItem('selectedRecipient', JSON.stringify(selectedRecipient));
                }
            });
        });

        // Add event listeners for payment method selection
        const paymentOptions = document.querySelectorAll('.payment-option');
        paymentOptions.forEach(option => {
            option.addEventListener('click', function (e) {
                // Don't trigger if clicking on the view button
                if (e.target.closest('.view-button') || e.target.closest('svg') || e.target.closest('path')) {
                    return;
                }

                // Remove selected class from all options
                paymentOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                this.classList.add('selected');

                // Store selected payment method ID
                const paymentId = this.dataset.id;
                localStorage.setItem('selectedPaymentId', paymentId);

                // Find payment method data
                const selectedPayment = userHistory.payment_methods.find(p => p.id === paymentId);
                if (selectedPayment) {
                    localStorage.setItem('selectedPayment', JSON.stringify(selectedPayment));
                }
            });
        });

        // Select the first option in each category by default
        if (recipientOptions.length > 0) {
            recipientOptions[0].click();
        }

        if (paymentOptions.length > 0) {
            paymentOptions[0].click();
        }

        // Add event listener for "Add new recipient" button
        const addRecipientBtn = document.getElementById('addRecipientBtn');
        if (addRecipientBtn) {
            addRecipientBtn.addEventListener('click', showAddRecipientForm);
        }

        // Add event listener for "Add new payment method" button
        const addPaymentBtn = document.getElementById('addPaymentBtn');
        if (addPaymentBtn) {
            addPaymentBtn.addEventListener('click', showAddPaymentForm);
        }

        // Add event listener for "Send money" button
        const sendMoneyBtn = document.getElementById('continueSendButton');
        if (sendMoneyBtn) {
            sendMoneyBtn.addEventListener('click', processSendMoney);
        }

        // Add event listeners for recipient view buttons
        const recipientViewButtons = document.querySelectorAll('.recipient-option .view-button');
        recipientViewButtons.forEach(button => {
            button.addEventListener('click', function (e) {
                e.stopPropagation(); // Prevent triggering the parent click event
                const recipientId = this.dataset.id;
                showRecipientDetails(recipientId, userHistory);
            });
        });


        // Add event listeners for payment method view buttons
        const paymentViewButtons = document.querySelectorAll('.payment-option .view-button');
        paymentViewButtons.forEach(button => {
            button.addEventListener('click', function (e) {
                e.stopPropagation(); // Prevent triggering the parent click event
                const paymentId = this.dataset.id;
                showPaymentDetails(paymentId, userHistory);
            });
        });
    }







    // Function to show the add recipient form
    function showAddRecipientForm() {
        // Hide returning user view
        const returningView = document.getElementById('returningUserView');
        if (returningView) {
            returningView.style.display = 'none';
        }

        // Show add recipient form
        let addRecipientForm = document.getElementById('addRecipientForm');

        if (!addRecipientForm) {
            // Create form if it doesn't exist
            addRecipientForm = document.createElement('div');
            addRecipientForm.id = 'addRecipientForm';
            addRecipientForm.innerHTML = `
                <div class="section-header">
                    <h3>Add new recipient</h3>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Full name (as appears on government ID)</label>
                    <input type="text" class="form-control" id="newRecipientName" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Bank name or code</label>
                    <div class="input-group">
                        <input type="text" class="form-control" id="newBankName" required>
                        <span class="input-group-text">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                            </svg>
                        </span>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Bank account number</label>
                    <input type="text" class="form-control" id="newAccountNumber" required>
                </div>
                
                <div class="form-buttons">
                    <button type="button" id="cancelAddRecipient" class="btn btn-outline-secondary">Cancel</button>
                    <button type="button" id="saveNewRecipient" class="btn btn-primary">Save</button>
                </div>
            `;

            transferContent.appendChild(addRecipientForm);

            // Add event listeners for buttons
            document.getElementById('cancelAddRecipient').addEventListener('click', function () {
                // Hide form and show returning user view
                addRecipientForm.style.display = 'none';
                if (returningView) {
                    returningView.style.display = 'block';
                }
            });

            document.getElementById('saveNewRecipient').addEventListener('click', saveNewRecipient);
        } else {
            // If form exists, just show it
            addRecipientForm.style.display = 'block';
        }
    }

    // Function to save new recipient
    async function saveNewRecipient() {
        const recipientName = document.getElementById('newRecipientName').value;
        const bankName = document.getElementById('newBankName').value;
        const accountNumber = document.getElementById('newAccountNumber').value;

        if (!recipientName || !bankName || !accountNumber) {
            alert('Please fill in all required fields');
            return;
        }

        const saveButton = document.getElementById('saveNewRecipient');
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

        try {
            // Get transfer data and user data
            const transferData = userData.transfer_data;

            // Ensure we have a user_id
            if (!userData.user_id) {
                console.error('No user_id found in userData!', userData);
                throw new Error('Missing user ID. Please try again.');
            }

            console.log('Using user_id:', userData.user_id);

            // Create request data
            const requestData = {
                user_id: userData.user_id,
                full_name: recipientName,
                country: transferData.country.toUpperCase(),
                bank_name: bankName,
                bank_account_number: accountNumber
            };

            console.log('Sending recipient data:', requestData);

            // Send to API
            const response = await fetch(`${API_BASE_URL}/api/recipient`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();
            console.log('Recipient save result:', result);

            if (result.status === 'success') {
                // Create the recipient object from API response
                const newRecipient = result.recipient;

                // Make sure it has all needed properties
                if (!newRecipient.bank_account_number) {
                    newRecipient.bank_account_number = accountNumber;
                }
                if (!newRecipient.bank_name) {
                    newRecipient.bank_name = bankName;
                }

                // Hide add recipient form
                document.getElementById('addRecipientForm').style.display = 'none';

                // Show the returning user view
                const returningView = document.getElementById('returningUserView');
                if (returningView) {
                    returningView.style.display = 'block';
                }

                // Two options:
                // 1. Simpler but less smooth: Reload the page to refresh data
                // location.reload();

                // 2. More complex but smoother: Update UI without refresh
                // Add the new recipient to UI if the container exists
                try {
                    console.log("Attempting to update UI with new recipient:", newRecipient);

                    // Add to userData for future reference
                    if (!userData.user_history) {
                        userData.user_history = { recipients: [], payment_methods: [] };
                    }

                    if (!userData.user_history.recipients) {
                        userData.user_history.recipients = [];
                    }

                    // Add to the list (at the beginning)
                    userData.user_history.recipients.unshift(newRecipient);

                    // Refresh the UI
                    const recipientsContainer = document.querySelector('.section-header h3').parentElement;
                    if (recipientsContainer) {
                        // Regenerate the recipients HTML
                        setupReturningUserView(userData.user_history, userData.transfer_data);

                        // Select the first recipient (should be the new one)
                        const firstRecipient = document.querySelector('.recipient-option');
                        if (firstRecipient) {
                            firstRecipient.click();
                        }
                    } else {
                        console.warn("Recipients container not found, cannot update UI");
                        // Fall back to reload
                        location.reload();
                    }
                } catch (uiError) {
                    console.error("Error updating UI, falling back to reload:", uiError);
                    location.reload();
                }
            } else {
                throw new Error(result.message || 'Failed to save recipient');
            }
        } catch (error) {
            console.error('Error saving recipient:', error);
            alert(`Error: ${error.message || 'Failed to save recipient'}`);
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Save';
        }
    }





    // Function to show the add payment method form
    function showAddPaymentForm() {
        // Hide returning user view
        const returningView = document.getElementById('returningUserView');
        if (returningView) {
            returningView.style.display = 'none';
        }

        // Show add payment form
        let addPaymentForm = document.getElementById('addPaymentForm');

        if (!addPaymentForm) {
            // Create form if it doesn't exist
            addPaymentForm = document.createElement('div');
            addPaymentForm.id = 'addPaymentForm';
            addPaymentForm.innerHTML = `
                <div class="section-header">
                    <h3>Add new payment method</h3>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Card information</label>
                    <input type="text" class="form-control" id="newCardNumber" placeholder="1234 1234 1234 1234" required>
                </div>
                
                <div class="row mb-3">
                    <div class="col">
                        <input type="text" class="form-control" id="newCardExpiry" placeholder="MM/YY" required>
                    </div>
                    <div class="col">
                        <input type="text" class="form-control" id="newCardCvv" placeholder="CVC" required>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Your full name (as appears on government ID)</label>
                    <input type="text" class="form-control" id="newCardName" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Country or region</label>
                    <input type="text" class="form-control" id="newCardCountry" value="United States" required>
                </div>
                
                <div class="mb-3">
                    <input type="text" class="form-control" id="newCardZip" placeholder="ZIP" required>
                </div>
                
                <div class="form-buttons">
                    <button type="button" id="cancelAddPayment" class="btn btn-outline-secondary">Cancel</button>
                    <button type="button" id="saveNewPayment" class="btn btn-primary">Save</button>
                </div>
            `;

            transferContent.appendChild(addPaymentForm);

            // Add event listeners for buttons
            document.getElementById('cancelAddPayment').addEventListener('click', function () {
                // Hide form and show returning user view
                addPaymentForm.style.display = 'none';
                if (returningView) {
                    returningView.style.display = 'block';
                }
            });

            document.getElementById('saveNewPayment').addEventListener('click', saveNewPayment);
        } else {
            // If form exists, just show it
            addPaymentForm.style.display = 'block';
        }
    }

    // Function to save new payment method
    async function saveNewPayment() {
        const cardNumber = document.getElementById('newCardNumber').value;
        const cardExpiry = document.getElementById('newCardExpiry').value;
        const cardCvv = document.getElementById('newCardCvv').value;
        const cardName = document.getElementById('newCardName').value;
        const cardCountry = document.getElementById('newCardCountry').value;
        const cardZip = document.getElementById('newCardZip').value;

        if (!cardNumber || !cardExpiry || !cardCvv || !cardName || !cardCountry || !cardZip) {
            alert('Please fill in all required fields');
            return;
        }

        const saveButton = document.getElementById('saveNewPayment');
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

        try {
            // Ensure we have a user_id - CRITICAL FIX
            if (!userData.user_id) {
                console.error('No user_id found in userData!', userData);
                throw new Error('Missing user ID. Please try again.');
            }

            console.log('Using user_id:', userData.user_id);

            // Create request data
            const requestData = {
                user_id: userData.user_id,
                card_number: cardNumber,
                card_type: 'Debit card',
                expiration_date: cardExpiry,
                cvv: cardCvv,
                billing_name: cardName,
                country: cardCountry,
                zip_code: cardZip,
                is_default: true
            };

            console.log('Sending payment method data:', requestData);

            // Send to API
            const response = await fetch(`${API_BASE_URL}/api/payment-method`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();
            console.log('Payment method save result:', result);

            if (result.status === 'success') {
                // Store newly created payment method
                localStorage.setItem('selectedPaymentId', result.payment_method.id);
                localStorage.setItem('selectedPayment', JSON.stringify(result.payment_method));

                // Hide form
                document.getElementById('addPaymentForm').style.display = 'none';

                // Show returning view
                const returningView = document.getElementById('returningUserView');
                if (returningView) {
                    returningView.style.display = 'block';
                }

                // Refresh the page to show the updated payment method list
                location.reload();
            } else {
                throw new Error(result.message || 'Failed to save payment method');
            }
        } catch (error) {
            console.error('Error saving payment method:', error);
            alert(`Error: ${error.message || 'Failed to save payment method'}`);
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Save';
        }
    }

    // Function to process the send money action for returning users
    function processSendMoney() {
        const sendButton = document.getElementById('continueSendButton');
        
        try {
            // Get selected recipient and payment method
            const recipientId = localStorage.getItem('selectedRecipientId');
            const paymentId = localStorage.getItem('selectedPaymentId');
            
            if (!recipientId || !paymentId) {
                throw new Error('Please select a recipient and payment method');
            }
            
            // Show button loading state
            if (sendButton) {
                sendButton.disabled = true;
                sendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            }
            
            // Get selected recipient and payment data
            const selectedRecipient = localStorage.getItem('selectedRecipient') ? 
                JSON.parse(localStorage.getItem('selectedRecipient')) : null;
                
            const selectedPayment = localStorage.getItem('selectedPayment') ? 
                JSON.parse(localStorage.getItem('selectedPayment')) : null;
                
            if (selectedRecipient && selectedPayment) {
                // Show review details page first (Image 1)
                showReviewDetailsView(selectedRecipient, selectedPayment, userData.transfer_data);
            } else {
                // Something is wrong, show error
                throw new Error('Recipient or payment data is missing');
            }
            
        } catch (error) {
            console.error('Error preparing transaction:', error);
            alert(`Error: ${error.message || 'Failed to prepare transaction'}`);
            
            // Reset button state
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.innerHTML = 'Send money';
            }
        }
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
        firstTimeForm.addEventListener('submit', async function (e) {
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
        // Remove all existing event listeners
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
        
        // Add new event listener
        newConfirmButton.addEventListener('click', function() {
            // Disable button and show loading
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            try {
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
                
                // Store data for later use
                localStorage.setItem('firstTimeTransaction', 'true');
                localStorage.setItem('firstTimeFormData', JSON.stringify(payload));
                
                // Show security code screen
                showSecurityCodeScreen();
                
            } catch (error) {
                console.error('Error preparing transaction:', error);
                alert(`Error: ${error.message || 'There was an error processing your transaction. Please try again.'}`);
                
                // Reset button state
                this.disabled = false;
                this.innerHTML = 'Confirm and send';
            }
        });
    }

    // Set up edit button
    const editButton = document.getElementById('editButton');
    if (editButton) {
        editButton.addEventListener('click', function () {
            // Hide review screen
            reviewView.style.display = 'none';

            // Show first time view again
            firstTimeView.style.display = 'block';
        });
    }

    // Initialize by fetching transaction data
    fetchTransactionData();


    // Initialize security code screen
    initSecurityCodeScreen();

    // For first-time users, we'll also need to modify the confirmButton click handler to use the same flow
    // Find this line in your existing code:
    if (confirmButton) {
        confirmButton.addEventListener('click', async function() {
            // The rest of your existing code...
            
            // When you reach the API call section, replace it with this:
            try {
                // If it's their first transaction, we should also show the security code screen
                // before completing the transaction
                showSecurityCodeScreen();
                
                // The confirmPaymentBtn will now handle the API call
                // through the completeTransaction() function
                
                // Note: For first time transactions, we'll need to store the form data temporarily
                // so it can be accessed by completeTransaction()
                localStorage.setItem('firstTimeTransaction', 'true');
                localStorage.setItem('firstTimeFormData', JSON.stringify(payload));
                
                // The original API call is now handled by the completeTransaction function
                // which is called after security code verification
            } catch (error) {
                console.error('Error preparing transaction:', error);
                alert(`Error: ${error.message || 'There was an error processing your transaction. Please try again.'}`);
                
                // Reset button state
                this.disabled = false;
                this.innerHTML = 'Confirm and send';
            }
        });
    }

});
