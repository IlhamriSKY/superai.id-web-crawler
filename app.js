const sendMessageAndGetResponse = require("./superai/run");

(async () => {
    try {
        // Send "apa kabar" and get the response
        const result1 = await sendMessageAndGetResponse('new', "gemini", "kamu ai versi berapa?");
        console.log("Result 1:", result1);

        const result2 = await sendMessageAndGetResponse(1, "gemini", "berikan aku list member a7x");
        console.log("Result 2:", result2);

        const result3 = await sendMessageAndGetResponse(1, "chatgpt", "berikan lirik lagu dear god a7x");
        console.log("Result 3:", result3);

        // // Send "list member a7x" and get the response
        // const result2 = await sendMessageAndGetResponse(
        //     2,
        //     "gemini",
        //     "list member a7x buat dalam point"
        // );
        // console.log("Result 2:", result2);

        // // Send "buat dalam numeric" and get the response
        // const result3 = await sendMessageAndGetResponse(
        //     2,
        //     "gemini",
        //     "buat listnya jadi numeric contoh 1. nama satu, 2. nama dua"
        // );
        // console.log("Result 3:", result3);

        // // Send "buat dalam pprint" and get the response
        // const result4 = await sendMessageAndGetResponse(
        //     2,
        //     "gemini",
        //     "buat listnya di python di pprint, lalu ketik 'oke' jika sudah"
        // );
        // console.log("Result 4:", result4);

        // // Send "2 cerita lucu" and get the response
        // const result5 = await sendMessageAndGetResponse(
        //     2,
        //     "gemini",
        //     "buat 2 paragraf cerita lucu"
        // );
        // console.log("Result 5:", result5);
    } catch (error) {
        console.error("Unexpected error:", error.message);
    }
})();
