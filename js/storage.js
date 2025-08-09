
// js/storage.js

const StorageService = {
    /**
     * Retrieves license information from localStorage.
     * @returns {object} The license information object.
     */
    getLicenseInfo: () => {
        const info = localStorage.getItem('cbt_license_info');
        if (info) {
            try {
                return JSON.parse(info);
            } catch (e) {
                console.error("Error parsing license info:", e);
                // Return default if parsing fails
                return {
                    licenseKey: null,
                    licenseStartDate: null,
                    bootCount: 0,
                    licenseStatus: 'unlicensed', // States: unlicensed, trial, renewed
                };
            }
        }
        // Default values for first-time use
        return {
            licenseKey: null,
            licenseStartDate: null,
            bootCount: 0,
            licenseStatus: 'unlicensed',
        };
    },

    /**
     * Saves license information to localStorage.
     * @param {object} info - The license information object to save.
     */
    saveLicenseInfo: (info) => {
        localStorage.setItem('cbt_license_info', JSON.stringify(info));
    },

    /**
     * Retrieves all results for a specific exam.
     * @param {string} examTitle - The title of the exam.
     * @returns {Array} A list of result objects for the exam.
     */
    getExamResults: (examTitle) => {
        const results = localStorage.getItem(`cbt_results_${examTitle}`);
        if (results) {
            try {
                return JSON.parse(results);
            } catch (e) {
                console.error("Error parsing exam results:", e);
                return [];
            }
        }
        return [];
    },

    /**
     * Saves a single student's result for an exam.
     * @param {string} examTitle - The title of the exam.
     * @param {object} result - The result object to save.
     */
    saveExamResult: (examTitle, result) => {
        const results = StorageService.getExamResults(examTitle);
        results.push(result);
        localStorage.setItem(`cbt_results_${examTitle}`, JSON.stringify(results));
    },

    /**
     * Increments the application boot count and returns the new count.
     * This should be called once every time the application starts.
     * @returns {number} The updated boot count.
     */
    incrementBootCount: () => {
        const info = StorageService.getLicenseInfo();
        // Only increment boot count if the license is in trial mode
        if (info.licenseStatus === 'trial') {
            info.bootCount = (info.bootCount || 0) + 1;
            StorageService.saveLicenseInfo(info);
        }
        return info.bootCount;
    }
};

// To be called on app startup in the main script of each page (teacher.js, student.js)
// StorageService.incrementBootCount();
