
// js/utils.js

const Utils = {
    /**
     * Formats a duration in seconds into a MM:SS string.
     * @param {number} totalSeconds - The total seconds to format.
     * @returns {string} The formatted time string "MM:SS".
     */
    formatTime: (totalSeconds) => {
        if (isNaN(totalSeconds) || totalSeconds < 0) {
            return "00:00";
        }
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    /**
     * A simple password validation function.
     * In a real-world scenario, this should be more secure (e.g., hashing).
     * @param {string} inputPassword - The password entered by the user.
     * @param {string} correctPassword - The correct password to validate against.
     * @returns {boolean} True if the passwords match.
     */
    validatePassword: (inputPassword, correctPassword) => {
        // Basic case-sensitive comparison.
        return inputPassword === correctPassword;
    },

    /**
     * Gets the full display name for a question type code.
     * @param {string} typeCode - The code for the question type (e.g., 'mcq').
     * @returns {string} The full display name (e.g., 'Multiple Choice').
     */
    getQuestionTypeName: (typeCode) => {
        const typeMap = {
            'mcq': 'Multiple Choice (MCQ)',
            'truefalse': 'True/False',
            'fillblank': 'Fill in the Blank',
            'checkbox': 'Checkbox (Multi-answer)',
            'subjective': 'Subjective',
            'image': 'Image-based'
        };
        return typeMap[typeCode] || 'Unknown';
    },

    /**
     * Generates a simple unique ID. Useful for DOM elements or tracking items.
     * @returns {string} A unique identifier.
     */
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    },

    /**
     * Shows a modal dialog with a message.
     * @param {string} title - The title of the modal.
     * @param {string} message - The message to display.
     * @param {string} type - 'info', 'warning', 'error' to control styling.
     */
    showModal: (title, message, type = 'info') => {
        // This is a placeholder for a more robust modal implementation.
        // For now, it uses the browser's alert.
        alert(`[${title.toUpperCase()}]\n\n${message}`);
    }
};
