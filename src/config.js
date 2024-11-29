const CONFIG = {
    url: "https://www.superai.id/login",
    cookiesPath: "././cookies.json",
    selectors: {
        // Login
        loginButton: 'button[data-sentry-component="SignInWithGoogle"]',
        // Recent Chat
        newButton: 'button[data-sentry-element="Button"] > p:contains("New")',
        recentChatsContainer: "div.flex.flex-col.flex-grow.flex-shrink.basis-0.text-sm.text-zinc-500",
        chatItems: "div.group.flex.flex-row.justify-start.items-center",
        // Model
        dropdownButton: "button.text-zinc-800",
        dropdownOptionsContainer: "div.absolute.right-0",
        // Chat
        textArea: 'textarea[data-sentry-component="InputTextArea"]',
        sendButton: 'button[data-sentry-component="ButtonSending"]',
        responseParent: "div.flex.flex-col.w-full.space-y-6.px-3.py-4.pb-20.bg-background.mt-14",
        responseChild: "div.markdown-content",
        chat: {
            recentChatsContainer: "div.flex.flex-col.flex-grow.flex-shrink.basis-0.text-sm.text-zinc-500",
            chatItems: "div.group.flex.flex-row.justify-start.items-center",
        },
    },
    dropdownOptions: {
        gemini: "Gemini 1.5",
        llama: "Llama 3.1",
        chatgpt: "ChatGPT 4o",
    },
    separatorMessage: "ignore this message because it is a separator, reply with 'c2VwYXJhdG9y' only.",
    separatorKey: "c2VwYXJhdG9y",
};

module.exports = CONFIG;
