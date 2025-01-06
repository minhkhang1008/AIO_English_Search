<<<<<<< HEAD
# Thanks for using my website
- Made with tired all by myself

# Functions
- Click "Enter" directs you to Cambridge Dictionary (1 word)
- Click "Enter" shows 3 actions buttons with different functions [Phrasal Verb Search from VJ] [Google Translate] [Google Search] (> 2 words)
- Quick Search uses [Free Dictionary api](https://dictionaryapi.dev/) to search for definition, synonyms, antonyms, pronunciation, examples and more
- Quick Search uses [Phrases.com api by STANDS4](https://www.phrases.com/phrases_api.php) to search for phrasal verbs, idioms 
- Grammar check uses [Grammar.com api by STANDS4](https://www.grammar.com/api.php) to check for any grammatical mistakes
- Suggestion lists use words in words.txt files (thanks to [nelsonic english-words repository](https://github.com/dwyl/english-words)) to show suggestions (words that include the input)
- Translation function uses Google Translate Unofficial [matheuss google-translate-api](https://github.com/matheuss/google-translate-api)
=======
# Updates
- Quick Search function
      + It uses Free Dictionary api to quickly gives you the definition, example,etc of the word or phrase you typed in
- Add audio pronunciation and internation ipa (thanks to [Free Dictionary API](https://dictionaryapi.dev/))
- Phrases.com api call to search for idioms and phrases
      + 4 presets switchable phrases.com api (each having 100 daily Quota) 
- Grammar.com api call to check for any Grammatically mistake in a sentence
      + It uses the same api key as Phrases.com
- For best long-text looking, I made the input field to be able to extend itself. Now, you can paste any significantly long text but still maintaining the ability of editing it.
>>>>>>> parent of 15718e6 (Update suggestion list function)

# Bug
- Google has nothing to do now
- I messed up, all functions die

# Future update
- Personalized experience with Google Sign-in

# Credit
- [Free Dictionary api](https://dictionaryapi.dev/) for Quick Search function
- [Phrases.com api by STANDS4](https://www.phrases.com/phrases_api.php) for Quick Search function
- [Grammar.com api by STANDS4](https://www.grammar.com/api.php) for Grammar Check function
- [matheuss google-translate-api](https://github.com/matheuss/google-translate-api) for Translation function
- [UIVerse](https://uiverse.io/) for buttons

## Notes
- Please use [aio-english-search.vercel.app](https://aio-english-search.vercel.app) to use the preset phrases.com api since I put them as Environment Varible
- If you prefer to use them locally, modify the fetchPhrase.js and getRandomKeys.js from process env to your UID and TokenID

## Change log
**1/12/2024**: Revert commit since Google sign-in doesn't work, still working on it
**8/12/22024**: I successfully add Google sign in (at least the button and the client id), working on it