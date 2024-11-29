SuperAI Chat Automation
=======================

SuperAI Chat Automation is a Node.js-based application designed to automate interactions with the SuperAI chat platform using Puppeteer. It allows users to programmatically open chats, select AI models, send messages, and retrieve responses with enhanced flexibility and custom configurations.

Features
--------

*   Automates chat interaction with SuperAI.
*   Handles recent chats or creates new ones.
*   Supports dynamic AI model selection.
*   Retrieves new responses after a message is sent.
*   Search functionality with typing effect.
*   Configurable delay and browser settings.

Requirements
------------

*   Node.js (v16 or higher).
*   npm (Node Package Manager).
*   A valid SuperAI account and cookies.
*   Google Chrome or Chromium for Puppeteer.

Installation
------------

1.  Clone this repository:
    
        git clone https://github.com/IlhamriSKY/superai.id-web-crawler.git
    
2.  Navigate to the project directory:
    
        cd superai-chat-automation
    
3.  Install dependencies:
    
        npm install
    
Usage
-----

Run the application using the provided scripts:

1.  To send a message and retrieve a response:
    
        node app.js
    
2.  Example output:
    
    Result 1: { success: true, data: "I'm the latest version of SuperAI!" }
    Result 2: { success: true, data: "Members of Avenged Sevenfold: M. Shadows, Synyster Gates, Zacky Vengeance, Johnny Christ, Brooks Wackerman" }
    Result 3: { success: true, data: "Lyrics of 'Dear God'..." }
                
    

Code Documentation
------------------

### Core Classes and Functions

*   #### Class: `SuperAI`
    
    The main class that handles browser automation and interactions with the chat platform.
    
    *   `init()`: Initializes the browser and logs into the SuperAI platform.
    *   `handleRecentChats(choice)`: Opens a specific chat or creates a new one.
    *   `selectDropdownOption(optionKey)`: Selects a model from the dropdown menu.
    *   `sendMessage(message, selectedModel)`: Sends a message to the chat.
    *   `getNewResponses(lastMessageSent)`: Retrieves all new responses after the last separator.
    *   `close()`: Closes the browser instance.
    *   `closeWithDelay(delayTime)`: Closes the browser after a specified delay.
*   #### Function: `sendMessageAndGetResponse(chatChoice, model, message)`
    
    A utility function in `run.js` that automates the workflow of opening a chat, selecting a model, sending a message, and retrieving a response.
    