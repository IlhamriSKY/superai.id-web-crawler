const fs = require("fs");
const path = require("path");

// Ensure the log directory exists
const logDirectory = path.join(__dirname, "../");
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

/**
 * Creates a response object.
 * @param {boolean} success Indicates if the operation was successful.
 * @param {string} message The message to return.
 * @param {any} [data=null] Optional data to include in the response.
 * @param {any} [prompt=null] Optional prompt related to the response.
 * @returns {Object} JSON containing the success status, message, and optional data.
 */
function createResponse(success, message, data = null, prompt = null) {
    return { success, message, prompt, data };
}

/**
 * Logs an error to a text file for later analysis.
 * @param {Error} error The error object containing the error message and stack trace.
 * @param {string} context The context or method where the error occurred.
 * @returns {void} This function does not return a value.
 */
function logErrorToFile(error, context = "General") {
    const logFilePath = path.join(logDirectory, "error_log.txt");
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${context}] Error: ${error.message}\n`;

    if (error.stack) {
        logMessage += `Stack Trace:\n${error.stack}\n\n`;
    }

    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            // console.error(`Failed to write to log file: ${err.message}`);
        } else {
            // console.log(`Error logged to file: ${logFilePath}`);
        }
    });
}

/**
 * Waits for a specified delay.
 * @param {number} ms The delay duration in milliseconds.
 * @returns {Promise<void>} Resolves after the specified delay.
 */
async function delay(ms) {
    if (typeof ms !== "number" || ms < 0) {
        throw new Error(`Invalid delay duration: ${ms}. Must be a non-negative number.`);
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for an element to appear on the page and clicks it.
 * @param {object} page Puppeteer Page instance.
 * @param {string} selector The CSS selector of the element to click.
 * @param {number} [timeout=30000] The maximum time to wait for the element, in milliseconds.
 * @returns {Promise<void>} Resolves after the element is clicked or throws an error.
 */
async function waitForElementAndClick(page, selector, timeout = 30000) {
    try {
        if (!page || typeof page.waitForSelector !== "function") {
            throw new Error("Invalid Puppeteer Page object.");
        }

        if (!selector) {
            throw new Error("Selector is undefined or invalid.");
        }

        await page.waitForSelector(selector, { timeout });
        await page.click(selector);
    } catch (error) {
        throw new Error(`Error clicking on element '${selector}': ${error.message}`);
    }
}

/**
 * Waits for the send button to become available and not disabled.
 * @param {object} page Puppeteer Page instance.
 * @param {string} selector The CSS selector of the send button.
 * @param {number} [timeout=10000] The maximum time to wait for the button, in milliseconds.
 * @returns {Promise<void>} Resolves when the button is ready or throws an error.
 */
async function waitForSendButton(page, selector, timeout = 10000) {
    try {
        await page.waitForFunction(
            (sel) => {
                const button = document.querySelector(sel);
                return button && !button.disabled; // Ensure the button exists and is not disabled
            },
            { timeout },
            selector
        );
    } catch (error) {
        throw new Error(`Send button with selector '${selector}' is not available or still disabled.`);
    }
}

/**
 * Clicks the send button after ensuring it is available.
 * @param {object} page Puppeteer Page instance.
 * @param {string} selector The CSS selector of the send button.
 * @returns {Promise<void>} Resolves after the button is clicked or throws an error.
 */
async function clickButton(page, selector) {
    const button = await page.$(selector);
    if (!button) {
        throw new Error(`Send button with selector '${selector}' not found.`);
    }
    await button.hover();
    await button.click();
}

module.exports = {
    createResponse,
    logErrorToFile,
    delay,
    waitForElementAndClick,
    waitForSendButton,
    clickButton,
};
