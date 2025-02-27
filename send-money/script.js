document.addEventListener('DOMContentLoaded', function() {
    // Get transaction ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('id');
    
    // Elements
    const loadingContainer = document.getElementById('loadingContainer');
    const transferContent = document.getElementById('transferContent');
    const errorContainer = document.getElementById('errorContainer');
    const continueButton = document.getElementById('continueButton');
    
    // Country mapping (expand as needed)
    const countryMap = {
        'mx': {
            name: 'Mexico',
            flagClass: 'flag-mx',
            currency: 'MXN'
        },
        'gt': {
            name: 'Guatemala',
            flagClass: 'flag-gt',
            currency: 'GTQ'
        }
    };
    
    // Delivery method mapping
    const deliveryMethodMap = {
        'bank_deposit': 'Bank deposit',
        'cash_pickup': 'Cash pickup'
    };
    
    // API base URL - Update with your actual API endpoint
    // For local development with ngrok
    const API_BASE_URL = 'https://7420-63-125-103-250.ngrok-free.app';
    
    // For production
    // const API_BASE_URL = 'https://api.testmoneytransfers.xyz';
    
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
            showError();
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/transaction/${transactionId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch transaction data');
            }
            
            const data = await response.json();
            
            if (data.status === 'success' && data.transfer_data) {
                displayTransferData(data);
            } else {
                showError();
            }
        } catch (error) {
            console.error('Error fetching transaction data:', error);
            showError();
        }
    }
    
    // Function to display transfer data
    function displayTransferData(data) {
        const transferData = data.transfer_data;
        const details = transferData.details;
        
        if (!details) {
            showError();
            return;
        }
        
        // Set country and flag
        const countryCode = transferData.country || 'mx';
        const countryInfo = countryMap[countryCode] || { name: 'Other country', flagClass: '', currency: 'USD' };
        
        document.getElementById('countryFlag').className = `flag ${countryInfo.flagClass}`;
        document.getElementById('countryName').textContent = countryInfo.name;
        
        // Set amounts
        document.getElementById('sendAmount').textContent = formatCurrency(details.amount_from);
        document.getElementById('sendCurrency').textContent = details.currency_from;
        
        document.getElementById('receiveAmount').textContent = formatCurrency(details.amount_to);
        document.getElementById('receiveCurrency').textContent = details.currency_to;
        
        // Set delivery method
        const deliveryMethod = transferData.delivery_method || 'bank_deposit';
        document.getElementById('deliveryMethod').textContent = deliveryMethodMap[deliveryMethod] || 'Bank deposit';
        
        // Set fees and total
        document.getElementById('transferFee').textContent = `${details.transfer_fee} ${details.currency_from}`;
        document.getElementById('totalAmount').textContent = `${details.total_amount} ${details.currency_from}`;
        
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
    continueButton.addEventListener('click', function() {
        // For now, just show an alert
        alert('This would take the user to the payment processing section');
        
        // In production, redirect to payment processing page or show next steps
        // window.location.href = `/payment?id=${transactionId}`;
    });
    
    // Initialize by fetching transaction data
    fetchTransactionData();
});
