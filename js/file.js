
// js/file.js

const FileService = {
    /**
     * Encrypts a JavaScript object using AES.
     * @param {object} data - The object to encrypt.
     * @param {string} passphrase - The passphrase for encryption.
     * @returns {string|null} The encrypted string, or null on error.
     */
    encryptData: (data, passphrase) => {
        if (!CryptoJS) {
            console.error("CryptoJS is not loaded.");
            return null;
        }
        try {
            const jsonString = JSON.stringify(data);
            return CryptoJS.AES.encrypt(jsonString, passphrase).toString();
        } catch (error) {
            console.error("Encryption failed:", error);
            return null;
        }
    },

    /**
     * Decrypts an AES-encrypted string back to a JavaScript object.
     * @param {string} encryptedData - The encrypted string.
     * @param {string} passphrase - The passphrase for decryption.
     * @returns {object|null} The decrypted object, or null on error (e.g., wrong passphrase).
     */
    decryptData: (encryptedData, passphrase) => {
        if (!CryptoJS) {
            console.error("CryptoJS is not loaded.");
            return null;
        }
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, passphrase);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            if (!decryptedString) {
                throw new Error("Decryption resulted in an empty string. Potentially a wrong passphrase.");
            }
            return JSON.parse(decryptedString);
        } catch (error) {
            console.error("Decryption failed:", error);
            // This error is common when the passphrase is wrong.
            return null;
        }
    },

    /**
     * Triggers a browser download for the given data.
     * @param {string} data - The data to be downloaded (e.g., encrypted exam string).
     * @param {string} filename - The name of the file to be saved (e.g., 'exam.question').
     */
    exportFile: (data, filename) => {
        const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();

        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
    },

    /**
     * Reads the content of a file selected by the user from a file input event.
     * @param {Event} event - The file input change event.
     * @returns {Promise<string>} A promise that resolves with the file's text content.
     */
    readTextFromFile: (event) => {
        return new Promise((resolve, reject) => {
            const file = event.target.files[0];
            if (!file) {
                return reject(new Error("No file selected."));
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.onerror = (error) => {
                reject(new Error("Error reading file: " + error));
            };
            reader.readAsText(file);
        });
    },

    /**
     * Reads the content of an image file and returns base64 data URL.
     * @param {File} file - The image file to read.
     * @returns {Promise<string>} A promise that resolves with the base64 data URL.
     */
    readImageAsDataURL: (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                return reject(new Error("No file provided."));
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.onerror = (error) => {
                reject(new Error("Error reading image file: " + error));
            };
            reader.readAsDataURL(file);
        });
    }
};
