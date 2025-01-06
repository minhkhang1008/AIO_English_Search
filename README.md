# Updates
- Quick Search function
      + It uses Free Dictionary api to quickly gives you the definition, example,etc of the word or phrase you typed in
- Add audio pronunciation and internation ipa (thanks to [Free Dictionary API](https://dictionaryapi.dev/))
- Phrases.com api call to search for idioms and phrases
      + 4 presets switchable phrases.com api (each having 100 daily Quota) 
- Grammar.com api call to check for any Grammatically mistake in a sentence
      + It uses the same api key as Phrases.com
- For best long-text looking, I made the input field to be able to extend itself. Now, you can paste any significantly long text but still maintaining the ability of editing it.
- Suggestion list now showing words that INCLUDE the input, not just starting with it! (definitely useful for searching words from root word)


# Fix bug
- Slowness of suggestion function is fixed, you will no more experience lagging in the website
- Now showing all result from the Quick Search function
- Now calls F.D api first, then calls phrases.com api if it fails to get the result
- Google sign in using OAuth2.0

## Notes
- Please use [aio-english-search.vercel.app](https://aio-english-search.vercel.app) to use the preset phrases.com api since I put them as Environment Varible
- If you prefer to use them locally, modify the fetchPhrase.js and getRandomKeys.js from process env to your UID and TokenID

