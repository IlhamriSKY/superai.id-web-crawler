SuperAI Chat Automation
=======================

**superai.id-web-crawler** is a Node.js package designed to automate interactions with the SuperAI chat platform using Puppeteer. It allows users to programmatically open chats, select AI models, send messages, and retrieve responses with enhanced flexibility and custom configurations.

I created this for research purposes. I discovered that it could also be done using an API. However, since I was lazy to perform network analysis to identify the API, I built this to make it easier.

Features
--------

*   Automates chat interaction with SuperAI.
*   Select AI models dynamically (e.g., Gemini, ChatGPT).
*   Handles recent chats or creates new ones.
*   Supports dynamic AI model selection.
*   Retrieves new responses after a message is sent.
*   Search functionality with typing effect.
*   Configurable delay and browser settings.
*   Clear recent chat history programmatically.

Requirements
------------

*   Node.js (v16 or higher).
*   npm (Node Package Manager).
*   A valid SuperAI account and cookies.
*   Google Chrome or Chromium for Puppeteer.

Installation
------------

```bash
npm install superai-id-web-crawler
```
    
Usage
-----

Here’s an example of how to use the package:

```js
    const { sendMessageAndGetResponse } = require('superai-id-web-crawler');
    
    (async () => {
        try {
            const result = await sendMessageAndGetResponse('new', 'chatgpt', 'Hello, how are you?');
            console.log('Response:', result);
        } catch (error) {
            console.error('Error:', error.message);
        }
    })();
```

Scripts
-------

*   **Start:** `npm start` — Runs the `app.js` script.

Development
-----------

If you’d like to contribute, clone the repository:

```bash
git clone https://github.com/IlhamriSKY/superai.id-web-crawler.git
```

Install dependencies:

```bash
npm install
```

Run the project:

```bash
npm start
```

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

Contributing
------------

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Support
-------

If you encounter any issues, please report them [here](https://github.com/IlhamriSKY/superai.id-web-crawler/issues).

Links
-----

*   [GitHub Repository](https://github.com/IlhamriSKY/superai.id-web-crawler)
*   [npm Package](https://www.npmjs.com/package/superai-id-web-crawler)