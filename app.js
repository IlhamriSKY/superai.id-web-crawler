// const sendMessageAndGetResponse = require("./superai/run");
// const SuperAI = require("./superai/scrap"); // Sesuaikan dengan path ke file scrap.js


const { sendMessageAndGetResponse } = require("my-superai-package");

(async () => {
    try {
        // Configuration for SuperAI
        const headless = false; // Set to true or false
        const cookiesFolder = "./"; // Folder where cookies file is located
        const cookiesFileName = "cookies.json"; // Custom filename for cookies

        // Initialize SuperAI with configuration
        const bot = new SuperAI({ headless, cookiesFolder, cookiesFileName });
        const initResult = await bot.init();
        if (!initResult.success) {
            console.error("Initialization failed:", initResult.message);
            return;
        }

        // Example usage
        const result1 = await sendMessageAndGetResponse('new', 'chatgpt', 'Hello, how are you?');
        console.log("Result 1:", result1);

        await bot.close();
    } catch (error) {
        console.error("Unexpected error:", error.message);
    }
})();


// (async () => {
//     try {
//         // Send "apa kabar" and get the response
//         const result1 = await sendMessageAndGetResponse('new', "gemini", "kamu ai versi berapa?");
//         console.log("Result 1:", result1);

//         // const result2 = await sendMessageAndGetResponse(1, "gemini", "berikan aku list member a7x");
//         // console.log("Result 2:", result2);

//         // const result3 = await sendMessageAndGetResponse(1, "chatgpt", "berikan lirik lagu dear god a7x");
//         // console.log("Result 3:", result3);

//         // const result4 = await sendMessageAndGetResponse(1, "chatgpt", "python code for pprint example");
//         // console.log("Result 4:", result4);
//     } catch (error) {
//         console.error("Unexpected error:", error.message);
//     }
// })();


// (async () => {
//     try {
//         const bot = new SuperAI();
//         const initResult = await bot.init();
//         if (!initResult.success) {
//             console.error("Initialization failed:", initResult.message);
//             return;
//         }

//         // Clear all recent chats
//         const clearChatsResult = await bot.clearRecentChats();
//         console.log(clearChatsResult.message);

//         // Close the browser
//         await bot.closeWithDelay(2000);
//     } catch (error) {
//         console.error("Unexpected error:", error.message);
//     }
// })();