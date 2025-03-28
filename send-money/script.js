
document.addEventListener('DOMContentLoaded', function() {
    console.log("Money transfer application initialized");
    
    // API base URL
    const API_BASE_URL = 'https://1e0099dda573.ngrok.app';
    
    // Get transaction ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('id');
    console.log("Transaction ID:", transactionId);
    
    // DOM elements
    const elements = {
        loadingContainer: document.getElementById('loadingContainer'),
        errorContainer: document.getElementById('errorContainer'),
        transferContent: document.getElementById('transferContent'),
        newUserView: document.getElementById('newUserView'),
        newUserForm: document.getElementById('newUserForm'),
        recipientSelectionView: document.getElementById('recipientSelectionView'),
        paymentMethodView: document.getElementById('paymentMethodView'),
        reviewDetailsView: document.getElementById('reviewDetailsView'),
        securityCodeScreen: document.getElementById('securityCodeScreen'),
        successMessage: document.getElementById('successMessage')
    };
    
    // Store user data
    let userData = null;
    
    /**
     * Main Initialization
     */
    function init() {
        // First, verify and get transaction data
        fetchTransactionData();
        
        // Set up event listeners for action buttons
        setupEventListeners();
    }
    
    /**
     * Sets up event listeners for all interactive elements
     */
    function setupEventListeners() {
        // New User Form submission
        if (elements.newUserForm) {
            elements.newUserForm.addEventListener('submit', handleNewUserFormSubmit);
        }
        
        // Navigate back to WhatsApp after success
        const newTransferBtn = document.querySelector('.btn-new-transfer');
        if (newTransferBtn) {
            newTransferBtn.addEventListener('click', redirectToWhatsApp);
        }
        
        // Payment Method Edit Link
        const editPaymentMethodLink = document.getElementById('editPaymentMethodLink');
        if (editPaymentMethodLink) {
            editPaymentMethodLink.addEventListener('click', function(e) {
                e.preventDefault();
                showView('paymentMethodView');
            });
        }
        
        // Save Payment Button
        const paymentSaveButton = document.getElementById('paymentSaveButton');
        if (paymentSaveButton) {
            paymentSaveButton.addEventListener('click', savePaymentMethod);
        }
        
        // View Saved Payment Button
        const viewSavedPaymentBtn = document.getElementById('viewSavedPaymentBtn');
        if (viewSavedPaymentBtn) {
            viewSavedPaymentBtn.addEventListener('click', function(e) {
                e.preventDefault();
                selectSavedPaymentMethod();
            });
        }
        
        // Edit Recipient and Payment links in Review Details
        const editRecipientLink = document.getElementById('editRecipientLink');
        if (editRecipientLink) {
            editRecipientLink.addEventListener('click', function(e) {
                e.preventDefault();
                showView('recipientSelectionView');
            });
        }
        
        const editPaymentLink = document.getElementById('editPaymentLink');
        if (editPaymentLink) {
            editPaymentLink.addEventListener('click', function(e) {
                e.preventDefault();
                showView('paymentMethodView');
            });
        }
        
        // Send Money Button in Review Details
        const sendMoneyButton = document.getElementById('sendMoneyButton');
        if (sendMoneyButton) {
            sendMoneyButton.addEventListener('click', handleSendMoneyClick);
        }
        
        // Recipient Continue Button
        const recipientContinueButton = document.getElementById('recipientContinueButton');
        if (recipientContinueButton) {
            recipientContinueButton.addEventListener('click', handleRecipientContinue);
        }
        
        // Security Code Screen
        const securityCodeInput = document.getElementById('securityCode');
        if (securityCodeInput) {
            securityCodeInput.addEventListener('input', handleSecurityCodeInput);
        }
        
        const toggleSecurityCode = document.getElementById('toggleSecurityCode');
        if (toggleSecurityCode) {
            toggleSecurityCode.addEventListener('click', toggleSecurityCodeVisibility);
        }
        
        const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
        if (confirmPaymentBtn) {
            confirmPaymentBtn.addEventListener('click', verifySecurityCode);
        }
    }
    
    /**
     * Shows a specific view and hides others
     * @param {string} viewId - ID of the view to show
     */
    function showView(viewId) {
        console.log("Showing view:", viewId);
        
        // All possible views
        const views = [
            'loadingContainer',
            'errorContainer',
            'newUserView',
            'recipientSelectionView',
            'paymentMethodView',
            'reviewDetailsView',
            'securityCodeScreen',
            'successMessage'
        ];
        
        // Hide all views
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
            
            // Make sure transferContent is visible when showing any view except loading and error
            if (viewId !== 'loadingContainer' && viewId !== 'errorContainer') {
                elements.transferContent.style.display = 'block';
            }
        } else {
            console.error("View not found:", viewId);
        }
    }
    
    /**
     * Fetches transaction data from the API
     */
    async function fetchTransactionData() {
        if (!transactionId) {
            showError("Missing transaction ID. Please go back to WhatsApp and try again.");
            return;
        }
        
        try {
            showView('loadingContainer');
            
            const requestUrl = `${API_BASE_URL}/api/transaction/${transactionId}`;
            console.log("Fetching transaction data from:", requestUrl);
            
            // Set up timeout to prevent indefinite loading
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                credentials: 'omit',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log("Transaction data:", data);
            
            if (data.status !== 'success' || !data.transfer_data || !data.transfer_data.details) {
                throw new Error("Invalid data format received from API");
            }
            
            // Store the user data
            userData = data;
            
            // Make sure user_id is set
            if (data.user_history && data.user_history.user_id) {
                userData.user_id = data.user_history.user_id;
            }
            
            // Determine the appropriate view based on user history and transfer data
            determineInitialView(data);
            
        } catch (error) {
            console.error("Error fetching transaction data:", error);
            showError(error.message || "Failed to load transaction data");
        }
    }
    
    /**
     * Determines which view to show based on user history and transfer data
     * @param {Object} data - Transaction data from the API
     */
    function determineInitialView(data) {
        const transferData = data.transfer_data;
        const userHistory = data.user_history || {};
        const hasHistory = userHistory.recipients && userHistory.recipients.length > 0;
        const hasPaymentMethods = userHistory.payment_methods && userHistory.payment_methods.length > 0;
        const preferredRecipientId = transferData.preferred_recipient_id;
        
        // Fill common transaction details (for all views)
        fillTransactionDetails(transferData);
        
        // Case 1: User pre-selected a recipient in WhatsApp
        if (preferredRecipientId) {
            const selectedRecipient = hasHistory ? 
                userHistory.recipients.find(r => r.id === preferredRecipientId) : null;
                
            if (selectedRecipient) {
                // Case 1A: Pre-selected recipient exists in history
                const defaultPayment = hasPaymentMethods ? 
                    (userHistory.payment_methods.find(p => p.is_default) || userHistory.payment_methods[0]) : null;
                
                // Store selected data
                storeSelectedData(selectedRecipient, defaultPayment);
                
                // Show review details view
                showReviewDetailsView(selectedRecipient, defaultPayment, transferData);
            } else {
                // Case 1B: Pre-selected recipient not found - show recipient selection
                showRecipientSelectionView(transferData, userHistory);
            }
        }
        // Case 2: Returning user without pre-selected recipient
        else if (hasHistory) {
            // Show recipient selection with history
            showRecipientSelectionView(transferData, userHistory);
            
            // If no payment methods, immediately show payment method form
            if (!hasPaymentMethods) {
                document.getElementById('recipientViewPaymentMethod').style.display = 'none';
            }
        }
        // Case 3: New user (no history)
        else {
            showNewUserView(transferData);
        }
    }
    
    /**
     * Shows the new user view with empty form fields
     * @param {Object} transferData - Transfer data from the API
     */
    function showNewUserView(transferData) {
        // Reset form fields
        const form = document.getElementById('newUserForm');
        if (form) {
            form.reset();
        }
        
        showView('newUserView');
    }
    
    /**
     * Shows the recipient selection view for returning users
     * @param {Object} transferData - Transfer data from the API
     * @param {Object} userHistory - User history data from the API
     */
    function showRecipientSelectionView(transferData, userHistory) {
        console.log("Setting up recipient selection view");
        
        // Clear form inputs
        document.getElementById('recipientNameInput').value = '';
        document.getElementById('recipientBankInput').value = '';
        document.getElementById('recipientAccountInput').value = '';
        
        // Set transfer details
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
        
        // Populate recent recipients list
        populateRecentRecipients(userHistory);
        
        // Set up payment method display if available
        if (userHistory && userHistory.payment_methods && userHistory.payment_methods.length > 0) {
            const defaultPayment = userHistory.payment_methods.find(p => p.is_default) || userHistory.payment_methods[0];
            const lastFour = defaultPayment.card_number ? `*${defaultPayment.card_number.slice(-4)}` : '';
            
            document.getElementById('recipientViewCardNumber').textContent = lastFour;
            
            // Store selected payment
            storePaymentData(defaultPayment);
        } else {
            // No payment methods - hide payment display
            document.getElementById('recipientViewPaymentMethod').style.display = 'none';
            // Force editing payment method later
            localStorage.setItem('needsPaymentMethod', 'true');
        }
        
        showView('recipientSelectionView');
    }
    
    /**
     * Populates the recent recipients list in the recipient selection view
     * @param {Object} userHistory - User history data from the API
     */
    /**
     * Populates the recent recipients list in the recipient selection view
     * @param {Object} userHistory - User history data from the API
     */
    function populateRecentRecipients(userHistory) {
        const recentRecipientsList = document.getElementById('recentRecipientsList');
        const recentRecipientsSection = document.getElementById('recentRecipientsSection');
        
        // Clear existing list
        if (recentRecipientsList) {
            recentRecipientsList.innerHTML = '';
        }
        
        // Check if user has recipients
        if (!userHistory || !userHistory.recipients || userHistory.recipients.length === 0) {
            if (recentRecipientsSection) {
                recentRecipientsSection.style.display = 'none';
            }
            return;
        }
        
        // Show the section
        if (recentRecipientsSection) {
            recentRecipientsSection.style.display = 'block';
        }
        
        // Populate the list with unique recipients
        const addedRecipientIds = new Set();
        
        userHistory.recipients.forEach(recipient => {
            if (addedRecipientIds.has(recipient.id)) {
                return; // Skip duplicates
            }
            
            addedRecipientIds.add(recipient.id);
            
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
            
            // Add click handler for selecting this recipient
            recipientItem.addEventListener('click', function() {
                // Fill the form fields with recipient data
                document.getElementById('recipientNameInput').value = recipient.name;
                document.getElementById('recipientBankInput').value = recipient.bank_name || '';
                document.getElementById('recipientAccountInput').value = recipient.bank_account_number || '';
                
                // Store selected recipient
                storeRecipientData(recipient);
                
                // Highlight selected recipient
                const allRecipients = document.querySelectorAll('.recent-recipient-item');
                allRecipients.forEach(item => item.classList.remove('selected'));
                recipientItem.classList.add('selected');
            });
            
            recentRecipientsList.appendChild(recipientItem);
        });
    }
    
    /**
     * Shows the payment method view
     */
    function showPaymentMethodView() {
        console.log("Setting up payment method view");
        
        // Clear form fields
        document.getElementById('paymentCardNumber').value = '';
        document.getElementById('paymentCardExpiry').value = '';
        document.getElementById('paymentCardCvv').value = '';
        document.getElementById('paymentCardName').value = '';
        document.getElementById('paymentCardZip').value = '';
        
        // Show/hide saved payment section based on whether user has saved methods
        const savedPaymentSection = document.getElementById('savedPaymentSection');
        
        if (userData && userData.user_history && userData.user_history.payment_methods && 
            userData.user_history.payment_methods.length > 0) {
            
            const defaultPayment = userData.user_history.payment_methods.find(p => p.is_default) || 
                                userData.user_history.payment_methods[0];
            const lastFour = defaultPayment.card_number ? 
                            `*${defaultPayment.card_number.slice(-4)}` : '';
            
            document.getElementById('savedPaymentCardNumber').textContent = lastFour;
            
            // Store reference to selected payment method
            storePaymentData(defaultPayment);
            
            // Show saved payment section
            savedPaymentSection.style.display = 'block';
        } else {
            // Hide saved payment section if no history
            savedPaymentSection.style.display = 'none';
        }
        
        showView('paymentMethodView');
    }
    
    /**
     * Shows the review details view with recipient and payment information
     * @param {Object} recipientData - Selected recipient data
     * @param {Object} paymentData - Selected payment method data
     * @param {Object} transferData - Transfer details from API
     */
    function showReviewDetailsView(recipientData, paymentData, transferData) {
        console.log("Setting up review details view");
        
        // Fill recipient details
        const recipientName = document.getElementById('reviewDetailsRecipientName');
        const destination = document.getElementById('reviewDetailsDestination');
        const deliveryMethod = document.getElementById('reviewDetailsDeliveryMethod');
        const accountNumber = document.getElementById('reviewDetailsAccountNumber');
        
        if (recipientData) {
            recipientName.textContent = recipientData.name;
            
            // Format country with flag
            let countryDisplay = recipientData.country || 'Unknown';
            if (recipientData.country === 'IN' || recipientData.country === 'INDIA') {
                countryDisplay = '🇮🇳 India';
            } else if (recipientData.country === 'MX' || recipientData.country === 'MEXICO') {
                countryDisplay = '🇲🇽 Mexico';
            } else if (recipientData.country === 'GT' || recipientData.country === 'GUATEMALA') {
                countryDisplay = '🇬🇹 Guatemala';
            }
            destination.textContent = countryDisplay;
            
            // Set account number (masked)
            const acctNum = recipientData.bank_account_number || '';
            const lastFour = acctNum ? `**** ${acctNum.slice(-4)}` : '';
            accountNumber.textContent = lastFour;
        }
        
        // Set delivery method
        deliveryMethod.textContent = transferData.delivery_method === 'bank_deposit' ? 
            'Bank deposit' : 'Cash pickup';
        
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
        if (paymentData) {
            const cardNumber = paymentData.card_number || '';
            const lastFourCard = cardNumber ? `*${cardNumber.slice(-4)}` : '';
            document.getElementById('reviewDetailsCardNumber').textContent = lastFourCard;
        }
        
        showView('reviewDetailsView');
    }
    
    /**
     * Shows the security code screen for saved payment methods
     */
    function showSecurityCodeScreen() {
        console.log("Setting up security code screen");
        
        // Reset security code input and error
        const securityCodeInput = document.getElementById('securityCode');
        securityCodeInput.value = '';
        securityCodeInput.classList.remove('is-invalid');
        
        const securityCodeError = document.getElementById('securityCodeError');
        securityCodeError.style.display = 'none';
        
        // Disable confirm button initially
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        confirmBtn.disabled = true;
        
        showView('securityCodeScreen');
    }
    
    /**
     * Handles input in the security code field
     */
    function handleSecurityCodeInput() {
        // Remove error styling
        this.classList.remove('is-invalid');
        document.getElementById('securityCodeError').style.display = 'none';
        
        // Enable/disable button based on input
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        confirmBtn.disabled = (this.value.trim().length === 0);
    }
    
    /**
     * Toggles visibility of the security code
     */
    function toggleSecurityCodeVisibility() {
        const input = document.getElementById('securityCode');
        input.type = input.type === 'password' ? 'text' : 'password';
    }
    
    /**
     * Verifies the security code and proceeds with payment
     */
    function verifySecurityCode() {
        const securityCode = document.getElementById('securityCode').value.trim();
        const securityCodeError = document.getElementById('securityCodeError');
        
        // Simple validation - accept any 3-4 digits
        const isValid = /^\d{3,4}$/.test(securityCode);
        
        if (!isValid) {
            document.getElementById('securityCode').classList.add('is-invalid');
            securityCodeError.style.display = 'block';
            return;
        }
        
        // Show loading state
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Process transaction
        completeTransaction();
    }
    
    /**
     * Handles submission of the new user form
     * @param {Event} e - Form submission event
     */
    function handleNewUserFormSubmit(e) {
        e.preventDefault();
        
        // Collect form data
        const formData = {
            recipientName: document.getElementById('newRecipientName').value,
            bankName: document.getElementById('newBankName').value,
            accountNumber: document.getElementById('newAccountNumber').value,
            cardNumber: document.getElementById('newCardNumber').value,
            cardExpiry: document.getElementById('newCardExpiry').value,
            cardCvv: document.getElementById('newCardCvv').value,
            cardholderName: document.getElementById('newCardName').value,
            country: document.getElementById('newCardCountry').value,
            zipCode: document.getElementById('newCardZip').value,
            email: document.getElementById('newEmail').value
        };
        
        // Store form data for transaction
        const submitData = {
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
        
        localStorage.setItem('firstTimeTransaction', 'true');
        localStorage.setItem('firstTimeFormData', JSON.stringify(submitData));
        
        // Create recipient object for review
        const recipientData = {
            name: formData.recipientName,
            bank_name: formData.bankName,
            bank_account_number: formData.accountNumber,
            country: userData.transfer_data.country || 'Unknown'
        };
        
        // Create payment object for review
        const paymentData = {
            card_number: formData.cardNumber,
            card_type: 'Debit card',
            expiration_date: formData.cardExpiry
        };
        
        // Store data
        storeRecipientData(recipientData);
        
        // Set new card flag (to skip CVV verification)
        localStorage.setItem('isNewCard', 'true');
        
        // Show review details
        showReviewDetailsView(recipientData, paymentData, userData.transfer_data);
    }
    
    /**
     * Handles the continue button click in recipient selection view
     */
    function handleRecipientContinue() {
        // Check if we have a selected recipient
        const selectedRecipientData = JSON.parse(localStorage.getItem('selectedRecipient') || '{}');
        const recipientNameInput = document.getElementById('recipientNameInput');
        
        // If no selected recipient, check form inputs
        if (!selectedRecipientData.name && !recipientNameInput.value) {
            alert('Please select a recipient or enter recipient details');
            return;
        }
        
        // If form inputs are used, create a new recipient object
        if (!selectedRecipientData.name && recipientNameInput.value) {
            const newRecipient = {
                name: recipientNameInput.value,
                bank_name: document.getElementById('recipientBankInput').value,
                bank_account_number: document.getElementById('recipientAccountInput').value,
                country: userData.transfer_data.country || 'Unknown'
            };
            
            storeRecipientData(newRecipient);
        }
        
        // Check if we need to get payment method
        const needsPaymentMethod = localStorage.getItem('needsPaymentMethod') === 'true';
        const hasPaymentMethod = !!localStorage.getItem('selectedPayment');
        
        if (needsPaymentMethod || !hasPaymentMethod) {
            // Show payment method view
            showPaymentMethodView();
            localStorage.removeItem('needsPaymentMethod');
        } else {
            // Continue to review details
            const recipientData = JSON.parse(localStorage.getItem('selectedRecipient'));
            const paymentData = JSON.parse(localStorage.getItem('selectedPayment'));
            
            showReviewDetailsView(recipientData, paymentData, userData.transfer_data);
        }
    }
    
    /**
     * Handles click on the send money button in review details
     */
    function handleSendMoneyClick() {
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Check if we need to verify CVV for saved card
        const isNewCard = localStorage.getItem('isNewCard') === 'true';
        const isFirstTime = localStorage.getItem('firstTimeTransaction') === 'true';
        
        if (!isNewCard && !isFirstTime) {
            // Show security code verification for saved cards
            showSecurityCodeScreen();
        } else {
            // Skip CVV verification for new cards (already entered)
            completeTransaction();
            // Clean up flag
            localStorage.removeItem('isNewCard');
        }
    }
    
    /**
     * Saves new payment method details
     */
    function savePaymentMethod() {
        const cardNumber = document.getElementById('paymentCardNumber').value;
        
        // If card number field is empty, check if using saved payment
        if (!cardNumber.trim()) {
            const selectedPayment = localStorage.getItem('selectedPayment');
            if (selectedPayment) {
                // User is reusing saved payment
                const recipientData = JSON.parse(localStorage.getItem('selectedRecipient') || '{}');
                const paymentData = JSON.parse(localStorage.getItem('selectedPayment'));
                
                showReviewDetailsView(recipientData, paymentData, userData.transfer_data);
                return;
            } else {
                alert('Please enter card information');
                return;
            }
        }
        
        // Collect payment form data
        const paymentData = {
            card_number: cardNumber,
            card_type: 'Debit card',
            expiration_date: document.getElementById('paymentCardExpiry').value,
            cvv: document.getElementById('paymentCardCvv').value,
            billing_name: document.getElementById('paymentCardName').value,
            country: document.getElementById('paymentCardCountry').value,
            zip_code: document.getElementById('paymentCardZip').value
        };
        
        // Set flag for new card
        localStorage.setItem('isNewCard', 'true');
        
        // Store payment data
        localStorage.setItem('newPaymentData', JSON.stringify(paymentData));
        
        // Show review details view
        const recipientData = JSON.parse(localStorage.getItem('selectedRecipient') || '{}');
        showReviewDetailsView(recipientData, paymentData, userData.transfer_data);
    }
    
    /**
     * Selects a saved payment method
     */
    function selectSavedPaymentMethod() {
        // Use the saved payment data
        if (userData && userData.user_history && userData.user_history.payment_methods && 
            userData.user_history.payment_methods.length > 0) {
            
            const defaultPayment = userData.user_history.payment_methods[0];
            storePaymentData(defaultPayment);
            
            // Go back to review screen
            const recipientData = JSON.parse(localStorage.getItem('selectedRecipient') || '{}');
            showReviewDetailsView(recipientData, defaultPayment, userData.transfer_data);
        }
    }
    
    /**
     * Completes the transaction by sending data to the API
     */
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
            
            const selectedRecipientId = localStorage.getItem('selectedRecipientId');
            const selectedPaymentId = localStorage.getItem('selectedPaymentId');
            
            // Check if we have necessary data
            if (!selectedRecipientId) {
                alert('Please select a recipient');
                return;
            }
            
            requestData = {
                transaction_id: transactionId,
                recipient_id: selectedRecipientId,
                payment_method_id: selectedPaymentId
            };
            
            // If we have a new payment method, include it
            const newPaymentData = localStorage.getItem('newPaymentData');
            if (newPaymentData) {
                const paymentData = JSON.parse(newPaymentData);
                Object.assign(requestData, {
                    card_number: paymentData.card_number,
                    expiration_date: paymentData.expiration_date,
                    cvv: paymentData.cvv,
                    card_name: paymentData.billing_name,
                    country: paymentData.country,
                    zip_code: paymentData.zip_code
                });
            }
        }
        
        console.log("Sending transaction data:", requestData);
        
        // Call the API
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
                    throw new Error(`API error: ${response.status} - ${text}`);
                });
            }
            return response.json();
        })
        .then(result => {
            if (result.status === 'success') {
                // Show success message
                showView('successMessage');
                
                // Clear stored data
                clearStoredData();
            } else {
                throw new Error(result.message || 'Transaction failed');
            }
        })
        .catch(error => {
            console.error('Error processing transaction:', error);
            
            // Reset button states
            const confirmBtn = document.getElementById('confirmPaymentBtn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Confirm payment';
            }
            
            const sendMoneyBtn = document.getElementById('sendMoneyButton');
            if (sendMoneyBtn) {
                sendMoneyBtn.disabled = false;
                sendMoneyBtn.innerHTML = 'Send money';
            }
            
            // Show error message
            alert(`Error: ${error.message || 'Failed to process transaction'}`);
        });
    }
    
    /**
     * Stores selected recipient data in localStorage
     * @param {Object} recipient - Recipient data object
     */
    function storeRecipientData(recipient) {
        localStorage.setItem('selectedRecipient', JSON.stringify(recipient));
        localStorage.setItem('selectedRecipientId', recipient.id || 'new');
    }
    
    /**
     * Stores selected payment method data in localStorage
     * @param {Object} payment - Payment method data object
     */
    function storePaymentData(payment) {
        localStorage.setItem('selectedPayment', JSON.stringify(payment));
        localStorage.setItem('selectedPaymentId', payment.id || 'new');
    }
    
    /**
     * Stores both recipient and payment data in localStorage
     * @param {Object} recipient - Recipient data object
     * @param {Object} payment - Payment method data object
     */
    function storeSelectedData(recipient, payment) {
        if (recipient) {
            storeRecipientData(recipient);
        }
        
        if (payment) {
            storePaymentData(payment);
        }
    }
    
    /**
     * Clears all stored data from localStorage
     */
    function clearStoredData() {
        localStorage.removeItem('selectedRecipientId');
        localStorage.removeItem('selectedPaymentId');
        localStorage.removeItem('selectedRecipient');
        localStorage.removeItem('selectedPayment');
        localStorage.removeItem('firstTimeTransaction');
        localStorage.removeItem('firstTimeFormData');
        localStorage.removeItem('newPaymentData');
        localStorage.removeItem('isNewCard');
        localStorage.removeItem('needsPaymentMethod');
    }
    
    /**
     * Fills transaction details in all views
     * @param {Object} transferData - Transfer data from the API
     */
    function fillTransactionDetails(transferData) {
        const details = transferData.details;
        
        // Set amounts in elements with corresponding classes
        document.querySelectorAll('.send-amount').forEach(el => {
            el.textContent = formatCurrency(details.amount_from);
        });
        
        document.querySelectorAll('.send-currency').forEach(el => {
            el.textContent = details.currency_from;
        });
        
        document.querySelectorAll('.exchange-rate-value').forEach(el => {
            el.textContent = `1 ${details.currency_from} = ${details.exchange_rate} ${details.currency_to}`;
        });
        
        document.querySelectorAll('.receive-amount').forEach(el => {
            el.textContent = formatCurrency(details.amount_to);
        });
        
        document.querySelectorAll('.receive-currency').forEach(el => {
            el.textContent = details.currency_to;
        });
        
        document.querySelectorAll('.delivery-method').forEach(el => {
            el.textContent = transferData.delivery_method === 'bank_deposit' ? 'Bank deposit' : 'Cash pickup';
        });
        
        document.querySelectorAll('.transfer-fee').forEach(el => {
            el.textContent = `${formatCurrency(details.transfer_fee)} ${details.currency_from}`;
        });
        
        document.querySelectorAll('.total-amount').forEach(el => {
            el.textContent = `${formatCurrency(details.total_amount)} ${details.currency_from}`;
        });
    }
    
    /**
     * Formats a currency amount with 2 decimal places
     * @param {number} amount - The amount to format
     * @returns {string} - Formatted amount with 2 decimal places
     */
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }
    
    /**
     * Shows an error message and hides other views
     * @param {string} message - Error message to display
     */
    function showError(message = "Transfer data not found. Please return to WhatsApp and try again.") {
        const errorMsgEl = document.querySelector('#errorContainer p');
        if (errorMsgEl) {
            errorMsgEl.textContent = message;
        }
        
        showView('errorContainer');
    }
    
    /**
     * Redirects user back to WhatsApp to start a new transfer
     */
    function redirectToWhatsApp() {
        // WhatsApp phone number
        const whatsappPhone = '12292902911';
        
        // Create WhatsApp deeplink
        const whatsappLink = `https://wa.me/${whatsappPhone}?text=I%20want%20to%20start%20a%20new%20transfer`;
        
        // Clear stored data before redirecting
        clearStoredData();
        
        // Redirect to WhatsApp
        window.location.href = whatsappLink;
    }
    
    // Initialize the application
    init();
}); ? 'Bank deposit'
