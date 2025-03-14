document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (mobileMenuToggle && mobileNav) {
        mobileMenuToggle.addEventListener('click', function() {
            mobileNav.classList.toggle('active');
            
            // Animation for hamburger to X
            const spans = mobileMenuToggle.querySelectorAll('span');
            spans.forEach(span => span.classList.toggle('active'));
            
            if (mobileNav.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -7px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
    
    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });
    
    // Partners Slider Animation
    // Clone the partners rows for continuous looping
    const partnersSlider = document.querySelector('.partners-slider');
    
    if (partnersSlider) {
        const firstRow = partnersSlider.querySelector('.partners-row');
        
        if (firstRow) {
            const clone = firstRow.cloneNode(true);
            partnersSlider.appendChild(clone);
            
            // Create a continuous loop by positioning the clone right after the original
            const secondRow = partnersSlider.querySelector('.partners-row:nth-child(2)');
            if (secondRow) {
                const cloneSecond = secondRow.cloneNode(true);
                partnersSlider.appendChild(cloneSecond);
            }
            
            // We need to adjust the animation keyframes if we're on mobile
            adjustPartnersAnimation();
            
            // And update on resize
            window.addEventListener('resize', adjustPartnersAnimation);
        }
    }
    
    // Form Handling - For demonstration purposes
    const transferForm = document.querySelector('.hero-form form');
    
    if (transferForm) {
        const countrySelect = transferForm.querySelector('select');
        const youSendInput = transferForm.querySelector('.amount-input input');
        const theyReceiveInput = transferForm.querySelector('.recipient-amount input');
        const theyReceiveCurrency = transferForm.querySelector('.recipient-amount .currency span');
        
        // Exchange rates for demonstration
        const exchangeRates = {
            'mexico': 16.995, // 1 USD = 16.995 MXN
            'colombia': 3825.50, // 1 USD = 3825.50 COP
            'peru': 3.65 // 1 USD = 3.65 PEN
        };
        
        const currencyCodes = {
            'mexico': 'MXN',
            'colombia': 'COP',
            'peru': 'PEN'
        };
        
        // Update recipient amount when country or send amount changes
        function updateRecipientAmount() {
            const country = countrySelect.value;
            const rate = exchangeRates[country];
            const currencyCode = currencyCodes[country];
            
            // Remove "$" and "," from the input
            const amount = parseFloat(youSendInput.value.replace(/[$,]/g, '')) || 0;
            
            // Calculate recipient amount
            let recipientAmount = amount * rate;
            
            // Format the recipient amount with commas and decimal places
            theyReceiveInput.value = '$ ' + recipientAmount.toLocaleString('en-US', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            // Update currency code
            theyReceiveCurrency.textContent = currencyCode;
        }
        
        // Add event listeners
        countrySelect.addEventListener('change', updateRecipientAmount);
        youSendInput.addEventListener('input', function() {
            // Format the input as currency
            let value = this.value.replace(/[$,]/g, '');
            
            if (value) {
                value = parseFloat(value);
                this.value = '$ ' + value.toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
            
            updateRecipientAmount();
        });
        
        // Form submission (prevent default for demo)
        transferForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('This is a demo. In a real application, this would submit the form and process the transfer.');
        });
    }
    
    // Helper function to adjust partners animation based on screen size
    function adjustPartnersAnimation() {
        const partnersRows = document.querySelectorAll('.partners-row');
        
        partnersRows.forEach(row => {
            if (window.innerWidth <= 768) {
                // On mobile, slow down the animation
                row.style.animationDuration = '30s';
            } else {
                // On desktop, use the default speed
                row.style.animationDuration = '20s';
            }
        });
    }
    
    // Initialize any animations when page loads
    initAnimations();
});

function initAnimations() {
    // Optional: Add entrance animations for sections as they come into view
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Sections to animate on scroll
    const sections = document.querySelectorAll('.how-to-send, .why-choose, .partners, .refer-earn');
    
    sections.forEach(section => {
        observer.observe(section);
    });
    
    // Add animation class to enable CSS transitions
    document.body.classList.add('animations-enabled');
}
