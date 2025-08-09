
// js/license.js

const LicenseService = {
    isInitialized: false,
    
    initialize: async function() {
        if (this.isInitialized) return;
        
        try {
            // Initialize license checking
            const licenseInfo = StorageService.getLicenseInfo();
            
            if (licenseInfo.licenseStatus === 'unlicensed') {
                // First time user - show license modal
                this.showLicenseModal();
            } else if (licenseInfo.licenseStatus === 'trial') {
                // Check if trial has expired
                StorageService.incrementBootCount();
                if (this.isTrialExpired()) {
                    this.showLicenseModal('Trial Expired', 'Your trial period has expired. Please enter a license key to continue.');
                }
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize license service:', error);
        }
    },

    showLicenseModal: function(title = 'License Required', message = 'Please enter your license key to continue.') {
        const modal = document.getElementById('licenseModal');
        const titleElement = document.getElementById('licenseModalTitle');
        const messageElement = document.getElementById('licenseModalMessage');
        const submitBtn = document.getElementById('submitLicenseBtn');
        
        if (modal && titleElement && messageElement) {
            titleElement.textContent = title;
            messageElement.textContent = message;
            modal.classList.remove('hidden');
            
            // Set up submit button event listener
            submitBtn.onclick = () => this.validateLicense();
        }
    },

    validateLicense: function() {
        const licenseInput = document.getElementById('licenseKeyInput');
        const licenseKey = licenseInput.value.trim();
        
        if (!licenseKey) {
            Utils.showModal('Error', 'Please enter a license key.');
            return;
        }

        // Simple validation - in real app, this would be server-side
        if (licenseKey === 'TRIAL2025' || licenseKey.toLowerCase() === 'trial') {
            this.activateTrialLicense();
        } else if (licenseKey.length >= 10) {
            this.activateFullLicense(licenseKey);
        } else {
            Utils.showModal('Error', 'Invalid license key. Enter "TRIAL2025" for trial or a valid license key.');
            return;
        }
        
        // Close modal
        document.getElementById('licenseModal').classList.add('hidden');
        licenseInput.value = '';
    },

    activateTrialLicense: function() {
        const licenseInfo = {
            licenseKey: 'TRIAL2025',
            licenseStartDate: new Date().toISOString(),
            bootCount: 0,
            licenseStatus: 'trial'
        };
        StorageService.saveLicenseInfo(licenseInfo);
        Utils.showModal('Success', 'Trial license activated! You have 30 days and can create up to 10 questions per exam.');
    },

    activateFullLicense: function(licenseKey) {
        const licenseInfo = {
            licenseKey: licenseKey,
            licenseStartDate: new Date().toISOString(),
            bootCount: 0,
            licenseStatus: 'renewed'
        };
        StorageService.saveLicenseInfo(licenseInfo);
        Utils.showModal('Success', 'Full license activated! You now have unlimited access.');
    },

    isTrialActive: function() {
        const licenseInfo = StorageService.getLicenseInfo();
        return licenseInfo.licenseStatus === 'trial' && !this.isTrialExpired();
    },

    isTrialExpired: function() {
        const licenseInfo = StorageService.getLicenseInfo();
        if (licenseInfo.licenseStatus !== 'trial') return false;
        
        const startDate = new Date(licenseInfo.licenseStartDate);
        const currentDate = new Date();
        const daysSinceStart = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
        
        return daysSinceStart > 30 || licenseInfo.bootCount > 100;
    },

    isQuestionLimitReached: function(currentQuestionCount) {
        const licenseInfo = StorageService.getLicenseInfo();
        if (licenseInfo.licenseStatus === 'renewed') return false;
        if (licenseInfo.licenseStatus === 'trial') return currentQuestionCount >= 10;
        return true; // Unlicensed users can't add questions
    },

    fetchConfig: async function() {
        // In a real application, this would fetch from a server
        return {
            encryption_passphrase: 'default_encryption_key_2025'
        };
    }
};
