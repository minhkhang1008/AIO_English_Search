# Updates

## Quick Search Function

- Utilizes the Free Dictionary API to quickly provide definitions, examples, etc., of the word you type in.
- For phrases and idioms, it uses the phrases.com API (The Web's Largest Resource for Phrases, Verbs & Idioms) to fetch definitions.

## New Features

- **Audio Pronunciation** and **International IPA** (thanks to [Free Dictionary API](https://dictionaryapi.dev/)).
- **Phrases.com API Call** to search for idioms and phrases.
  - Four switchable phrases.com API presets (each with a daily quota of 100 requests).
  - Option to add your own phrases.com API key (refer to [this instruction](https://aio-english-search.vercel.app/GetAPI.html) for detailed steps).

- **Grammar.com API Call** to check for grammatical errors in a sentence.
  - Uses the same API key as phrases.com.

## Bug Fixes

- Resolved the slowness issue in the suggestion function; the website now performs without lag.
- Improved the Quick Search function to display all results.
- The system now prioritizes calling the Free Dictionary API first, followed by the phrases.com API if the initial call fails.

## Notes

- Please use [aio-english-search.vercel.app](https://aio-english-search.vercel.app) to access the preset phrases.com API, as the keys are stored as environment variables.
- For local use, modify `fetchPhrase.js` and `getRandomKeys.js` from process env to your UID and TokenID

## Credit
- Free Dictionary api [Free Dictionary API](https://dictionaryapi.dev/)
- STANDS4 Phrases API and Grammar API service [Phrases.com](https://www.phrases.com/) and [Grammar.com](https://www.grammar.com/)
