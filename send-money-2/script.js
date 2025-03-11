document.addEventListener('DOMContentLoaded', function() {
    console.log("Money transfer application initialized");
    
    // API base URL
    const API_BASE_URL = 'https://ea37f6ec6096.ngrok.app';
    
    // Get transaction ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('id');
    console.log("Transaction ID:", transactionId);
    
    // DOM elements - cache references for better performance
    const loadingContainer = document.getElementById('loadingContainer');
    const errorContainer = document.getElementById('errorContainer');
    const transferContent = document.getElementById('transferContent');
    const newUserView = document.getElementById('newUserView');
    const recipientSelectionView = document.getElementById('recipientSelectionView');
    const paymentMethodView = document.getElementById('paymentMethodView');
    const reviewDetailsView = document.getElementById('reviewDetailsView');
    const securityCodeScreen = document.getElementById('securityCodeScreen');
    const successMessage = document.getElementById('successMessage');
    
    // Store user data
    let userData = null;
    
    /**
     * Main Initialization
     */
    function init() {
        console.log("Initializing application...");
        
        // Basic element validation
        if (!loadingContainer || !errorContainer || !transferContent) {
            console.error("Critical DOM elements are missing");
            alert("The application failed to initialize. Please refresh the page.");
            return;
        }
        
        // Show loading indicator
        if (loadingContainer) {
            loadingContainer.style.display = 'block';
        }
        
        // Hide all other views initially
        [transferContent, errorContainer, newUserView, recipientSelectionView, 
         paymentMethodView, reviewDetailsView, securityCodeScreen, successMessage]
            .forEach(el => {
                if (el) el.style.display = 'none';
            });
        
        // Set up event listeners
        setupEventListeners();
        
        // Fetch transaction data
        fetchTransactionData();
    }
    
    /**
     * Sets up all event listeners
     */
    function setupEventListeners() {
        console.log("Setting up event listeners");
        
        // New User Form submission
        const newUserForm = document.getElementById('newUserForm');
        if (newUserForm) {
            newUserForm.addEventListener('submit', handleNewUserFormSubmit);
        }
        
        // Return to WhatsApp button
        const newTransferBtn = document.querySelector('.btn-new-transfer');
        if (newTransferBtn) {
            newTransferBtn.addEventListener('click', redirectToWhatsApp);
        }
        
        // Edit payment method link
        const editPaymentMethodLink = document.getElementById('editPaymentMethodLink');
        if (editPaymentMethodLink) {
            editPaymentMethodLink.addEventListener('click', function(e) {
                e.preventDefault();
                showView('paymentMethodView');
            });
        }
        
        // Payment save button
        const paymentSaveButton = document.getElementById('paymentSaveButton');
        if (paymentSaveButton) {
            paymentSaveButton.addEventListener('click', savePaymentMethod);
        }
        
        // View saved payment button
        const viewSavedPaymentBtn = document.getElementById('viewSavedPaymentBtn');
        if (viewSavedPaymentBtn) {
            viewSavedPaymentBtn.addEventListener('click', function(e) {
                e.preventDefault();
                selectSavedPaymentMethod();
            });
        }
        
        // Edit links in review details
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
        
        // Send Money Button
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
     */
    function showView(viewId) {
        console.log("Showing view:", viewId);
        
        // All possible views
        const viewElements = {
            'loadingContainer': loadingContainer,
            'errorContainer': errorContainer,
            'transferContent': transferContent,
            'newUserView': newUserView,
            'recipientSelectionView': recipientSelectionView,
            'paymentMethodView': paymentMethodView,
            'reviewDetailsView': reviewDetailsView,
            'securityCodeScreen': securityCodeScreen,
            'successMessage': successMessage
        };
        
        // Hide all views
        Object.values(viewElements).forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // Show requested view
        const viewToShow = viewElements[viewId];
        if (viewToShow) {
            viewToShow.style.display = 'block';
            
            // Make sure transferContent is visible when showing any content view
            if (viewId !== 'loadingContainer' && viewId !== 'errorContainer' && transferContent) {
                transferContent.style.display = 'block';
            }
        } else {
            console.error("View not found:", viewId);
        }
    }
    
    /**
     * Fetches transaction data from the API
     */
    async function fetchTransactionData() {
        // For testing on specific site, use mock data directly
        if (window.location.href.includes('testmoneytransfers.xyz')) {
            console.log("Using mock data for testing");
            const mockData = getMockTransferData();
            userData = mockData;
            processTransactionData(mockData);
            return;
        }
        
        if (!transactionId) {
            showError("Missing transaction ID. Please go back to WhatsApp and try again.");
            return;
        }
        
        try {
            const requestUrl = `${API_BASE_URL}/api/transaction/${transactionId}`;
            console.log("Fetching transaction data from:", requestUrl);
            
            // Set timeout to prevent indefinite loading
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            try {
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
                console.log("API response status:", response.status);
                
                // Get the response as text first to log it
                const responseText = await response.text();
                console.log("Raw API response:", responseText);
                
                // Parse the response as JSON
                let data;
                try {
                    data = JSON.parse(responseText);
                    console.log("Parsed API response:", data);
                } catch (parseError) {
                    console.error("Failed to parse API response as JSON:", parseError);
                    throw new Error("Invalid response format from API");
                }
                
                if (!data || data.status !== 'success' || !data.transfer_data || !data.transfer_data.details) {
                    throw new Error("Invalid data format in API response");
                }
                
                // Process the data
                userData = data;
                processTransactionData(data);
                
            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.error("Error fetching from API:", fetchError);
                
                // Use mock data if API call fails
                console.log("Using mock data as fallback");
                const mockData = getMockTransferData();
                userData = mockData;
                processTransactionData(mockData);
            }
            
        } catch (error) {
            console.error("Critical error in fetchTransactionData:", error);
            showError(`Failed to load transaction data: ${error.message}`);
        }
    }

    /**
     * Process transaction data once received
     */
    function processTransactionData(data) {
        console.log("Processing transaction data");
        
        try {
            // Make sure user_id is set if present
            if (data.user_history && data.user_history.user_id) {
                userData.user_id = data.user_history.user_id;
            }
            
            // Determine which view to show
            determineInitialView(data);
        } catch (error) {
            console.error("Error processing transaction data:", error);
            showError("Failed to process transaction data");
        }
    }
    
    /**
     * Gets mock data for testing purposes
     */
    function getMockTransferData() {
        return {
            status: 'success',
            user_id: 'test-user-123',
            transfer_data: {
                preferred_recipient_id: null,
                country: 'IN',
                delivery_method: 'bank_deposit',
                details: {
                    amount_from: 150.00,
                    currency_from: 'USD',
                    amount_to: 12503.66,
                    currency_to: 'INR',
                    exchange_rate: 83.3577,
                    transfer_fee: 5.00,
                    total_amount: 155.00
                }
            },
            user_history: {
                user_id: 'test-user-123',
                recipients: [
                    {
                        id: 'rec-1',
                        name: 'Anika Patel',
                        bank_name: 'HDFC Bank',
                        bank_account_number: '12345678740',
                        country: 'IN'
                    }
                ],
                payment_methods: [
                    {
                        id: 'pay-1',
                        card_number: '4111111144325',
                        card_type: 'Debit card',
                        expiration_date: '12/25',
                        is_default: true
                    }
                ]
            }
        };
    }
    
    /**
     * Determines which view to show based on user data
     */
    function determineInitialView(data) {
        console.log("Determining initial view");
        
        try {
            const transferData = data.transfer_data;
            const userHistory = data.user_history || {};
            const hasRecipients = userHistory.recipients && userHistory.recipients.length > 0;
            const hasPaymentMethods = userHistory.payment_methods && userHistory.payment_methods.length > 0;
            const preferredRecipientId = transferData.preferred_recipient_id;
            
            // Fill transaction details for all views
            fillTransactionDetails(transferData);
            
            if (preferredRecipientId && hasRecipients) {
                // Find preferred recipient in history
                const selectedRecipient = userHistory.recipients.find(r => r.id === preferredRecipientId);
                
                if (selectedRecipient) {
                    console.log("View: Pre-selected recipient from history");
                    
                    // Get default payment method
                    const defaultPayment = hasPaymentMethods ? 
                        (userHistory.payment_methods.find(p => p.is_default) || userHistory.payment_methods[0]) : null;
                    
                    // Store selected data
                    storeSelectedData(selectedRecipient, defaultPayment);
                    
                    // Show review details
                    showReviewDetailsView(selectedRecipient, defaultPayment, transferData);
                    return;
                }
            }
            
            // For returning users without pre-selected recipient
            if (hasRecipients) {
                console.log("View: Returning user recipient selection");
                showRecipientSelectionView(transferData, userHistory);
                return;
            }
            
            // New user
            console.log("View: New user form");
            showNewUserView(transferData);
            
        } catch (error) {
            console.error("Error determining initial view:", error);
            showError("Application error: Failed to initialize view");
        }
    }
    
    /**
     * Shows the new user view with empty form fields
     */
    function showNewUserView(transferData) {
        console.log("Showing new user view");
        
        try {
            // Reset form fields
            const form = document.getElementById('newUserForm');
            if (form) {
                form.reset();
            }
            
            showView('newUserView');
        } catch (error) {
            console.error("Error showing new user view:", error);
            showError("Failed to initialize the form");
        }
    }
    
    /**
     * Shows the recipient selection view for returning users
     */
    function showRecipientSelectionView(transferData, userHistory) {
        console.log("Setting up recipient selection view");
        
        try {
            // Clear form inputs
            const recipientNameInput = document.getElementById('recipientNameInput');
            const recipientBankInput = document.getElementById('recipientBankInput');
            const recipientAccountInput = document.getElementById('recipientAccountInput');
            
            if (recipientNameInput) recipientNameInput.value = '';
            if (recipientBankInput) recipientBankInput.value = '';
            if (recipientAccountInput) recipientAccountInput.value = '';
            
            // Set transfer details
            const details = transferData.details;
            const sendAmountElement = document.getElementById('recipientViewSendAmount');
            const transferFeesElement = document.getElementById('recipientViewTransferFees');
            const totalElement = document.getElementById('recipientViewTotal');
            const receiveAmountElement = document.getElementById('recipientViewReceiveAmount');
            const exchangeRateElement = document.getElementById('recipientViewExchangeRate');
            
            if (sendAmountElement) sendAmountElement.textContent = 
                `${formatCurrency(details.amount_from)} ${details.currency_from}`;
                
            if (transferFeesElement) transferFeesElement.textContent = 
                `${formatCurrency(details.transfer_fee)} ${details.currency_from}`;
                
            if (totalElement) totalElement.textContent = 
                `${formatCurrency(details.total_amount)} ${details.currency_from}`;
                
            if (receiveAmountElement) receiveAmountElement.textContent = 
                `${formatCurrency(details.amount_to)} ${details.currency_to}`;
                
            if (exchangeRateElement) exchangeRateElement.textContent = 
                `Exchange rate: 1 ${details.currency_from} = ${details.exchange_rate} ${details.currency_to}`;
            
            // Populate recent recipients list
            populateRecentRecipients(userHistory);
            
            // Set up payment method display if available
            const recipientViewPaymentMethod = document.getElementById('recipientViewPaymentMethod');
            const recipientViewCardNumber = document.getElementById('recipientViewCardNumber');
            
            if (userHistory && userHistory.payment_methods && userHistory.payment_methods.length > 0) {
                const defaultPayment = userHistory.payment_methods.find(p => p.is_default) || userHistory.payment_methods[0];
                const lastFour = defaultPayment.card_number ? `*${defaultPayment.card_number.slice(-4)}` : '';
                
                if (recipientViewCardNumber) recipientViewCardNumber.textContent = lastFour;
                
                // Store selected payment
                storePaymentData(defaultPayment);
                
                // Show payment display
                if (recipientViewPaymentMethod) recipientViewPaymentMethod.style.display = 'block';
            } else {
                // No payment methods - hide payment display
                if (recipientViewPaymentMethod) recipientViewPaymentMethod.style.display = 'none';
                // Force editing payment method later
                localStorage.setItem('needsPaymentMethod', 'true');
            }
            
            showView('recipientSelectionView');
        } catch (error) {
            console.error("Error showing recipient selection view:", error);
            showError("Failed to set up the recipient selection screen");
        }
    }
    
    // Remaining functions continue...
    
    /**
     * Stores selected recipient data in localStorage
     */
    function storeRecipientData(recipient) {
        localStorage.setItem('selectedRecipient', JSON.stringify(recipient));
        localStorage.setItem('selectedRecipientId', recipient.id || 'new');
    }
    
    /**
     * Stores selected payment method data in localStorage
     */
    function storePaymentData(payment) {
        localStorage.setItem('selectedPayment', JSON.stringify(payment));
        localStorage.setItem('selectedPaymentId', payment.id || 'new');
    }
    
    /**
     * Stores both recipient and payment data in localStorage
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
     * Formats a currency amount with 2 decimal places
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
});
