# GiftFinder

A lightweight front-end for collecting gift preferences and sending the submission to a Telegram chat via a bot.

## Getting started

1. Create or reuse a Telegram bot token via [@BotFather](https://t.me/botfather).
2. Find the chat ID where you want to receive submissions. A quick option is to add [@RawDataBot](https://t.me/RawDataBot) to the chat and send a message, then copy the `chat.id` value it returns.
3. Open [`config.js`](./config.js) and replace the placeholder values with your bot token and chat ID. You can also point `IP_LOOKUP_URL` at a preferred geolocation service if you do not want to use the default `ipapi.co` endpoint.
4. Open [`index.html`](./index.html) in your browser (or serve the folder using any static file server) and submit the form.

## How it works

* `index.html` hosts the GiftFinder form and pulls in the styling and logic.
* `assets/styles.css` styles the page with a minimal, responsive layout.
* `assets/app.js` formats the form data, augments it with client context/telemetry details (IP lookup, referrer, languages, navigation timing, cookies, user agent, client hints, and captured errors), and sends a `sendMessage` request to the Telegram Bot API defined in `config.js`.

## Notes

* The credentials in `config.js` are loaded on the client, so avoid committing real tokens if you fork the project publicly.
* Responses are formatted using Telegram's HTML parse mode. Update `buildMessage` in `assets/app.js` if you want to tweak the format.
