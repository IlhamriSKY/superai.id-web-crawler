const SuperAI = require("./scrap");
const { delay } = require("./helper"); // Ensure delay is imported from helper.js

const sendMessageAndGetResponse = async (chatChoice, model, message) => {
  const bot = new SuperAI();

  try {
    // Step 1: Initialize the bot
    const initResult = await bot.init();
    if (!initResult.success) {
      return initResult; // Return error JSON if initialization fails
    }

    // Step 2: Handle recent chat
    const chatResult = await bot.handleRecentChats(chatChoice);
    if (!chatResult.success) {
      return chatResult; // Return error JSON if handling recent chat fails
    }

    // Step 3: Dynamically select models with very short delay
    const selectModelQuickly = async (selectedModel) => {
      const allModels = Object.keys(bot.config.dropdownOptions); // Get all model keys
      const otherModels = allModels.filter(
        (key) => key.toLowerCase() !== selectedModel.toLowerCase()
      ); // Exclude the selected model

      // Select other models first
      for (const otherModel of otherModels) {
        const dropdownResult = await bot.selectDropdownOption(otherModel);
        if (!dropdownResult.success) {
          return dropdownResult; // Return error JSON if model selection fails
        }
        await delay(100); // Use delay from helper.js
      }

      // Finally, select the desired model
      const finalDropdownResult = await bot.selectDropdownOption(selectedModel);
      if (!finalDropdownResult.success) {
        return finalDropdownResult; // Return error JSON if final model selection fails
      }

      return { success: true }; // Return success if all selections succeed
    };

    // Select models
    const modelSelect = await selectModelQuickly(model);
    if (!modelSelect.success) {
      return modelSelect; // Return error JSON if model selection fails
    }

    // Step 4: Send the message
    const messageResult = await bot.sendMessage(message, model);
    if (!messageResult.success) {
      return messageResult; // Return error JSON if sending message fails
    }

    // Step 5: Get the bot's response
    const response = await bot.getNewResponses(message);
    return response; // Return the bot's response JSON
  } catch (error) {
    // Log and return unexpected errors
    return { success: false, error: error.message };
  } finally {
    try {
      await bot.closeWithDelay(500); // Always close the browser
    } catch (closeError) {
    }
  }
};

module.exports = sendMessageAndGetResponse;
