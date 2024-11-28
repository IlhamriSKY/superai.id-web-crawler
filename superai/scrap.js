const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const CONFIG = require("./config");

puppeteer.use(StealthPlugin());

class SuperAI {
  constructor() {
    this.config = CONFIG;
    this.browser = null;
    this.page = null;
    this.chatType = "NEW";
    this.initialResponseCount = 0;
  }

  /**
   * Creates a response object.
   * @param {boolean} success Indicates if the operation was successful.
   * @param {string} message The message to return.
   * @param {any} [data=null] Optional data to include in the response.
   * @returns {Object} JSON containing the success status, message, and optional data.
   */
  createResponse(success, message, data = null, prompt = null) {
    return { success, message, prompt, data };
  }

  /**
   * Initializes the browser and page, and logs into the SuperAI platform.
   * @returns {Promise<Object>} JSON containing the success status and message or error.
   */
  async init() {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      this.page = await this.browser.newPage();

      if (fs.existsSync(this.config.cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(this.config.cookiesPath));
        await this.page.setCookie(...cookies);
      } else {
        throw new Error("Cookies file not found. Please log in manually to save cookies.");
      }

      await this.page.goto(this.config.url, { waitUntil: "networkidle2" });

      const isLoggedIn = await this.page.evaluate((loginButton) => {
        return !document.querySelector(loginButton);
      }, this.config.selectors.loginButton);

      if (!isLoggedIn) {
        throw new Error("Login failed. Invalid cookies or session expired.");
      }

      return this.createResponse(true, "Initialization successful");
    } catch (error) {
      return this.createResponse(false, error.message);
    }
  }

  /**
   * Handles recent chats. Opens a specific chat or creates a new one.
   * @param {string|number} choice The chat number to open or 'new' to create a new chat.
   * @returns {Promise<Object>} JSON containing the success status and message or error.
   */
  async handleRecentChats(choice = "new") {
    try {
      const { recentChatContainer, chatItems, responseParent } = this.config.selectors;
      const choiceStr = String(choice).toLowerCase();
  
      const recentChatsContainer = await this.page.$(recentChatContainer);
      if (!recentChatsContainer) {
        if (choiceStr === "new") {
          this.chatType = "NEW";
          return this.createResponse(true, "New chat created", null, choiceStr);
        } else {
          return this.createResponse(false, "No recent chats found", null, choiceStr);
        }
      }
  
      const chats = await recentChatsContainer.$$(chatItems);
      if (chats.length === 0) {
        if (choiceStr === "new") {
          this.chatType = "NEW";
          return this.createResponse(true, "New chat created", null, choiceStr);
        } else {
          return this.createResponse(false, "No recent chats available", null, choiceStr);
        }
      }
  
      if (choiceStr === "new") {
        this.chatType = "NEW";
        return this.createResponse(true, "New chat created", null, choiceStr);
      }
  
      const index = parseInt(choiceStr, 10) - 1;
      if (index >= 0 && index < chats.length) {
        await chats[index].click();
        await this.page.waitForSelector(responseParent, { timeout: 30000 });
        this.chatType = "RECENT";
        this.initialResponseCount = (await this.page.$$(this.config.selectors.responseChild)).length;
        return this.createResponse(true, `Chat number ${index + 1} opened`, null, choiceStr);
      } else {
        return this.createResponse(false, "Invalid choice. No such chat exists.", null, choiceStr);
      }
    } catch (error) {
      return this.createResponse(false, `Error handling recent chats: ${error.message}`, null, choiceStr);
    }
  }

  /**
   * Selects a model from the dropdown menu.
   * @param {string} optionKey The key of the model to select (e.g., 'gemini').
   * @returns {Promise<Object>} JSON containing the success status and message or error.
   */
  async selectDropdownOption(optionKey) {
    try {
      const { dropdownButton, dropdownOptionsContainer } = this.config.selectors;
      const optionText = this.config.dropdownOptions[optionKey.toLowerCase()];
  
      if (!optionText) {
        throw new Error("Invalid option. Please choose a valid model.");
      }
  
      await this.page.waitForSelector(dropdownButton, { timeout: 5000 });
      await this.page.click(dropdownButton);
  
      await this.page.waitForSelector(dropdownOptionsContainer, { timeout: 5000 });
  
      const options = await this.page.$$(dropdownOptionsContainer + " button");
      for (const option of options) {
        const optionValue = await this.page.evaluate((el) => el.innerText.trim(), option);
        if (optionValue.includes(optionText)) {
          await option.click();
          return this.createResponse(true, `Option '${optionValue}' selected`, null, optionKey);
        }
      }
  
      throw new Error(`Option '${optionText}' not found.`);
    } catch (error) {
      return this.createResponse(false, `Error selecting dropdown option: ${error.message}`, null, optionKey);
    }
  }

  /**
   * Sends a message to the chat.
   * @param {string} message The message to send.
   * @returns {Promise<Object>} JSON containing the success status and message or error.
   */
  async sendMessage(message) {
    try {
      const { textArea, sendButton } = this.config.selectors;
  
      await this.page.type(textArea, message);
      await this.waitForElementAndClick(sendButton);
  
      await this.delay(2000);
      await this.page.type(textArea, this.config.separatorMessage);
      await this.waitForElementAndClick(sendButton);
  
      return this.createResponse(true, "Message sent successfully", null, message);
    } catch (error) {
      return this.createResponse(false, `Error sending message: ${error.message}`, null, message);
    }
  }

  /**
   * Retrieves new responses after the last separator.
   * @returns {Promise<Object>} JSON containing the success status, data, or error.
   */
  async getNewResponses(lastMessageSent) {
    try {
      const { responseParent, responseChild, separatorKey } = this.config.selectors;
  
      const responses = await this.page.evaluate(
        (parentSel, childSel, separator) => {
          const parentElement = document.querySelector(parentSel);
          if (!parentElement) return { texts: [], images: [] };
  
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
  
          // Debugging: Log filtered elements and images
          console.log("Filtered Elements:", filteredElements);
          console.log("Extracted Images:", images);
  
          return { texts, images };
        },
        responseParent,
        responseChild,
        this.config.separatorKey
      );
  
      if (responses.texts.length > 0 || responses.images.length > 0) {
        return this.createResponse(true, "New responses retrieved", responses, lastMessageSent);
      } else {
        return this.createResponse(false, "No new responses found", null, lastMessageSent);
      }
    } catch (error) {
      return this.createResponse(false, `Error retrieving responses: ${error.message}`, null, lastMessageSent);
    }
  }

  /**
   * Clicks on a specified element after waiting for it to be visible.
   * @param {string} selector The selector of the element to click.
   * @param {number} [timeout=30000] The timeout in milliseconds.
   * @throws Will throw an error if the element is not found.
   */
  async waitForElementAndClick(selector, timeout = 30000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      await this.page.click(selector);
    } catch (error) {
      throw new Error(`Error clicking on element '${selector}': ${error.message}`);
    }
  }

  /**
   * Delays execution for a specified number of milliseconds.
   * @param {number} ms The delay duration in milliseconds.
   * @returns {Promise<void>} Resolves after the delay.
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Closes the browser instance.
   * @returns {Promise<Object>} JSON containing the success status and message or error.
   */
  async close() {
    try {
      await this.browser.close();
      return this.createResponse(true, "Browser closed successfully");
    } catch (error) {
      return this.createResponse(false, `Error closing browser: ${error.message}`);
    }
  }

  /**
   * Closes the browser instance after a specified delay.
   * @param {number} delay The delay duration in milliseconds before closing the browser.
   * @returns {Promise<Object>} JSON containing the success status and message or error.
   */
  async closeWithDelay(delay) {
    try {
      await this.delay(delay); // Wait for the specified delay
      await this.browser.close();
      return this.createResponse(true, "Browser closed successfully after delay");
    } catch (error) {
      return this.createResponse(false, `Error closing browser after delay: ${error.message}`);
    }
  }
}

module.exports = SuperAI;
