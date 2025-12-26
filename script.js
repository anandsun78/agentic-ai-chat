// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for fade-in animations
const revealOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, revealOptions);

// Observe hero section for animations
document.addEventListener('DOMContentLoaded', () => {
    const heroEl = document.querySelector('.hero');
    
    if (heroEl) {
        heroEl.style.opacity = '0';
        heroEl.style.transform = 'translateY(30px)';
        heroEl.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            heroEl.style.opacity = '1';
            heroEl.style.transform = 'translateY(0)';
        }, 100);
    }
});

// Navbar background on scroll
let lastScrollY = 0;
const navBarEl = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        navBarEl.style.background = 'rgba(251, 251, 253, 0.95)';
        navBarEl.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    } else {
        navBarEl.style.background = 'rgba(251, 251, 253, 0.8)';
        navBarEl.style.boxShadow = 'none';
    }
    
    lastScrollY = currentScroll;
});

// Button click handlers - moved to DOMContentLoaded to ensure proper initialization
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.btn-primary, .btn-secondary, .nav-button').forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const rippleEl = document.createElement('span');
            const bounds = this.getBoundingClientRect();
            const rippleSize = Math.max(bounds.width, bounds.height);
            const offsetX = e.clientX - bounds.left - rippleSize / 2;
            const offsetY = e.clientY - bounds.top - rippleSize / 2;
            
            rippleEl.style.width = rippleEl.style.height = rippleSize + 'px';
            rippleEl.style.left = offsetX + 'px';
            rippleEl.style.top = offsetY + 'px';
            rippleEl.classList.add('ripple');
            
            this.appendChild(rippleEl);
            
            setTimeout(() => {
                rippleEl.remove();
            }, 600);
        });
    });
});

// Add ripple effect styles dynamically
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .btn-primary, .btn-secondary, .nav-button {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// Parallax effect for hero visual
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroArt = document.querySelector('.hero-visual');
    
    if (heroArt && scrolled < window.innerHeight) {
        const parallax = scrolled * 0.3;
        heroArt.style.transform = `translateY(${parallax}px)`;
    }
});

// Smooth reveal animation for sections
const sectionReveal = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
        }
    });
}, {
    threshold: 0.2
});

document.querySelectorAll('section').forEach(section => {
    sectionReveal.observe(section);
});

// Search Modal Functionality
class SearchModal {
    constructor() {
        this.modal = document.getElementById('searchModal');
        this.closeBtn = document.getElementById('closeModal');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.searchBtn = document.getElementById('searchBtn');
        this.input = document.getElementById('searchName');
        this.resultContainer = document.getElementById('resultContainer');
        this.resultCard = document.getElementById('resultCard');
        this.resultLoading = document.getElementById('resultLoading');
        this.profileDetailContainer = document.getElementById('profileDetailContainer');
        this.profileDetailThumbnail = document.getElementById('profileDetailThumbnail');
        this.profileDetailTitle = document.getElementById('profileDetailTitle');
        this.profileDetailLink = document.getElementById('profileDetailLink');
        this.closeProfileDetailBtn = document.getElementById('closeProfileDetail');
        this.profilePhoneNumberInput = document.getElementById('profilePhoneNumber');
        this.openIMessageBtn = document.getElementById('openIMessageBtn');
        this.manualUrlContainer = document.getElementById('manualUrlContainer');
        this.linkedinUrlInput = document.getElementById('linkedinUrl');
        this.cancelUrlBtn = document.getElementById('cancelUrlBtn');
        this.searchUrlBtn = document.getElementById('searchUrlBtn');
        this.showManualUrlBtnPersistent = document.getElementById('showManualUrlBtnPersistent');
        this.getStartedButtons = document.querySelectorAll('.btn-primary, .nav-button');
        this.apiKey = 'afab492a-a163-430e-98f3-15eb248e3453';
        this.selectedProfile = null;
        
        // Kafka/Agentic phone number - used for receiving messages
        this.kafkaPhoneNumber = '+16463458837';
        
        // Sign In modal elements
        this.signInModal = document.getElementById('signInModal');
        this.signInBtn = document.getElementById('signInBtn');
        this.closeSignInModal = document.getElementById('closeSignInModal');
        this.phoneNumberInput = document.getElementById('phoneNumber');
        this.submitSignInBtn = document.getElementById('submitSignInBtn');
        this.cancelSignInBtn = document.getElementById('cancelSignInBtn');
        this.signInStatus = document.getElementById('signInStatus');
        this.signInLoading = document.getElementById('signInLoading');
        this.signInMessage = document.getElementById('signInMessage');
        // Default API server URL - will be auto-detected on load
        this.apiBaseUrl = 'http://localhost:8000';
        
        // Message Box modal elements
        this.messageBoxModal = document.getElementById('messageBoxModal');
        this.closeMessageBoxModal = document.getElementById('closeMessageBoxModal');
        this.messageBoxPhoneNumber = document.getElementById('messageBoxPhoneNumber');
        this.messageText = document.getElementById('messageText');
        this.sendMessageBtn = document.getElementById('sendMessageBtn');
        this.cancelMessageBoxBtn = document.getElementById('cancelMessageBoxBtn');
        this.messageBoxStatus = document.getElementById('messageBoxStatus');
        this.messageBoxLoading = document.getElementById('messageBoxLoading');
        this.messageBoxMessage = document.getElementById('messageBoxMessage');
        this.currentChatId = null;
        this.currentPhoneNumber = null;
        
        // Create Manually modal elements
        this.createManuallyBtn = document.getElementById('createManuallyBtn');
        this.createManuallyModal = document.getElementById('createManuallyModal');
        this.closeCreateManuallyModal = document.getElementById('closeCreateManuallyModal');
        this.cancelCreateManuallyBtn = document.getElementById('cancelCreateManuallyBtn');
        this.submitCreateManuallyBtn = document.getElementById('submitCreateManuallyBtn');
        this.firstNameInput = document.getElementById('firstName');
        this.lastNameInput = document.getElementById('lastName');
        this.bioInput = document.getElementById('bio');
        this.manualPhoneNumberInput = document.getElementById('manualPhoneNumber');
        this.createManuallyStatus = document.getElementById('createManuallyStatus');
        this.createManuallyLoading = document.getElementById('createManuallyLoading');
        this.createManuallyMessage = document.getElementById('createManuallyMessage');
        
        this.init();
    }

    init() {
        // Open modal when Get Started is clicked
        this.getStartedButtons.forEach(button => {
            if (button) {
                // Remove any existing event listeners
                const newButton = button.cloneNode(true);
                button.parentNode?.replaceChild(newButton, button);
                
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('✅ Get Started button clicked');
                    this.open();
                }, { capture: true });
                
                // Ensure button is clickable
                newButton.style.pointerEvents = 'auto';
                newButton.style.cursor = 'pointer';
                newButton.style.position = 'relative';
                newButton.style.zIndex = '10';
            }
        });

        // Sign In button handler
        if (this.signInBtn) {
            // Remove any existing event listeners
            const newSignInBtn = this.signInBtn.cloneNode(true);
            this.signInBtn.parentNode?.replaceChild(newSignInBtn, this.signInBtn);
            this.signInBtn = newSignInBtn; // Update reference
            
            newSignInBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('✅ Sign In button clicked');
                this.openSignIn();
            }, { capture: true });
            
            // Ensure button is clickable
            newSignInBtn.style.pointerEvents = 'auto';
            newSignInBtn.style.cursor = 'pointer';
            newSignInBtn.style.position = 'relative';
            newSignInBtn.style.zIndex = '10';
        }

        // Close modal handlers
        this.closeBtn?.addEventListener('click', () => this.close());
        this.cancelBtn?.addEventListener('click', () => this.close());
        
        // Close on overlay click
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
                this.close();
            }
        });

        // Real-time search as user types (debounced)
        this.searchTimeout = null;
        this.input?.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            
            // Clear previous timeout
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            // If input is empty, hide results
            if (!value) {
                if (this.resultContainer) {
                    this.resultContainer.style.display = 'none';
                }
                this.validateInput();
                return;
            }

            // Show loading state immediately
            if (this.resultContainer) {
                this.resultContainer.style.display = 'block';
            }
            if (this.resultLoading) {
                this.resultLoading.style.display = 'flex';
            }
            if (this.resultCard) {
                this.resultCard.innerHTML = '';
                this.resultCard.appendChild(this.resultLoading);
            }
            
            // Hide manual URL input if visible
            this.hideManualUrlInput();

            // Debounce: wait 800ms after user stops typing
            this.searchTimeout = setTimeout(() => {
                if (value.length >= 2) { // Only search if at least 2 characters
                    this.handleSearch();
                }
            }, 800);
        });

        // Fix cursor issue: allow clicking anywhere in modal to focus input
        this.modal?.addEventListener('click', (e) => {
            // If clicking on modal container (not on content), focus input
            if (e.target === this.modal || e.target.classList.contains('modal-overlay')) {
                // Don't prevent default, just allow normal behavior
                return;
            }
        });

        // Ensure input can be focused after search
        this.input?.addEventListener('focus', () => {
            // Ensure cursor is visible
            this.input.style.cursor = 'text';
        });

        // Enter key to search immediately
        this.input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.searchTimeout) {
                    clearTimeout(this.searchTimeout);
                }
                const value = this.input?.value.trim();
                if (value && value.length >= 2) {
                    this.handleSearch();
                }
            }
        });

        // Search button handler
        this.searchBtn?.addEventListener('click', () => {
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            this.handleSearch();
        });

        // Profile detail handlers
        this.closeProfileDetailBtn = document.getElementById('closeProfileDetail');
        this.closeProfileDetailBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeProfileDetail();
        });

        // Format phone number input - only allow digits
        this.profilePhoneNumberInput?.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) {
                value = value.slice(0, 10);
            }
            e.target.value = value;
        });

        // Allow Enter key in phone number input
        this.profilePhoneNumberInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.openIMessage();
            }
            // Only allow digits
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                e.preventDefault();
            }
        });

        // Open iMessage button
        this.openIMessageBtn?.addEventListener('click', () => {
            this.openIMessage();
        });

        // Manual URL handlers
        this.cancelUrlBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hideManualUrlInput();
        });

        this.searchUrlBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Search URL button clicked');
            if (!this.searchUrlBtn.disabled) {
                this.handleManualUrlSearch();
            } else {
                console.warn('⚠️ Search URL button is disabled');
            }
        });

        // Allow Enter key in URL input
        this.linkedinUrlInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!this.searchUrlBtn?.disabled) {
                    console.log('🔘 Enter key pressed in URL input');
                    this.handleManualUrlSearch();
                } else {
                    console.warn('⚠️ Search URL button is disabled');
                }
            }
        });

        // Sign In modal handlers (Sign In button handler moved to init() to avoid duplicate)
        this.closeSignInModal?.addEventListener('click', () => this.closeSignIn());
        this.cancelSignInBtn?.addEventListener('click', () => this.closeSignIn());
        this.submitSignInBtn?.addEventListener('click', () => this.handleSignIn());
        
        // Close sign-in modal on overlay click
        this.signInModal?.addEventListener('click', (e) => {
            if (e.target === this.signInModal) {
                this.closeSignIn();
            }
        });

        // Allow Enter key in phone number input
        this.phoneNumberInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSignIn();
            }
            // Only allow digits
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                e.preventDefault();
            }
        });

        // Format phone number input - only allow digits
        this.phoneNumberInput?.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) {
                value = value.slice(0, 10);
            }
            e.target.value = value;
        });

        // Message Box modal handlers
        this.closeMessageBoxModal?.addEventListener('click', () => this.closeMessageBox());
        this.cancelMessageBoxBtn?.addEventListener('click', () => this.closeMessageBox());
        this.sendMessageBtn?.addEventListener('click', () => this.handleSendMessage());
        
        // Close message box on overlay click
        this.messageBoxModal?.addEventListener('click', (e) => {
            if (e.target === this.messageBoxModal) {
                this.closeMessageBox();
            }
        });

        // Allow Ctrl+Enter to send message
        this.messageText?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // Validate URL input
        this.linkedinUrlInput?.addEventListener('input', () => {
            this.validateUrlInput();
        });

        // Prevent browser extension interference with LinkedIn URL input
        if (this.linkedinUrlInput) {
            try {
                Object.defineProperty(this.linkedinUrlInput, 'control', {
                    value: null,
                    writable: true,
                    configurable: true
                });
            } catch (e) {
                // Ignore if property can't be defined
            }
        }

        // Persistent "Profile not found" button
        this.showManualUrlBtnPersistent?.addEventListener('click', () => {
            this.showManualUrlInput();
        });

        // Create Manually button and modal handlers
        this.createManuallyBtn?.addEventListener('click', () => {
            this.openCreateManually();
        });
        this.closeCreateManuallyModal?.addEventListener('click', () => {
            this.closeCreateManually();
        });
        this.cancelCreateManuallyBtn?.addEventListener('click', () => {
            this.closeCreateManually();
        });
        // Protect button from browser extension interference
        if (this.submitCreateManuallyBtn) {
            // Define control property on button to prevent extension errors
            try {
                Object.defineProperty(this.submitCreateManuallyBtn, 'control', {
                    value: null,
                    writable: true,
                    configurable: true,
                    enumerable: false
                });
            } catch (e) {
                // Ignore
            }
            
            this.submitCreateManuallyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('🔘 Create Profile button clicked');
                this.handleCreateManually();
            }, { capture: true });
        }

        // Close create manually modal on overlay click
        this.createManuallyModal?.addEventListener('click', (e) => {
            if (e.target === this.createManuallyModal) {
                this.closeCreateManually();
            }
        });

        // Format phone number input - only allow digits
        this.manualPhoneNumberInput?.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) {
                value = value.slice(0, 10);
            }
            e.target.value = value;
        });

        // Allow Enter key in form inputs
        [this.firstNameInput, this.lastNameInput, this.bioInput, this.manualPhoneNumberInput].forEach(input => {
            input?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input === this.manualPhoneNumberInput) {
                        this.handleCreateManually();
                    }
                }
            });
        });
    }

    protectInputsFromExtensions() {
        // Protect all input fields from browser extension interference
        const inputs = [
            this.input,
            this.linkedinUrlInput,
            this.phoneNumberInput,
            this.profilePhoneNumberInput,
            this.firstNameInput,
            this.lastNameInput,
            this.bioInput,
            this.manualPhoneNumberInput,
            this.messageText
        ];

        inputs.forEach(input => {
            if (input) {
                try {
                    // Define control property to prevent extension errors
                    Object.defineProperty(input, 'control', {
                        value: null,
                        writable: true,
                        configurable: true
                    });
                } catch (e) {
                    // Ignore if property can't be defined
                }
            }
        });

        // Also protect inputs that might be added dynamically
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const inputs = node.querySelectorAll ? node.querySelectorAll('input, textarea') : [];
                        inputs.forEach(input => {
                            try {
                                Object.defineProperty(input, 'control', {
                                    value: null,
                                    writable: true,
                                    configurable: true
                                });
                            } catch (e) {
                                // Ignore
                            }
                        });
                    }
                });
            });
        });

        // Observe the document for new inputs
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    showManualUrlInput() {
        if (this.manualUrlContainer) {
            this.manualUrlContainer.style.display = 'block';
            setTimeout(() => {
                this.manualUrlContainer.classList.add('active');
                if (this.linkedinUrlInput) {
                    // Ensure input is enabled and clickable
                    this.linkedinUrlInput.disabled = false;
                    this.linkedinUrlInput.readOnly = false;
                    this.linkedinUrlInput.style.pointerEvents = 'auto';
                    this.linkedinUrlInput.style.cursor = 'text';
                    this.linkedinUrlInput.style.opacity = '1';
                    this.linkedinUrlInput.removeAttribute('readonly');
                    
                    // Prevent extension interference
                    try {
                        Object.defineProperty(this.linkedinUrlInput, 'control', {
                            value: null,
                            writable: true,
                            configurable: true
                        });
                    } catch (e) {
                        // Ignore if property can't be defined
                    }
                    
                    // Focus the input
                    try {
                        this.linkedinUrlInput.focus();
                        this.linkedinUrlInput.click();
                    } catch (e) {
                        // Ignore focus errors from browser extensions
                        console.log('Focus handled, extension interference prevented');
                    }
                }
            }, 10);
        }
    }

    hideManualUrlInput() {
        if (this.manualUrlContainer) {
            this.manualUrlContainer.classList.remove('active');
            setTimeout(() => {
                this.manualUrlContainer.style.display = 'none';
                if (this.linkedinUrlInput) {
                    this.linkedinUrlInput.value = '';
                }
            }, 300);
        }
    }

    validateUrlInput() {
        const url = this.linkedinUrlInput?.value.trim() || '';
        // More flexible validation - just check if it contains linkedin
        const isValid = url.length > 0 && url.toLowerCase().includes('linkedin');
        
        if (this.searchUrlBtn) {
            this.searchUrlBtn.disabled = !isValid;
        }
        
        console.log('URL validation:', { url, isValid });
    }

    async handleManualUrlSearch() {
        const url = this.linkedinUrlInput?.value.trim();
        if (!url || !url.toLowerCase().includes('linkedin')) {
            this.showError('Please enter a valid LinkedIn URL');
            if (this.linkedinUrlInput) {
                this.linkedinUrlInput.focus();
            }
            return;
        }
        
        console.log('🔍 Starting manual URL search for:', url);

        // Hide manual URL input
        this.hideManualUrlInput();

        // Show loading state
        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
        }
        if (this.resultLoading) {
            this.resultLoading.style.display = 'flex';
        }
        if (this.resultCard) {
            this.resultCard.innerHTML = '';
            this.resultCard.appendChild(this.resultLoading);
        }

        // Disable search button
        if (this.searchUrlBtn) {
            this.searchUrlBtn.disabled = true;
            this.searchUrlBtn.textContent = 'Searching...';
        }

        try {
            console.log('Searching LinkedIn URL via HasData API:', url);

            // Use the same HasData API as regular profile search
            // Build query: linkedin {url} to search for the URL
            const query = `linkedin ${url}`;

            const options = {
                method: 'GET',
                url: 'https://api.hasdata.com/scrape/google/serp',
                params: {
                    q: query,
                    location: 'United States',
                    lr: [],
                    deviceType: 'desktop'
                },
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            };

            console.log('API Request Options:', {
                url: options.url,
                params: options.params,
                headers: { ...options.headers, 'x-api-key': '***hidden***' }
            });

            const response = await axios.request(options);
            const data = response.data;

            console.log('HasData API Response for LinkedIn URL:', data);
            console.log('Response Status:', response.status);

            // Check if we got data
            if (!data) {
                throw new Error('No data received from API');
            }

            // Save search data to Firebase (with manual_url flag)
            try {
                // Override the input value temporarily for saveLinkedInSearchData
                const originalInputValue = this.input?.value;
                if (this.input) {
                    this.input.value = url; // Temporarily set for Firebase save
                }
                
                const searchData = {
                    ...data,
                    query: url,
                    searchType: 'manual_url',
                    originalQuery: query,
                    timestamp: new Date().toISOString()
                };
                
                // Save with custom data
                if (window.firebase && window.firebase.db) {
                    const { collection, addDoc, serverTimestamp } = window.firebase;
                    const searchDoc = {
                        searchQuery: url,
                        searchData: searchData,
                        searchType: 'manual_url',
                        timestamp: serverTimestamp(),
                        createdAt: new Date().toISOString(),
                        type: 'linkedin_search_all'
                    };
                    await addDoc(collection(window.firebase.db, 'linkedin_searches'), searchDoc);
                    console.log('✅ LinkedIn URL search saved to Firebase');
                }
                
                // Restore original input value
                if (this.input) {
                    this.input.value = originalInputValue || '';
                }
            } catch (firebaseError) {
                console.error('Error saving LinkedIn URL search to Firebase:', firebaseError);
                // Continue even if Firebase save fails
            }

            // Check if this is a URL search response with organicResults
            console.log('📊 Processing API response data...');
            console.log('Data keys:', Object.keys(data || {}));
            console.log('Has organicResults?', !!data?.organicResults);
            console.log('Has organic_results?', !!data?.organic_results);
            
            if (data?.organicResults && Array.isArray(data.organicResults) && data.organicResults.length > 0) {
                console.log('✅ Found organicResults, displaying:', data.organicResults.length, 'results');
                // Display organic results in simple list format
                await this.displayOrganicResults(data.organicResults);
            } else if (data?.organic_results && Array.isArray(data.organic_results) && data.organic_results.length > 0) {
                console.log('✅ Found organic_results, displaying:', data.organic_results.length, 'results');
                // Alternative format: organic_results
                await this.displayOrganicResults(data.organic_results);
            } else {
                console.log('📋 No organic results found, using displayResult');
                console.log('Data structure:', Object.keys(data || {}));
                // Process and display results (for regular name search)
                // This will handle inline_images and other result formats
                await this.displayResult(data);
            }

        } catch (error) {
            console.error('Error searching LinkedIn URL:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText
            });
            
            let errorMessage = 'Failed to search LinkedIn URL. Please try again.';
            
            if (error.response) {
                // Server responded with error
                errorMessage = error.response.data?.message 
                    || error.response.data?.error 
                    || `Server error: ${error.response.status} ${error.response.statusText}`;
            } else if (error.request) {
                // Request made but no response
                errorMessage = 'No response from server. Please check your connection.';
            } else {
                // Error setting up request
                errorMessage = error.message || 'Failed to search LinkedIn URL. Please try again.';
            }
            
            this.showError(errorMessage);
        } finally {
            if (this.searchUrlBtn) {
                this.searchUrlBtn.disabled = false;
                this.searchUrlBtn.textContent = 'Search';
            }
        }
    }

    async showProfileDetail(profile) {
        this.selectedProfile = profile;
        
        if (!this.profileDetailContainer) return;

        // Set profile data
        if (this.profileDetailTitle) {
            this.profileDetailTitle.textContent = profile.title || 'Profile';
        }

        if (this.profileDetailLink && profile.link) {
            this.profileDetailLink.href = profile.link;
        }

        // Save selected user profile to Firebase
        try {
            await this.saveUserProfile(profile);
        } catch (error) {
            console.error('Error saving user profile to Firebase:', error);
        }

        // Set thumbnail
        if (this.profileDetailThumbnail) {
            if (profile.thumbnail) {
                this.profileDetailThumbnail.innerHTML = `
                    <img src="${this.escapeHtml(profile.thumbnail)}" 
                         alt="${this.escapeHtml(profile.title)}"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="thumbnail-placeholder" style="display: none;">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                `;
            } else {
                this.profileDetailThumbnail.innerHTML = `
                    <div class="thumbnail-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                `;
            }
        }

        // Reset phone number input
        if (this.profilePhoneNumberInput) {
            this.profilePhoneNumberInput.value = '';
        }

        // Show profile detail
        this.profileDetailContainer.style.display = 'block';
        setTimeout(() => {
            this.profileDetailContainer.classList.add('active');
        }, 10);
    }

    closeProfileDetail() {
        if (this.profileDetailContainer) {
            this.profileDetailContainer.classList.remove('active');
            setTimeout(() => {
                this.profileDetailContainer.style.display = 'none';
            }, 300);
        }
        this.selectedProfile = null;
    }

    async openIMessage() {
        console.log('🔵 openIMessage called');
        
        if (!this.selectedProfile) {
            console.error('No profile selected');
            alert('No profile selected. Please try again.');
            return;
        }

        // Get and validate phone number
        let phoneNumber = this.profilePhoneNumberInput?.value.trim();
        
        if (!phoneNumber) {
            alert('Please enter your phone number for verification');
            if (this.profilePhoneNumberInput) {
                this.profilePhoneNumberInput.focus();
            }
            return;
        }

        // Remove any non-digit characters
        phoneNumber = phoneNumber.replace(/\D/g, '');
        
        // Validate 10 digits
        if (phoneNumber.length !== 10) {
            alert('Please enter a valid 10-digit phone number');
            if (this.profilePhoneNumberInput) {
                this.profilePhoneNumberInput.focus();
            }
            return;
        }

        // Format as E.164: +1 + 10 digits
        const formattedPhone = `+1${phoneNumber}`;
        console.log('✅ Phone number validated:', formattedPhone);

        // Save phone number to Firebase (don't wait for it to complete)
        this.saveUserPhoneNumber(formattedPhone).then(() => {
            console.log('✅ Phone number saved to Firebase:', formattedPhone);
        }).catch(error => {
            console.error('Error saving phone number to Firebase:', error);
            // Continue even if save fails
        });

        // Extract user name from profile
        let userName = this.selectedProfile.title || 'there';
        
        // Clean up the name - remove common suffixes like " - ", " | ", " at ", etc.
        if (userName.includes(' - ')) {
            userName = userName.split(' - ')[0].trim();
        } else if (userName.includes(' | ')) {
            userName = userName.split(' | ')[0].trim();
        } else if (userName.includes(' at ')) {
            userName = userName.split(' at ')[0].trim();
        }
        
        // If we still have a long title, try to extract just the first part (name)
        if (userName.length > 50) {
            userName = userName.split(',')[0].split('.')[0].trim();
        }
        
        // Fallback if name extraction fails
        if (!userName || userName.length === 0) {
            userName = 'there';
        }
        
        // Use Kafka phone number as the default recipient
        const kafkaPhoneNumber = this.kafkaPhoneNumber;
        const message = `Hey, I am ${userName}, feels lucky to be here.`;
        
        console.log('📱 Preparing to open iMessage...');
        console.log('   Recipient (Kafka phone):', kafkaPhoneNumber);
        console.log('   Message:', message);
        
        // Create iMessage/SMS URL (works on iOS/macOS)
        // Format: sms:+1234567890&body=message
        // Opens iMessage to the Kafka phone number by default
        const imessageUrl = `sms:${kafkaPhoneNumber}&body=${encodeURIComponent(message)}`;
        console.log('   URL:', imessageUrl);
        
        // Close profile detail modal first (with small delay to ensure it closes)
        this.closeProfileDetail();
        
        // Open iMessage after a short delay to ensure modal closes
        setTimeout(() => {
            try {
                console.log('🚀 Opening iMessage...');
                // Try multiple methods to ensure it works
                window.location.href = imessageUrl;
                
                // Fallback: try opening in new window/tab
                setTimeout(() => {
                    try {
                        window.open(imessageUrl, '_blank');
                    } catch (e2) {
                        console.error('Fallback open failed:', e2);
                    }
                }, 100);
            } catch (e) {
                console.error('Error opening iMessage:', e);
                // Fallback: Show instructions
                alert(`Please send this message to ${kafkaPhoneNumber}:\n\n${message}`);
            }
        }, 300);
    }

    // Save user phone number to Firebase
    async saveUserPhoneNumber(phoneNumber) {
        try {
            if (!window.firebase || !window.firebase.db) {
                console.warn('Firebase not initialized');
                return;
            }

            if (!this.selectedProfile) {
                console.warn('No profile selected');
                return;
            }

            const { collection, addDoc, serverTimestamp } = window.firebase;
            
            // Extract user name from profile
            let userName = this.selectedProfile.title || 'Unknown User';
            
            // Clean up the name
            if (userName.includes(' - ')) {
                userName = userName.split(' - ')[0].trim();
            } else if (userName.includes(' | ')) {
                userName = userName.split(' | ')[0].trim();
            } else if (userName.includes(' at ')) {
                userName = userName.split(' at ')[0].trim();
            }
            
            if (userName.length > 50) {
                userName = userName.split(',')[0].split('.')[0].trim();
            }
            
            // Prepare phone number data
            const phoneData = {
                phoneNumber: phoneNumber,
                userName: userName,
                profileTitle: this.selectedProfile.title || 'Unknown',
                profileLink: this.selectedProfile.link || '',
                profileThumbnail: this.selectedProfile.thumbnail || '',
                searchQuery: this.input?.value.trim() || 'Unknown',
                profileData: this.selectedProfile,
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString(),
                type: 'user_phone_verification'
            };

            // Save to 'users' collection
            const docRef = await addDoc(collection(window.firebase.db, 'users'), phoneData);
            console.log('✅ Phone number saved to users collection with ID:', docRef.id);
            
            return docRef.id;
        } catch (error) {
            console.error('Error saving phone number:', error);
            throw error;
        }
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Hide result container
            if (this.resultContainer) {
                this.resultContainer.style.display = 'none';
            }
            
            // Ensure input is enabled and clickable immediately
            if (this.input) {
                this.input.disabled = false;
                this.input.readOnly = false;
                this.input.style.pointerEvents = 'auto';
                this.input.style.cursor = 'text';
                this.input.style.opacity = '1';
                this.input.removeAttribute('readonly');
            }
            
            // Focus input after animation (with error handling for extensions)
            setTimeout(() => {
                try {
                    if (this.input) {
                        // Double-check input is enabled
                        this.input.disabled = false;
                        this.input.readOnly = false;
                        this.input.style.pointerEvents = 'auto';
                        this.input.style.cursor = 'text';
                        this.input.style.opacity = '1';
                        this.input.removeAttribute('readonly');
                        this.input.removeAttribute('autocomplete');
                        this.input.setAttribute('autocomplete', 'off');
                        this.input.setAttribute('data-lpignore', 'true');
                        this.input.setAttribute('data-form-type', 'other');
                        
                        // Prevent extension interference
                        try {
                            Object.defineProperty(this.input, 'control', {
                                value: null,
                                writable: true,
                                configurable: true
                            });
                        } catch (e) {
                            // Ignore if property can't be defined
                        }
                        
                        // Focus and select if there's existing text
                        this.input.focus();
                        this.input.click(); // Ensure it's clickable
                    }
                } catch (e) {
                    // Ignore focus errors from browser extensions
                    console.log('Focus handled, extension interference prevented');
                }
            }, 400);
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset input and results
            if (this.input) {
                this.input.value = '';
                this.validateInput();
            }
            if (this.resultContainer) {
                this.resultContainer.style.display = 'none';
            }
        }
    }

    validateInput() {
        const value = this.input?.value.trim() || '';
        const isValid = value.length >= 2; // At least 2 characters
        
        if (this.searchBtn) {
            this.searchBtn.disabled = !isValid;
        }
    }

    async handleSearch() {
        const name = this.input?.value.trim();
        if (!name || name.length < 2) {
            if (this.resultContainer) {
                this.resultContainer.style.display = 'none';
            }
            return;
        }

        // Show loading state
        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
        }
        if (this.resultLoading) {
            this.resultLoading.style.display = 'flex';
        }
        if (this.resultCard) {
            this.resultCard.innerHTML = '';
            this.resultCard.appendChild(this.resultLoading);
        }

        // Disable search button
        if (this.searchBtn) {
            this.searchBtn.disabled = true;
            this.searchBtn.textContent = 'Searching...';
        }

        try {
            // Build query: linkedin {query}
            const query = `linkedin ${name}`;

            console.log('Searching for:', query);

            const options = {
                method: 'GET',
                url: 'https://api.hasdata.com/scrape/google/serp',
                params: {
                    q: query,
                    location: 'United States',
                    lr: [],
                    deviceType: 'desktop'
                },
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            };
            
            console.log('API Request Options:', {
                url: options.url,
                params: options.params,
                headers: { ...options.headers, 'x-api-key': '***hidden***' }
            });

            const response = await axios.request(options);
            console.log('API Response:', response);
            console.log('Response Data:', response.data);
            console.log('Response Status:', response.status);
            
            // Check if we got data
            if (!response.data) {
                throw new Error('No data received from API');
            }
            
            // Show first result only
            this.displayResult(response.data);

        } catch (error) {
            console.error('Search error:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    params: error.config?.params
                }
            });
            
            let errorMessage = 'Failed to search. Please try again.';
            
            if (error.response) {
                // Server responded with error
                errorMessage = error.response.data?.message 
                    || error.response.data?.error 
                    || `Server error: ${error.response.status} ${error.response.statusText}`;
            } else if (error.request) {
                // Request made but no response
                errorMessage = 'No response from server. Please check your connection.';
            } else {
                // Error setting up request
                errorMessage = error.message || 'Failed to search. Please try again.';
            }
            
            this.showError(errorMessage);
        } finally {
            // Re-enable search button
            if (this.searchBtn) {
                this.searchBtn.disabled = false;
                this.searchBtn.textContent = 'Search';
            }
        }
    }

    async displayResult(data) {
        if (!this.resultCard) return;

        // Hide loading
        if (this.resultLoading) {
            this.resultLoading.style.display = 'none';
        }

        console.log('Processing data:', data);
        console.log('Full API Response:', JSON.stringify(data, null, 2));

        // Save all LinkedIn search data to Firebase
        try {
            await this.saveLinkedInSearchData(data);
        } catch (error) {
            console.error('Error saving LinkedIn search data to Firebase:', error);
        }

        // Extract inline images from the response
        let inlineImages = [];
        
        // Function to recursively search for inlineImages
        const extractInlineImages = (obj, path = '') => {
            if (!obj || typeof obj !== 'object') return;
            
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    extractInlineImages(item, `${path}[${index}]`);
                });
            } else {
                // Check if this object has inlineImages
                if (obj.inline_images && Array.isArray(obj.inline_images)) {
                    obj.inline_images.forEach((img, index) => {
                        if (img && (img.thumbnail || img.link)) {
                            inlineImages.push({
                                thumbnail: img.thumbnail || img.thumbnail_link || img.image || '',
                                link: img.link || img.url || '',
                                title: img.title || img.alt || obj.title || 'No title',
                                source: path
                            });
                        }
                    });
                }
                
                // Check if this object has inlineImages property (different structure)
                if (obj.inlineImages && Array.isArray(obj.inlineImages)) {
                    obj.inlineImages.forEach((img, index) => {
                        if (img && (img.thumbnail || img.link)) {
                            inlineImages.push({
                                thumbnail: img.thumbnail || img.thumbnail_link || img.image || '',
                                link: img.link || img.url || '',
                                title: img.title || img.alt || obj.title || 'No title',
                                source: path
                            });
                        }
                    });
                }
                
                // Recursively search nested objects
                Object.keys(obj).forEach(key => {
                    if (key !== 'inline_images' && key !== 'inlineImages') {
                        extractInlineImages(obj[key], path ? `${path}.${key}` : key);
                    }
                });
            }
        };

        extractInlineImages(data);
        console.log('Extracted inline images:', inlineImages);

        // Get unique inline images (deduplicate by thumbnail URL or title)
        const uniqueImages = [];
        const seen = new Set();
        
        inlineImages.forEach(img => {
            const identifier = img.thumbnail || img.title || img.link;
            if (identifier && !seen.has(identifier)) {
                seen.add(identifier);
                uniqueImages.push(img);
            }
        });

        console.log('Unique inline images:', uniqueImages);

        if (uniqueImages.length === 0) {
            console.log('No inline images found. Showing raw data structure.');
            
            // Try to show regular results as fallback
            let results = [];
            if (data?.organic_results && Array.isArray(data.organic_results) && data.organic_results.length > 0) {
                results = data.organic_results.slice(0, 3);
            } else if (data?.results && Array.isArray(data.results) && data.results.length > 0) {
                results = data.results.slice(0, 3);
            }

            if (results.length > 0) {
                const previewsHTML = results.map((result, index) => {
                    const position = index + 1;
                    return `
                        <div class="preview-card-item" data-position="${position}">
                            <div class="preview-number">${position}</div>
                            <div class="preview-content">
                                <h3 class="preview-title">${this.escapeHtml(result.title || result.name || 'No title')}</h3>
                                <a href="${this.escapeHtml(result.link || result.url || '#')}" target="_blank" class="preview-link">
                                    ${this.escapeHtml(result.link || result.url || 'No link')}
                                </a>
                            </div>
                        </div>
                    `;
                }).join('');

                this.resultCard.innerHTML = `<div class="previews-container">${previewsHTML}</div>`;
            } else {
                // No results found - show manual URL input option
                const noResultsHTML = `
                    <div class="no-results-container">
                        <div class="no-results-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <p class="no-results-text">No profiles found for your search.</p>
                        <button class="btn-manual-url" id="showManualUrlBtn">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="manual-url-icon">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Add LinkedIn URL Manually
                        </button>
                    </div>
                `;
                this.resultCard.innerHTML = noResultsHTML;

                // Add click handler for manual URL button
                const showManualUrlBtn = document.getElementById('showManualUrlBtn');
                if (showManualUrlBtn) {
                    showManualUrlBtn.addEventListener('click', () => {
                        this.showManualUrlInput();
                    });
                }
            }
            return;
        }

        // Create dropdown preview with thumbnails
        this.createDropdownPreview(uniqueImages);
    }

    async displayOrganicResults(organicResults) {
        if (!organicResults || !Array.isArray(organicResults) || organicResults.length === 0) {
            this.showError('No results found.');
            return;
        }

        // Hide loading state
        if (this.resultLoading) {
            this.resultLoading.style.display = 'none';
        }

        // Save all organic results to Firebase
        try {
            await this.saveLinkedInSearchData({ organicResults: organicResults });
        } catch (error) {
            console.error('Error saving organic results to Firebase:', error);
        }

        // Create simple list format
        const resultsHTML = organicResults.map((result, index) => {
            const position = result.position || (index + 1);
            const title = this.escapeHtml(result.title || 'No title');
            const link = this.escapeHtml(result.link || '#');
            // Store profile data for click handler - properly escape for HTML attribute
            const profileObj = {
                title: result.title || 'No title',
                link: result.link || '#',
                thumbnail: result.thumbnail || null
            };
            const profileData = JSON.stringify(profileObj).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            
            return `
                <div class="organic-result-item" data-position="${position}" data-profile="${profileData}">
                    <div class="organic-result-position">${position}</div>
                    <div class="organic-result-content">
                        <div class="organic-result-title">${title}</div>
                        <a href="${link}" target="_blank" rel="noopener noreferrer" class="organic-result-link" onclick="event.stopPropagation();">${link}</a>
                    </div>
                </div>
            `;
        }).join('');

        const resultHTML = `
            <div class="organic-results-container">
                <div class="organic-results-list">
                    ${resultsHTML}
                </div>
            </div>
        `;

        if (this.resultCard) {
            this.resultCard.innerHTML = resultHTML;
        }

        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
        }

        // Add click handlers to organic result items
        const organicResultItems = this.resultCard.querySelectorAll('.organic-result-item');
        organicResultItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking directly on links - let them open in new tab
                if (e.target.tagName === 'A' || e.target.closest('a')) {
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                // Re-enable cursor on input after click
                if (this.input) {
                    this.input.style.cursor = 'text';
                    this.input.disabled = false;
                }
                
                const profileData = item.getAttribute('data-profile');
                if (profileData) {
                    try {
                        // Decode HTML entities before parsing JSON
                        const decodedData = profileData.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                        const profile = JSON.parse(decodedData);
                        console.log('Opening profile detail for organic result:', profile);
                        this.showProfileDetail(profile);
                    } catch (e) {
                        console.error('Error parsing profile data:', e, 'Raw data:', profileData);
                    }
                } else {
                    console.error('No profile data found on organic result item');
                }
            });
        });
    }

    createDropdownPreview(images) {
        // Limit to first 12 unique images for better display
        const displayImages = images.slice(0, 12);
        
        const previewsHTML = displayImages.map((img, index) => {
            // Add stagger animation delay
            const animationDelay = index * 0.05;
            // Escape JSON for HTML attribute (escape quotes and special chars)
            const profileData = JSON.stringify(img).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            
            return `
                <div class="dropdown-preview-item" data-index="${index}" 
                     style="animation-delay: ${animationDelay}s; opacity: 0; animation: fadeInUp 0.4s ease-out ${animationDelay}s forwards;"
                     data-profile="${profileData}">
                    <div class="preview-thumbnail">
                        ${img.thumbnail ? `
                            <img src="${this.escapeHtml(img.thumbnail)}" 
                                 alt="${this.escapeHtml(img.title)}" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                 loading="lazy">
                            <div class="thumbnail-placeholder" style="display: none;">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                        ` : `
                            <div class="thumbnail-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                        `}
                    </div>
                    <div class="preview-info">
                        <h4 class="preview-item-title">${this.escapeHtml(img.title)}</h4>
                    </div>
                </div>
            `;
        }).join('');

        const resultHTML = `
            <div class="dropdown-preview-container">
                <div class="dropdown-preview-list">
                    ${previewsHTML}
                </div>
            </div>
        `;

        this.resultCard.innerHTML = resultHTML;

        // Add click handlers to preview items
        const previewItems = this.resultCard.querySelectorAll('.dropdown-preview-item');
        previewItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Re-enable cursor on input after click
                if (this.input) {
                    this.input.style.cursor = 'text';
                    this.input.disabled = false;
                }
                
                const profileData = item.getAttribute('data-profile');
                if (profileData) {
                    try {
                        const profile = JSON.parse(profileData);
                        this.showProfileDetail(profile);
                    } catch (e) {
                        console.error('Error parsing profile data:', e);
                    }
                }
            });
        });

        // Ensure input remains focusable after results are displayed
        if (this.input) {
            this.input.style.pointerEvents = 'auto';
            this.input.style.cursor = 'text';
        }
    }

    showError(message) {
        if (!this.resultCard) return;

        if (this.resultLoading) {
            this.resultLoading.style.display = 'none';
        }

        this.resultCard.innerHTML = `
            <div class="result-item">
                <p class="result-snippet" style="color: var(--text-tertiary); text-align: center; padding: var(--spacing-lg);">
                    ${this.escapeHtml(message)}
                </p>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Detect API server URL by trying common ports
    async detectApiServerUrl() {
        const commonPorts = [8000, 3000, 8080, 5000];
        const baseUrl = window.location.origin.includes('localhost') 
            ? 'http://localhost' 
            : window.location.origin;
        
        // Try to find which port the API server is running on
        for (const port of commonPorts) {
            try {
                const testUrl = `${baseUrl.split(':')[0]}:${port}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);
                
                const response = await fetch(`${testUrl}/api/health`, {
                    method: 'GET',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    console.log(`✅ Found API server on port ${port}`);
                    return testUrl;
                }
            } catch (error) {
                // Port not available, try next
                continue;
            }
        }
        
        // Default fallback
        console.warn('⚠️ Could not detect API server, using default port 8000');
        return 'http://localhost:8000';
    }

    // Sign In functionality
    openSignIn() {
        if (this.signInModal) {
            this.signInModal.style.display = 'flex';
            setTimeout(() => {
                this.signInModal.classList.add('active');
            }, 10);
            // Focus on phone input
            setTimeout(() => {
                this.phoneNumberInput?.focus();
            }, 100);
        }
    }

    closeSignIn() {
        if (this.signInModal) {
            this.signInModal.classList.remove('active');
            setTimeout(() => {
                this.signInModal.style.display = 'none';
                // Reset form
                if (this.phoneNumberInput) {
                    this.phoneNumberInput.value = '';
                }
                this.hideSignInStatus();
            }, 300);
        }
    }

    hideSignInStatus() {
        if (this.signInStatus) {
            this.signInStatus.style.display = 'none';
        }
        if (this.signInLoading) {
            this.signInLoading.style.display = 'none';
        }
        if (this.signInMessage) {
            this.signInMessage.style.display = 'none';
            this.signInMessage.textContent = '';
        }
    }

    showSignInLoading() {
        if (this.signInStatus) {
            this.signInStatus.style.display = 'block';
        }
        if (this.signInLoading) {
            this.signInLoading.style.display = 'flex';
        }
        if (this.signInMessage) {
            this.signInMessage.style.display = 'none';
        }
    }

    showSignInMessage(message, isError = false) {
        if (this.signInStatus) {
            this.signInStatus.style.display = 'block';
        }
        if (this.signInLoading) {
            this.signInLoading.style.display = 'none';
        }
        if (this.signInMessage) {
            this.signInMessage.style.display = 'block';
            this.signInMessage.textContent = message;
            this.signInMessage.style.background = isError 
                ? 'rgba(255, 59, 48, 0.1)' 
                : 'rgba(0, 122, 255, 0.1)';
            this.signInMessage.style.color = isError 
                ? 'var(--system-red, #ff3b30)' 
                : 'var(--system-blue)';
        }
    }

    async handleSignIn() {
        let phoneNumber = this.phoneNumberInput?.value.trim();
        
        if (!phoneNumber) {
            this.showSignInMessage('Please enter a phone number', true);
            return;
        }

        // Remove any non-digit characters
        phoneNumber = phoneNumber.replace(/\D/g, '');
        
        // Validate 10 digits
        if (phoneNumber.length !== 10) {
            this.showSignInMessage('Please enter a valid 10-digit phone number', true);
            return;
        }

        // Format as E.164: +1 + 10 digits
        const formattedPhone = `+1${phoneNumber}`;

        this.showSignInLoading();
        this.submitSignInBtn.disabled = true;

        try {
            // First, check if phone number exists in Firestore users collection
            console.log('Checking phone number in Firestore users collection:', formattedPhone);
            
            if (!window.firebase || !window.firebase.db) {
                throw new Error('Firebase not initialized');
            }

            const { collection, query, where, getDocs } = window.firebase;
            
            // Query Firestore for users with this phone number
            const usersRef = collection(window.firebase.db, 'users');
            const q = query(usersRef, where('phoneNumber', '==', formattedPhone));
            const querySnapshot = await getDocs(q);

            console.log('Firestore query result:', querySnapshot.size, 'documents found');

            if (!querySnapshot.empty) {
                // Phone number exists in Firestore - navigate to matching page
                console.log('✅ Phone number found in Firestore, navigating to matching page');
                
                // Get the first matching user document
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                
                console.log('📦 Storing in sessionStorage:', {
                    phoneNumber: formattedPhone,
                    hasUserData: !!userData,
                    userId: userDoc.id
                });
                
                // Store phone number and user data in sessionStorage for matching page
                sessionStorage.setItem('phoneNumber', formattedPhone);
                sessionStorage.setItem('userData', JSON.stringify({
                    id: userDoc.id,
                    ...userData
                }));
                
                // Verify storage
                const storedPhone = sessionStorage.getItem('phoneNumber');
                const storedData = sessionStorage.getItem('userData');
                console.log('✅ Verified sessionStorage:', {
                    phoneStored: storedPhone === formattedPhone,
                    dataStored: !!storedData
                });
                
                // Close sign-in modal
                this.closeSignIn();
                
                // Small delay to ensure modal closes
                setTimeout(() => {
                    console.log('🚀 Navigating to /matching...');
                    window.location.href = '/matching';
                }, 100);
                return;
            } else {
                // Phone number not found in Firestore - show error
                console.log('❌ Phone number not found in Firestore');
                console.log('   Searched for:', formattedPhone);
                this.showSignInMessage('Phone number not found. Please check your number or create a profile first.', true);
            }
        } catch (error) {
            console.error('Sign in error:', error);
            
            // Fallback: try checking in chats API
            try {
                console.log('Kafka check failed, trying chats API...');
                const checkResponse = await axios.get(`${this.apiBaseUrl}/api/chats`, {
                    params: {
                        phone_number: formattedPhone
                    }
                });

                console.log('API Response:', checkResponse.data);

                // Handle different response structures
                let chats = [];
                
                // Try multiple response structures
                if (checkResponse.data?.data) {
                    if (Array.isArray(checkResponse.data.data)) {
                        chats = checkResponse.data.data;
                    } else if (checkResponse.data.data.chats && Array.isArray(checkResponse.data.data.chats)) {
                        chats = checkResponse.data.data.chats;
                    } else if (checkResponse.data.data.id) {
                        // Single chat object
                        chats = [checkResponse.data.data];
                    } else if (typeof checkResponse.data.data === 'object') {
                        // Might be a single chat object
                        chats = [checkResponse.data.data];
                    }
                }
                
                // Also check direct response
                if (chats.length === 0 && checkResponse.data?.chats) {
                    chats = Array.isArray(checkResponse.data.chats) ? checkResponse.data.chats : [checkResponse.data.chats];
                }
                
                // Check if response.data itself is an array
                if (chats.length === 0 && Array.isArray(checkResponse.data)) {
                    chats = checkResponse.data;
                }

                console.log('Parsed chats:', chats);
                
                if (chats.length > 0) {
                    // Phone number exists - send welcome message and open iMessage
                    const chat = chats[0];
                    this.currentChatId = chat.id || chat.chat_id;
                    this.currentPhoneNumber = formattedPhone;
                    
                    console.log('Found chat:', chat);
                    console.log('Chat ID:', this.currentChatId);
                    
                    // Send welcome message automatically
                    const messageSent = await this.sendWelcomeMessage(formattedPhone);
                    
                    // Close sign-in modal
                    this.closeSignIn();
                    
                    // Open iMessage app
                    if (messageSent) {
                        setTimeout(() => {
                            this.openIMessageApp();
                        }, 500);
                    } else {
                        // Still open iMessage even if message send failed
                        setTimeout(() => {
                            this.openIMessageApp();
                        }, 500);
                    }
                    return;
                } else {
                // Phone number doesn't exist in first check - try alternative endpoints
                console.log('No chats found in first check, trying alternative methods...');
                
                // Try findChat endpoint
                try {
                    const findResponse = await axios.get(`${this.apiBaseUrl}/api/chats/find`, {
                        params: {
                            phone_number: formattedPhone
                        }
                    });
                    
                    console.log('Find chat response:', findResponse.data);
                    
                    let foundChat = findResponse.data?.data;
                    if (!foundChat && findResponse.data?.id) {
                        foundChat = findResponse.data;
                    }
                    
                    if (foundChat && (foundChat.id || foundChat.chat_id)) {
                        this.currentChatId = foundChat.id || foundChat.chat_id;
                        this.currentPhoneNumber = formattedPhone;
                        
                        console.log('Found chat via find endpoint:', foundChat);
                        console.log('Chat ID:', this.currentChatId);
                        
                        // Send welcome message automatically
                        const messageSent = await this.sendWelcomeMessage(formattedPhone);
                        
                        // Close sign-in modal
                        this.closeSignIn();
                        
                        // Open iMessage app
                        setTimeout(() => {
                            this.openIMessageApp();
                        }, 500);
                        return;
                    }
                } catch (findError) {
                    console.error('Find chat error:', findError);
                }
                
                // Try getting all chats and filtering client-side
                try {
                    const allChatsResponse = await axios.get(`${this.apiBaseUrl}/api/chats`);
                    console.log('All chats response:', allChatsResponse.data);
                    
                    let allChats = [];
                    if (allChatsResponse.data?.data) {
                        allChats = Array.isArray(allChatsResponse.data.data) 
                            ? allChatsResponse.data.data 
                            : [allChatsResponse.data.data];
                    } else if (Array.isArray(allChatsResponse.data)) {
                        allChats = allChatsResponse.data;
                    }
                    
                    // Search for phone number in chat participants
                    const matchingChat = allChats.find(chat => {
                        if (chat.phone_numbers && Array.isArray(chat.phone_numbers)) {
                            return chat.phone_numbers.some(phone => 
                                phone === formattedPhone || 
                                phone.replace(/\D/g, '') === formattedPhone.replace(/\D/g, '')
                            );
                        }
                        return false;
                    });
                    
                    if (matchingChat && (matchingChat.id || matchingChat.chat_id)) {
                        this.currentChatId = matchingChat.id || matchingChat.chat_id;
                        this.currentPhoneNumber = formattedPhone;
                        
                        console.log('Found chat via all chats search:', matchingChat);
                        console.log('Chat ID:', this.currentChatId);
                        
                        // Send welcome message automatically
                        const messageSent = await this.sendWelcomeMessage(formattedPhone);
                        
                        // Close sign-in modal
                        this.closeSignIn();
                        
                        // Open iMessage app
                        setTimeout(() => {
                            this.openIMessageApp();
                        }, 500);
                        return;
                    }
                } catch (allChatsError) {
                    console.error('Get all chats error:', allChatsError);
                }
                
                // If we get here, number wasn't found - try to get all chats and use the most recent one
                console.log('Chat not found for phone number, getting all chats...');
                try {
                    const allChatsResponse = await axios.get(`${this.apiBaseUrl}/api/chats`);
                    console.log('All chats response:', allChatsResponse.data);
                    
                    let allChats = [];
                    if (allChatsResponse.data?.data) {
                        allChats = Array.isArray(allChatsResponse.data.data) 
                            ? allChatsResponse.data.data 
                            : [allChatsResponse.data.data];
                    } else if (Array.isArray(allChatsResponse.data)) {
                        allChats = allChatsResponse.data;
                    }
                    
                    if (allChats.length > 0) {
                        // Use the first/most recent chat
                        const chatToUse = allChats[0];
                        this.currentChatId = chatToUse.id || chatToUse.chat_id;
                        this.currentPhoneNumber = formattedPhone;
                        
                        console.log('✅ Using existing chat ID:', this.currentChatId);
                        
                        // Send welcome message
                        const messageSent = await this.sendWelcomeMessage(formattedPhone);
                        
                        // Close sign-in modal
                        this.closeSignIn();
                        
                        // Open iMessage app
                        setTimeout(() => {
                            this.openIMessageApp();
                        }, 500);
                        return;
                    } else {
                        // No chats exist, create a new one
                        console.log('No existing chats found, creating new chat for:', formattedPhone);
                        const createResponse = await axios.post(`${this.apiBaseUrl}/api/chats`, {
                            send_from: this.kafkaPhoneNumber,
                            chat: {
                                phone_numbers: [formattedPhone]
                            },
                            message: {
                                text: 'Hey, It\'s good to see you back'
                            }
                        });
                        
                        console.log('Create chat response:', createResponse.data);
                        
                        const newChat = createResponse.data?.data;
                        if (newChat && (newChat.id || newChat.chat_id)) {
                            this.currentChatId = newChat.id || newChat.chat_id;
                            this.currentPhoneNumber = formattedPhone;
                            
                            console.log('✅ New chat created with ID:', this.currentChatId);
                            
                            // Close sign-in modal
                            this.closeSignIn();
                            
                            // Open iMessage app
                            setTimeout(() => {
                                this.openIMessageApp();
                            }, 500);
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Error getting all chats or creating chat:', error);
                }
                
                // Final fallback - show error
                this.showSignInMessage('Unable to find or create chat. Please try again.', true);
                }
            } catch (fallbackError) {
                console.error('Fallback sign in error:', fallbackError);
                const errorMessage = fallbackError.response?.data?.message || fallbackError.message || 'An error occurred. Please try again.';
                this.showSignInMessage(errorMessage, true);
            }
        } finally {
            this.submitSignInBtn.disabled = false;
        }
    }

    // Message Box functionality
    openMessageBox(phoneNumber) {
        if (this.messageBoxModal) {
            // Set phone number display
            if (this.messageBoxPhoneNumber) {
                this.messageBoxPhoneNumber.textContent = phoneNumber || this.kafkaPhoneNumber;
            }
            
            this.messageBoxModal.style.display = 'flex';
            setTimeout(() => {
                this.messageBoxModal.classList.add('active');
            }, 10);
            
            // Focus on message input
            setTimeout(() => {
                this.messageText?.focus();
            }, 100);
        }
    }

    closeMessageBox() {
        if (this.messageBoxModal) {
            this.messageBoxModal.classList.remove('active');
            setTimeout(() => {
                this.messageBoxModal.style.display = 'none';
                // Reset form
                if (this.messageText) {
                    this.messageText.value = '';
                }
                this.hideMessageBoxStatus();
                this.currentChatId = null;
                this.currentPhoneNumber = null;
            }, 300);
        }
    }

    hideMessageBoxStatus() {
        if (this.messageBoxStatus) {
            this.messageBoxStatus.style.display = 'none';
        }
        if (this.messageBoxLoading) {
            this.messageBoxLoading.style.display = 'none';
        }
        if (this.messageBoxMessage) {
            this.messageBoxMessage.style.display = 'none';
            this.messageBoxMessage.textContent = '';
        }
    }

    showMessageBoxLoading() {
        if (this.messageBoxStatus) {
            this.messageBoxStatus.style.display = 'block';
        }
        if (this.messageBoxLoading) {
            this.messageBoxLoading.style.display = 'flex';
        }
        if (this.messageBoxMessage) {
            this.messageBoxMessage.style.display = 'none';
        }
    }

    showMessageBoxMessage(message, isError = false) {
        if (this.messageBoxStatus) {
            this.messageBoxStatus.style.display = 'block';
        }
        if (this.messageBoxLoading) {
            this.messageBoxLoading.style.display = 'none';
        }
        if (this.messageBoxMessage) {
            this.messageBoxMessage.style.display = 'block';
            this.messageBoxMessage.textContent = message;
            this.messageBoxMessage.style.background = isError 
                ? 'rgba(255, 59, 48, 0.1)' 
                : 'rgba(0, 122, 255, 0.1)';
            this.messageBoxMessage.style.color = isError 
                ? 'var(--system-red, #ff3b30)' 
                : 'var(--system-blue)';
        }
    }

    async sendWelcomeMessage(phoneNumber) {
        if (!this.currentChatId) {
            console.error('No chat ID available to send welcome message');
            console.error('Current chat ID:', this.currentChatId);
            console.error('Phone number:', phoneNumber);
            return false;
        }

        try {
            console.log(`📤 Sending welcome message to ${phoneNumber} (Chat ID: ${this.currentChatId})`);
            
            const sendResponse = await axios.post(`${this.apiBaseUrl}/api/reply`, {
                chatId: String(this.currentChatId), // Ensure it's a string
                message: 'Hey, It\'s good to see you back'
            });

            if (sendResponse.data?.success) {
                console.log('✅ Welcome message sent successfully to', phoneNumber);
                return true;
            } else {
                console.warn('⚠️ Welcome message may not have been sent:', sendResponse.data);
                return false;
            }
        } catch (error) {
            console.error('Error sending welcome message:', error);
            if (error.response) {
                console.error('Error details:', error.response.data);
            }
            return false;
        }
    }

    openIMessageApp() {
        // Open iMessage with the Kafka phone number (default recipient)
        const kafkaPhoneNumber = this.kafkaPhoneNumber;
        
        // Create iMessage/SMS URL
        // Format: sms:+1234567890
        // Opens iMessage to the Kafka phone number by default
        const imessageUrl = `sms:${kafkaPhoneNumber}`;
        
        try {
            // Try to open iMessage
            window.location.href = imessageUrl;
            console.log('📱 Opening iMessage to Kafka phone number:', kafkaPhoneNumber);
        } catch (error) {
            console.error('Error opening iMessage:', error);
            // Fallback: Show instructions
            alert(`Please open iMessage and send a message to ${kafkaPhoneNumber}`);
        }
    }

    // Save LinkedIn search data to Firebase (all results)
    async saveLinkedInSearchData(data) {
        try {
            if (!window.firebase || !window.firebase.db) {
                console.warn('Firebase not initialized');
                return;
            }

            const { collection, addDoc, serverTimestamp } = window.firebase;
            
            // Extract search query from input
            const searchQuery = this.input?.value.trim() || 'Unknown';
            
            // Prepare document data
            const searchData = {
                searchQuery: searchQuery,
                searchData: data,
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString(),
                type: 'linkedin_search_all'
            };

            // Save to 'linkedin_searches' collection
            const docRef = await addDoc(collection(window.firebase.db, 'linkedin_searches'), searchData);
            console.log('✅ LinkedIn search data saved to Firebase with ID:', docRef.id);
            
            return docRef.id;
        } catch (error) {
            console.error('Error saving LinkedIn search data:', error);
            throw error;
        }
    }

    // Save selected user profile to Firebase (user's info)
    async saveUserProfile(profile) {
        try {
            if (!window.firebase || !window.firebase.db) {
                console.warn('Firebase not initialized');
                return;
            }

            const { collection, addDoc, serverTimestamp } = window.firebase;
            
            // Extract user name from profile title
            let userName = profile.title || 'Unknown User';
            
            // Clean up the name - remove common suffixes
            if (userName.includes(' - ')) {
                userName = userName.split(' - ')[0].trim();
            } else if (userName.includes(' | ')) {
                userName = userName.split(' | ')[0].trim();
            } else if (userName.includes(' at ')) {
                userName = userName.split(' at ')[0].trim();
            }
            
            // If we still have a long title, try to extract just the first part (name)
            if (userName.length > 50) {
                userName = userName.split(',')[0].split('.')[0].trim();
            }
            
            // Prepare user profile data
            const userProfileData = {
                userName: userName,
                profileTitle: profile.title || 'Unknown',
                profileLink: profile.link || '',
                thumbnail: profile.thumbnail || '',
                searchQuery: this.input?.value.trim() || 'Unknown',
                profileData: profile,
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString(),
                type: 'linkedin_user_profile'
            };

            // Save to 'linkedin_users' collection
            const linkedinDocRef = await addDoc(collection(window.firebase.db, 'linkedin_users'), userProfileData);
            console.log('✅ User profile saved to linkedin_users collection with ID:', linkedinDocRef.id);
            
            // Also save to 'users' collection
            const userDocRef = await addDoc(collection(window.firebase.db, 'users'), userProfileData);
            console.log('✅ User profile saved to users collection with ID:', userDocRef.id);
            console.log('✅ User name saved:', userName);
            
            return { linkedinDocId: linkedinDocRef.id, userDocId: userDocRef.id };
        } catch (error) {
            console.error('Error saving user profile:', error);
            throw error;
        }
    }

    // Create Manually functionality
    openCreateManually() {
        if (this.createManuallyModal) {
            this.createManuallyModal.style.display = 'flex';
            setTimeout(() => {
                this.createManuallyModal.classList.add('active');
            }, 10);
            
            // Protect all inputs in the modal from browser extensions
            const modalInputs = [
                this.firstNameInput,
                this.lastNameInput,
                this.bioInput,
                this.manualPhoneNumberInput
            ];
            
            modalInputs.forEach(input => {
                if (input) {
                    try {
                        Object.defineProperty(input, 'control', {
                            value: null,
                            writable: true,
                            configurable: true,
                            enumerable: false
                        });
                    } catch (e) {
                        // Ignore
                    }
                }
            });
            
            // Protect the submit button
            if (this.submitCreateManuallyBtn) {
                try {
                    Object.defineProperty(this.submitCreateManuallyBtn, 'control', {
                        value: null,
                        writable: true,
                        configurable: true,
                        enumerable: false
                    });
                } catch (e) {
                    // Ignore
                }
            }
            
            // Focus on first name input
            setTimeout(() => {
                this.firstNameInput?.focus();
            }, 100);
        }
    }

    closeCreateManually() {
        if (this.createManuallyModal) {
            this.createManuallyModal.classList.remove('active');
            setTimeout(() => {
                this.createManuallyModal.style.display = 'none';
                // Reset form
                if (this.firstNameInput) this.firstNameInput.value = '';
                if (this.lastNameInput) this.lastNameInput.value = '';
                if (this.bioInput) this.bioInput.value = '';
                if (this.manualPhoneNumberInput) this.manualPhoneNumberInput.value = '';
                this.hideCreateManuallyStatus();
            }, 300);
        }
    }

    hideCreateManuallyStatus() {
        if (this.createManuallyStatus) {
            this.createManuallyStatus.style.display = 'none';
        }
        if (this.createManuallyLoading) {
            this.createManuallyLoading.style.display = 'none';
        }
        if (this.createManuallyMessage) {
            this.createManuallyMessage.style.display = 'none';
            this.createManuallyMessage.textContent = '';
        }
    }

    showCreateManuallyLoading() {
        if (this.createManuallyStatus) {
            this.createManuallyStatus.style.display = 'block';
        }
        if (this.createManuallyLoading) {
            this.createManuallyLoading.style.display = 'flex';
        }
        if (this.createManuallyMessage) {
            this.createManuallyMessage.style.display = 'none';
        }
    }

    showCreateManuallyMessage(message, isError = false) {
        if (this.createManuallyStatus) {
            this.createManuallyStatus.style.display = 'block';
        }
        if (this.createManuallyLoading) {
            this.createManuallyLoading.style.display = 'none';
        }
        if (this.createManuallyMessage) {
            this.createManuallyMessage.style.display = 'block';
            this.createManuallyMessage.textContent = message;
            this.createManuallyMessage.style.background = isError 
                ? 'rgba(255, 59, 48, 0.1)' 
                : 'rgba(0, 122, 255, 0.1)';
            this.createManuallyMessage.style.color = isError 
                ? 'var(--system-red, #ff3b30)' 
                : 'var(--system-blue)';
        }
    }

    async handleCreateManually() {
        const firstName = this.firstNameInput?.value.trim();
        const lastName = this.lastNameInput?.value.trim();
        const bio = this.bioInput?.value.trim();
        let phoneNumber = this.manualPhoneNumberInput?.value.trim();

        // Validate inputs
        if (!firstName) {
            this.showCreateManuallyMessage('Please enter your first name', true);
            this.firstNameInput?.focus();
            return;
        }

        if (!lastName) {
            this.showCreateManuallyMessage('Please enter your last name', true);
            this.lastNameInput?.focus();
            return;
        }

        if (!phoneNumber) {
            this.showCreateManuallyMessage('Please enter your phone number', true);
            this.manualPhoneNumberInput?.focus();
            return;
        }

        // Remove any non-digit characters
        phoneNumber = phoneNumber.replace(/\D/g, '');
        
        // Validate 10 digits
        if (phoneNumber.length !== 10) {
            this.showCreateManuallyMessage('Please enter a valid 10-digit phone number', true);
            this.manualPhoneNumberInput?.focus();
            return;
        }

        // Format as E.164: +1 + 10 digits
        const formattedPhone = `+1${phoneNumber}`;
        const fullName = `${firstName} ${lastName}`;

        this.showCreateManuallyLoading();
        this.submitCreateManuallyBtn.disabled = true;

        try {
            // Save profile to Firebase
            await this.saveManualProfileToFirebase({
                firstName,
                lastName,
                fullName,
                bio,
                phoneNumber: formattedPhone
            });

            console.log('✅ Profile saved to Firebase');

            // Close modals
            this.closeCreateManually();
            this.close();

            // Open iMessage
            setTimeout(() => {
                this.openIMessageForManualProfile(fullName, formattedPhone);
            }, 500);

        } catch (error) {
            console.error('Error creating manual profile:', error);
            const errorMessage = error.message || 'An error occurred. Please try again.';
            this.showCreateManuallyMessage(errorMessage, true);
        } finally {
            this.submitCreateManuallyBtn.disabled = false;
        }
    }

    async saveManualProfileToFirebase(profileData) {
        try {
            console.log('🔵 saveManualProfileToFirebase called with:', profileData);
            
            if (!window.firebase || !window.firebase.db) {
                console.error('❌ Firebase not initialized');
                throw new Error('Firebase not initialized. Please refresh the page.');
            }

            const { collection, addDoc, serverTimestamp } = window.firebase;
            
            if (!collection || !addDoc || !serverTimestamp) {
                console.error('❌ Firebase functions not available:', { collection: !!collection, addDoc: !!addDoc, serverTimestamp: !!serverTimestamp });
                throw new Error('Firebase functions not available. Please refresh the page.');
            }
            
            const profileDoc = {
                firstName: profileData.firstName,
                lastName: profileData.lastName,
                fullName: profileData.fullName,
                bio: profileData.bio || '',
                phoneNumber: profileData.phoneNumber,
                profileType: 'manual',
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString(),
                type: 'manual_user_profile'
            };

            console.log('📝 Preparing to save document:', profileDoc);

            // Save to 'users' collection in Firestore
            const usersCollection = collection(window.firebase.db, 'users');
            console.log('📦 Collection reference created');
            
            const docRef = await addDoc(usersCollection, profileDoc);
            console.log('✅ Manual profile saved to Firestore');
            console.log('   Collection: users');
            console.log('   Document ID:', docRef.id);
            console.log('   Data:', {
                firstName: profileData.firstName,
                lastName: profileData.lastName,
                fullName: profileData.fullName,
                phoneNumber: profileData.phoneNumber,
                profileType: 'manual'
            });
            
            return docRef.id;
        } catch (error) {
            console.error('❌ Error saving manual profile to Firebase:', error);
            console.error('   Error name:', error.name);
            console.error('   Error message:', error.message);
            console.error('   Error stack:', error.stack);
            console.error('   Collection: users');
            
            // Provide more helpful error messages
            if (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED')) {
                throw new Error('Permission denied. Please check Firebase security rules.');
            } else if (error.message.includes('network') || error.message.includes('Network')) {
                throw new Error('Network error. Please check your internet connection.');
            } else {
                throw new Error(`Failed to save profile: ${error.message}`);
            }
        }
    }

    openIMessageForManualProfile(userName, phoneNumber) {
        // Use Kafka phone number as the default recipient
        const kafkaPhoneNumber = this.kafkaPhoneNumber;
        const message = `Hey, I am ${userName}, feels lucky to be here.`;
        
        // Create iMessage/SMS URL
        // Opens iMessage to the Kafka phone number by default
        const imessageUrl = `sms:${kafkaPhoneNumber}&body=${encodeURIComponent(message)}`;
        
        try {
            window.location.href = imessageUrl;
            console.log('📱 Opening iMessage for manual profile to Kafka number:', kafkaPhoneNumber);
        } catch (error) {
            console.error('Error opening iMessage:', error);
            alert(`Please send this message to ${kafkaPhoneNumber}:\n\n${message}`);
        }
    }

    async handleSendMessage() {
        const message = this.messageText?.value.trim();
        
        if (!message) {
            this.showMessageBoxMessage('Please enter a message', true);
            return;
        }

        if (!this.currentChatId) {
            this.showMessageBoxMessage('Chat ID not found. Please sign in again.', true);
            return;
        }

        this.showMessageBoxLoading();
        this.sendMessageBtn.disabled = true;

        try {
            const sendResponse = await axios.post(`${this.apiBaseUrl}/api/reply`, {
                chatId: this.currentChatId,
                message: message
            });

            if (sendResponse.data?.success) {
                this.showMessageBoxMessage('Message sent successfully!');
                // Clear message input
                if (this.messageText) {
                    this.messageText.value = '';
                }
                // Hide success message after 2 seconds
                setTimeout(() => {
                    this.hideMessageBoxStatus();
                }, 2000);
            } else {
                this.showMessageBoxMessage('Failed to send message. Please try again.', true);
            }
        } catch (error) {
            console.error('Send message error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'An error occurred. Please try again.';
            this.showMessageBoxMessage(errorMessage, true);
        } finally {
            this.sendMessageBtn.disabled = false;
        }
    }
}

// Initialize modal when DOM is ready
let searchModalInstance = null;
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit to ensure all elements are ready
    setTimeout(() => {
        searchModalInstance = new SearchModal();
        window.searchModalInstance = searchModalInstance; // Make it accessible globally for onclick handlers
        
        // Ensure buttons are clickable
        const getStartedBtn = document.querySelector('.hero-buttons .btn-primary');
        const signInBtn = document.getElementById('signInBtn');
        
        if (getStartedBtn) {
            getStartedBtn.style.pointerEvents = 'auto';
            getStartedBtn.style.cursor = 'pointer';
            console.log('✅ Get Started button initialized');
        }
        
        if (signInBtn) {
            signInBtn.style.pointerEvents = 'auto';
            signInBtn.style.cursor = 'pointer';
            console.log('✅ Sign In button initialized');
        }
        
        // Auto-detect API server URL
        if (searchModalInstance.detectApiServerUrl) {
            searchModalInstance.detectApiServerUrl().then(detectedUrl => {
                searchModalInstance.apiBaseUrl = detectedUrl;
                console.log(`🌐 API Server detected at: ${detectedUrl}`);
            }).catch(error => {
                console.warn('⚠️ Could not auto-detect API server, using default:', searchModalInstance.apiBaseUrl);
            });
        }
    }, 100);
});
