document.addEventListener('DOMContentLoaded', function() {
    const phoneForm = document.getElementById('phoneForm');
    const submitBtn = document.getElementById('submitBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultMessage = document.getElementById('resultMessage');
    
    // API endpoint - change this to your actual API endpoint
    // For local testing with ngrok:
    const API_BASE_URL = 'https://7420-63-125-103-250.ngrok-free.app'; 
    
    // For production:
    // const API_BASE_URL = 'https://api.testmoneytransfers.xyz';
    
    phoneForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get phone number
        const phoneNumberInput = document.getElementById('phoneNumber');
        let phoneNumber = phoneNumberInput.value.trim();
        
        // Add + if missing (the + will be added by the form)
        if (phoneNumber) {
            // Clear previous results
            resultContainer.style.display = 'none';
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loader"></span> Sending...';
            
            try {
                // Make API call
                const response = await fetch(`${API_BASE_URL}/api/send-welcome`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: '+' + phoneNumber
                    })
                });
                
                const data = await response.json();
                
                // Display result
                resultContainer.style.display = 'block';
                
                if (response.ok) {
                    resultMessage.className = 'alert alert-success';
                    resultMessage.innerHTML = `
                        <h5>✅ Message Sent Successfully!</h5>
                        <p>We've sent a welcome message to +${phoneNumber}.</p>
                        <p>Check your WhatsApp and respond to interact with our money transfer bot.</p>
                    `;
                } else {
                    resultMessage.className = 'alert alert-danger';
                    resultMessage.innerHTML = `
                        <h5>❌ Error</h5>
                        <p>${data.message || 'Something went wrong. Please try again.'}</p>
                    `;
                }
            } catch (error) {
                console.error('Error:', error);
                resultContainer.style.display = 'block';
                resultMessage.className = 'alert alert-danger';
                resultMessage.innerHTML = `
                    <h5>❌ Connection Error</h5>
                    <p>Could not connect to the server. Please check your internet connection and try again.</p>
                `;
            } finally {
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Welcome Message';
            }
        }
    });
});
