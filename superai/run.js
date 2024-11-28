const SuperAI = require("./scrap");

const sendMessageAndGetResponse = async (chatChoice, model, message) => {
  const bot = new SuperAI();

  try {
    // Initialize the bot
    const initResult = await bot.init();
    if (!initResult.success) {
      return initResult; // Return the error JSON if initialization fails
    }

    // Handle recent chats
    const chatResult = await bot.handleRecentChats(chatChoice);
    if (!chatResult.success) {
      return chatResult; // Return the error JSON if chat handling fails
    }

    // Select dropdown option (model)
    const dropdownResult = await bot.selectDropdownOption(model);
    if (!dropdownResult.success) {
      return dropdownResult; // Return the error JSON if dropdown selection fails
    }

    // Send the message
    const messageResult = await bot.sendMessage(message);
    if (!messageResult.success) {
      return messageResult; // Return the error JSON if message sending fails
    }

    // Get the bot's response, passing the last message as the prompt
    const response = await bot.getNewResponses(message);
    return response; // Return the bot's response JSON
  } catch (error) {
    return { success: false, error: error.message }; // Return unexpected errors as JSON
  } finally {
    await bot.closeWithDelay(5000); // Always close the browser
  }
};

module.exports = sendMessageAndGetResponse;