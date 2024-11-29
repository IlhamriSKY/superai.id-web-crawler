const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const CONFIG = require("./config");
const {
    createResponse,
    logErrorToFile,
    delay,
    waitForSendButton,
    clickButton,
    ensureElementClickable
} = require("./helper");

puppeteer.use(StealthPlugin());

class SuperAI {
    constructor({ headless = true, cookiesFolder = ".", cookiesFileName = "cookies.json" } = {}) {
        this.config = CONFIG;
        this.browser = null;
        this.page = null;
        this.chatType = "NEW";
        this.initialResponseCount = 0;
        this.headless = headless; // Headless mode configuration
        this.cookiesFolder = cookiesFolder; // Folder for cookies
        this.cookiesFileName = cookiesFileName; // Filename for cookies
    }

    /**
     * Initializes the browser and page, and logs into the SuperAI platform.
     * @returns {Promise<Object>} JSON containing the success status and message or error.
     */
    async init() {
        try {
            this.browser = await puppeteer.launch({
                headless: this.headless,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });
            this.page = await this.browser.newPage();

            // Resolve cookies path
            const cookiesPath = path.resolve(this.cookiesFolder, this.cookiesFileName);
            if (fs.existsSync(cookiesPath)) {
                const cookies = JSON.parse(fs.readFileSync(cookiesPath));
                await this.page.setCookie(...cookies);
            } else {
                throw new Error(`Cookies file not found at ${cookiesPath}. Please log in manually to save cookies.`);
            }

            await this.page.goto(this.config.url, { waitUntil: "networkidle2" });

            const isLoggedIn = await this.page.evaluate((loginButton) => {
                return !document.querySelector(loginButton);
            }, this.config.selectors.loginButton);

            if (!isLoggedIn) {
                throw new Error("Login failed. Invalid cookies or session expired.");
            }

            return createResponse(true, "Initialization successful");
        } catch (error) {
            return createResponse(false, error.message);
        }
    }

    /**
     * Handles recent chats. Opens a specific chat or creates a new one.
     * @param {string|number} choice The chat number to open or 'new' to create a new chat.
     * @returns {Promise<Object>} JSON containing the success status and message or error.
     */
    async handleRecentChats(choice = "new") {
        try {
            // Validate input
            if (typeof choice !== "string" && typeof choice !== "number") {
                return createResponse(false, `Invalid choice type: expected string or number, got ${typeof choice}`);
            }

            const recentChatsContainer = this.config.selectors.recentChatsContainer;
            const chatItems = this.config.selectors.chatItems;

            const choiceStr = String(choice).toLowerCase();
            const recentChatsElement = await this.page.$(recentChatsContainer);

            // If the recent chats container is not found
            if (!recentChatsElement) {
                if (choiceStr === "new") {
                    const newButton = await this.page.evaluateHandle(() => {
                        const buttons = Array.from(document.querySelectorAll('button[data-sentry-element="Button"], button[data-sentry-component="NewChat"]'));
                        return buttons.find((button) => button.textContent.trim().includes("New"));
                    });

                    if (newButton) {
                        await newButton.hover();
                        await newButton.click();
                        this.chatType = "NEW";
                        return createResponse(true, "New chat created by clicking the 'New' button", null, choiceStr);
                    }

                    return createResponse(false, "New button not found", null, choiceStr);
                }
                return createResponse(false, "No recent chats found", null, choiceStr);
            }

            // Fetch all chat items
            const chats = await recentChatsElement.$$(chatItems);

            // If no chats are found and user wants to start a new one
            if (chats.length === 0 && choiceStr === "new") {
                const newButton = await this.page.evaluateHandle(() => {
                    const buttons = Array.from(document.querySelectorAll('button[data-sentry-element="Button"], button[data-sentry-component="NewChat"]'));
                    return buttons.find((button) => button.textContent.trim().includes("New"));
                });

                if (newButton) {
                    await newButton.hover();
                    await newButton.click();
                    this.chatType = "NEW";
                    return createResponse(true, "New chat created by clicking the 'New' button", null, choiceStr);
                }

                return createResponse(false, "New button not found", null, choiceStr);
            }

            // If the user wants to create a new chat, regardless of existing chats
            if (choiceStr === "new") {
                this.chatType = "NEW";
                return createResponse(true, "New chat created", null, choiceStr);
            }

            // Parse the choice and validate the index
            const index = parseInt(choiceStr, 10) - 1;
            if (isNaN(index) || index < 0 || index >= chats.length) {
                return createResponse(false, "Invalid choice. No such chat exists.", null, choiceStr);
            }

            // Click on the selected chat
            await chats[index].click();
            await this.page.waitForSelector(this.config.selectors.responseParent, {
                timeout: 30000
            });
            this.chatType = "RECENT";
            this.initialResponseCount = (await this.page.$$(this.config.selectors.responseChild)).length;
            return createResponse(true, `Chat number ${index + 1} opened`, null, choiceStr);
        } catch (error) {
            // Log the error to the console and file
            logErrorToFile(error);
            return createResponse(false, `Error handling recent chats: ${error.message}`, null, choice);
        }
    }

    /**
     * Selects a model from the dropdown menu.
     * @param {string} optionKey The key of the model to select (e.g., 'gemini').
     * @returns {Promise<Object>} JSON containing the success status and message or error.
     */
    async selectDropdownOption(optionKey) {
        try {
            const {
                dropdownButton,
                dropdownOptionsContainer
            } = this.config.selectors;
            const optionText = this.config.dropdownOptions[optionKey.toLowerCase()];

            // Validate the input key
            if (!optionText) {
                throw new Error(`Invalid option key '${optionKey}'. Available options: ${Object.keys(this.config.dropdownOptions).join(", ")}`);
            }

            // Wait for the dropdown button and click it
            await this.page.waitForSelector(dropdownButton, {
                timeout: 5000
            });
            let dropdownButtonElement = await this.page.$(dropdownButton);
            if (!dropdownButtonElement) {
                throw new Error("Dropdown button not found");
            }

            // Retry if the dropdown button is detached
            try {
                await dropdownButtonElement.focus();
                await dropdownButtonElement.click();
            } catch (error) {
                if (error.message.includes("Node is detached from document")) {
                    dropdownButtonElement = await this.page.$(dropdownButton); // Re-query the element
                    if (!dropdownButtonElement) {
                        throw new Error("Dropdown button was removed and could not be re-queried.");
                    }
                    await dropdownButtonElement.click(); // Retry the click
                } else {
                    throw error;
                }
            }

            // Wait for the dropdown options to appear
            await this.page.waitForSelector(dropdownOptionsContainer, {
                timeout: 5000
            });
            const options = await this.page.$$(dropdownOptionsContainer + " button");
            if (!options || options.length === 0) {
                throw new Error("Dropdown options not found");
            }

            // Search for the desired option and select it
            for (const option of options) {
                const optionValue = await this.page.evaluate((el) => el.innerText.trim(), option);
                if (optionValue.includes(optionText)) {
                    try {
                        await option.focus();
                        await option.hover();
                        await option.click();
                    } catch (error) {
                        if (error.message.includes("Node is detached from document")) {
                            const freshOption = await this.page.evaluateHandle((text, container) => {
                                const buttons = Array.from(document.querySelectorAll(container + " button"));
                                return buttons.find((btn) => btn.innerText.includes(text));
                            }, optionText, dropdownOptionsContainer);

                            if (!freshOption) {
                                throw new Error(`Option '${optionText}' was removed and could not be re-queried.`);
                            }

                            await freshOption.click();
                        } else {
                            throw error;
                        }
                    }
                    return createResponse(true, `Option '${optionValue}' selected`, null, optionKey);
                }
            }

            throw new Error(`Option '${optionText}' not found in the dropdown.`);
        } catch (error) {
            logErrorToFile(error, "selectDropdownOption");
            return createResponse(false, `Error selecting dropdown option: ${error.message}`, null, optionKey);
        }
    }

    /**
     * Searches for a term in the search input on the page with a typing effect.
     * @param {string} searchTerm The term to search for.
     * @returns {Promise<Object>} JSON containing the success status, message, and optional data.
     */
    async searchOnPage(searchTerm) {
        try {
            // Validate the search term
            if (typeof searchTerm !== "string" || !searchTerm.trim()) {
                throw new Error("Invalid search term: must be a non-empty string.");
            }

            const searchInputSelector = 'input[placeholder="Search..."]';

            // Wait until the search input is available
            await this.page.waitForSelector(searchInputSelector, {
                timeout: 5000
            });
            const searchInput = await this.page.$(searchInputSelector);
            if (!searchInput) {
                throw new Error("Search input field not found.");
            }

            // Focus on the search input
            await searchInput.focus();

            // Type the search term with a delay for a typing effect
            for (const char of searchTerm) {
                await this.page.keyboard.type(char, {
                    delay: 150
                });
            }

            // Add a delay to ensure the search completes
            await delay(1000);

            return createResponse(true, `Search completed for '${searchTerm}'`);
        } catch (error) {
            // Log the error to a file and return the error response
            logErrorToFile(error);
            return createResponse(false, `Error during search: ${error.message}`, null, searchTerm);
        }
    }

    /**
     * Clears the search input on the page.
     * @returns {Promise<Object>} JSON containing the success status and message.
     */
    async clearSearch() {
        try {
            const searchInputSelector = 'input[placeholder="Search..."]';

            // Wait for the search input to appear
            await this.page.waitForSelector(searchInputSelector, {
                timeout: 5000
            });

            // Clear the search input field
            const cleared = await this.page.evaluate((selector) => {
                const input = document.querySelector(selector);
                if (input) {
                    input.value = ""; // Clear the input field value
                    const event = new Event("input", {
                        bubbles: true
                    }); // Trigger an input event
                    input.dispatchEvent(event);
                    return true;
                }
                return false;
            }, searchInputSelector);

            // Check if the input was successfully cleared
            if (!cleared) {
                throw new Error("Search input element not found or could not be cleared.");
            }

            return createResponse(true, "Search input cleared successfully");
        } catch (error) {
            // Log the error to a file and return the error response
            logErrorToFile(error);
            return createResponse(false, `Error clearing search: ${error.message}`);
        }
    }

    /**
     * Sends a message to the chat, including model selection and separators.
     * @param {string} message The main message to send.
     * @param {string} selectedModel The model to select before sending the message.
     * @returns {Promise<Object>} JSON containing the success status and message or error.
     */
    async sendMessage(message, selectedModel) {
        try {
            const {
                textArea,
                sendButton
            } = this.config.selectors;

            // Debugging: Log selectors
            // console.log("Config Selectors:", this.config.selectors);
            // console.log("Send Button Selector:", sendButton);

            // Validasi sendButton
            if (!sendButton || typeof sendButton !== "string") {
                throw new Error("Send button selector is not defined or invalid in the configuration.");
            }

            // console.log(`Using send button selector: ${sendButton}`);

            // Step 1: Send the initial separator message if it's a new chat
            if (this.chatType === "NEW") {
                await this.page.waitForSelector(textArea, {
                    timeout: 5000
                });
                await this.page.type(textArea, this.config.separatorMessage);

                await waitForSendButton(this.page, sendButton);
                await clickButton(this.page, sendButton);
                await delay(1000);
            }

            // Step 2: Select the desired model
            const modelSelectResult = await this.selectDropdownOption(selectedModel);
            if (!modelSelectResult.success) {
                logErrorToFile(new Error(`Model selection failed: ${modelSelectResult.message}`), "sendMessage");
                return modelSelectResult;
            }

            // Step 3: Add a delay before typing the main message
            await delay(1000);

            // Step 4: Type the main message
            await this.page.waitForSelector(textArea, {
                timeout: 5000
            });
            await this.page.type(textArea, message);

            await waitForSendButton(this.page, sendButton);
            await clickButton(this.page, sendButton);

            // Step 5: Add a delay before sending the final separator
            await delay(1000);

            // Step 6: Send the final separator message
            await this.page.waitForSelector(textArea, {
                timeout: 5000
            });
            await this.page.type(textArea, this.config.separatorMessage);

            await waitForSendButton(this.page, sendButton);
            await clickButton(this.page, sendButton);

            return createResponse(true, "Message and separators sent successfully with model selection", null, message);
        } catch (error) {
            logErrorToFile(error, "sendMessage");
            return createResponse(false, `Error sending message: ${error.message}`, null, message);
        }
    }


    /**
     * Retrieves all new responses after the last separator and excludes the separator itself.
     * @param {string} lastMessageSent The last message sent, used as a reference.
     * @returns {Promise<Object>} JSON containing the success status, data, or error.
     */
    async getNewResponses(lastMessageSent) {
        try {
            const {
                responseParent,
                responseChild,
                separatorKey
            } = this.config.selectors;
            const dropdownButton = this.config.selectors.dropdownButton || "button.text-zinc-800"; // Fallback jika tidak ada

            // Extract the currently selected AI model using the selector from config
            const selectedModel = await this.page.evaluate((dropdownSel) => {
                const dropdownButton = document.querySelector(dropdownSel);
                return dropdownButton ? dropdownButton.textContent.trim() : null; // Return the selected model's text
            }, dropdownButton);

            if (!selectedModel) {
                return createResponse(false, "AI model could not be identified.");
            }

            const responses = await this.page.evaluate(
                (parentSel, childSel, separator) => {
                    const parentElement = document.querySelector(parentSel);
                    if (!parentElement) return {
                        texts: [],
                        images: []
                    };

                    const childElements = Array.from(parentElement.querySelectorAll(childSel));
                    let lastSeparatorIndex = -1;

                    // Find the last separator index
                    for (let i = childElements.length - 1; i >= 0; i--) {
                        const text = childElements[i].innerText.trim();
                        if (text.includes(separator)) {
                            lastSeparatorIndex = i;
                            break;
                        }
                    }

                    // Get only responses after the last separator
                    const filteredElements = childElements.slice(lastSeparatorIndex + 1);

                    const texts = filteredElements
                        .map((el) => {
                            const codeBlock = el.querySelector("pre code");
                            if (codeBlock) {
                                return `\`\`\`\n${codeBlock.textContent.trim()}\n\`\`\``; // Wrap code in triple backticks
                            }

                            const orderedListItems = el.querySelectorAll("ol > li");
                            if (orderedListItems.length > 0) {
                                const startIndex = parseInt(el.querySelector("ol").getAttribute("start") || 1, 10);
                                return Array.from(orderedListItems)
                                    .map((li, index) => `${startIndex + index}. ${li.textContent.trim()}`)
                                    .join("\n");
                            }

                            const unorderedListItems = el.querySelectorAll("ul > li");
                            if (unorderedListItems.length > 0) {
                                return Array.from(unorderedListItems)
                                    .map((li) => `- ${li.textContent.trim()}`)
                                    .join("\n");
                            }

                            const text = el.innerText.trim();
                            return text.length > 0 ? text : null;
                        })
                        .filter((response) => response !== null);

                    // Improved image extraction logic
                    const images = filteredElements
                        .flatMap((el) => Array.from(el.querySelectorAll("img"))) // Get all img elements
                        .map((img) => img.src) // Extract the src attribute
                        .filter((src) => src.startsWith("blob:")); // Filter for blob URLs

                    return {
                        texts,
                        images
                    };
                },
                responseParent,
                responseChild,
                this.config.separatorKey
            );

            if (responses.texts.length > 0 || responses.images.length > 0) {
                return createResponse(true, "New responses retrieved", {
                    model: selectedModel,
                    ...responses
                }, lastMessageSent);
            } else {
                return createResponse(false, "No new responses found", {
                    model: selectedModel
                }, lastMessageSent);
            }
        } catch (error) {
            // Log the error for debugging
            logErrorToFile(error, "getNewResponses");

            // Return the error response
            return createResponse(false, `Error retrieving responses: ${error.message}`, null, lastMessageSent);
        }
    }


    /**
     * Closes the browser instance.
     * @returns {Promise<Object>} JSON containing the success status and message or error.
     */
    async close() {
        try {
            if (!this.browser) {
                throw new Error("Browser instance is not initialized or already closed.");
            }

            await this.browser.close();
            return createResponse(true, "Browser closed successfully");
        } catch (error) {
            // Log the error to a file
            logErrorToFile(new Error(`Error closing browser: ${error.message}`));

            // Return a failure response
            return createResponse(false, `Error closing browser: ${error.message}`);
        }
    }

    /**
     * Closes the browser instance after a specified delay.
     * @param {number} delayTime The delay duration in milliseconds before closing the browser.
     * @returns {Promise<Object>} JSON containing the success status and message or error.
     */
    async closeWithDelay(delayTime) {
        try {
            // Validate the delay parameter
            if (typeof delayTime !== "number" || delayTime < 0) {
                throw new Error(`Invalid delay duration: ${delayTime}. Must be a non-negative number.`);
            }

            // Wait for the specified delay
            await delay(delayTime);

            // Close the browser
            if (!this.browser) {
                throw new Error("Browser instance is not initialized or already closed.");
            }

            await this.browser.close();
            return createResponse(true, "Browser closed successfully after delay");
        } catch (error) {
            // Log the error to a file
            logErrorToFile(new Error(`Error closing browser after delay: ${error.message}`));

            // Return a failure response
            return createResponse(false, `Error closing browser after delay: ${error.message}`);
        }
    }

    /**
     * Clears all recent chats, handling both direct trash buttons and ellipsis menus.
     * @returns {Promise<Object>} JSON containing the success status and message.
     */
    async clearRecentChats() {
        try {
            const ellipsisButtonSelector = 'button .lucide-ellipsis-vertical'; // Selector for ellipsis button
            const deleteOptionSelector = 'div[role="menuitem"] .lucide-trash2'; // Selector for "Delete" option in the menu
            const modalSelector = 'div[role="dialog"]'; // Selector for the modal
            const deleteButtonInModalSelector = 'button.bg-destructive'; // Selector for "Delete Chat" in modal

            let chatsDeleted = 0;

            // Loop until no more chats to delete
            while (true) {
                // Wait for the page to stabilize
                await delay(1000);

                // Find ellipsis buttons
                const ellipsisButtons = await this.page.$$(ellipsisButtonSelector);

                if (ellipsisButtons.length === 0) {
                    break; // No more ellipsis buttons, exit loop
                }

                // Click the first ellipsis button
                await ensureElementClickable(this.page, ellipsisButtonSelector); // Ensure clickable
                await ellipsisButtons[0].click();

                // Wait for the menu to open and find the "Delete" option
                await this.page.waitForSelector(deleteOptionSelector, {
                    timeout: 5000
                });
                const deleteOption = await this.page.$(deleteOptionSelector);
                if (!deleteOption) {
                    return createResponse(false, "Delete option not found in menu.");
                }

                // Click the "Delete" option
                await ensureElementClickable(this.page, deleteOptionSelector); // Ensure clickable
                await deleteOption.click();

                // Wait for 2 seconds before interacting with the modal
                await delay(2000);

                // Wait for the modal to appear
                const modalVisible = await this.page.waitForSelector(modalSelector, {
                    timeout: 5000
                }).catch(() => null);
                if (!modalVisible) {
                    return createResponse(false, "Confirmation modal not found.");
                }

                // Find and click the "Delete Chat" button in the modal
                const deleteButtonInModal = await this.page.$(deleteButtonInModalSelector);
                if (!deleteButtonInModal) {
                    return createResponse(false, "Delete button not found in confirmation modal.");
                }

                await ensureElementClickable(this.page, deleteButtonInModalSelector); // Ensure clickable
                await deleteButtonInModal.click(); // Click the "Delete Chat" button
                chatsDeleted++;

                // Wait for the deletion to be reflected in the UI
                await delay(1000);
            }

            return createResponse(true, `Successfully deleted ${chatsDeleted} chats.`);
        } catch (error) {
            // Log error and return failure response
            logErrorToFile(error, "clearRecentChats");
            return createResponse(false, `Error clearing recent chats: ${error.message}`);
        }
    }
}

module.exports = SuperAI;