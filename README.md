# Updates
- Quick Search function
      + It uses Free Dictionary api to quickly gives you the definition, example,etc of the word or phrase you typed in
- Add audio pronunciation and internation ipa (thanks to [Free Dictionary API](https://dictionaryapi.dev/))
- [Phrases.com](https://phrases.com) api call to search for idioms and phrases
- Grammar.com api call to check for grammatical mistakes in your input
- For best long-text looking, I made the input field to be able to extend itself. Now, you can paste any significantly long text but still maintaining the ability of editing it.
- Suggestion list now showing words that INCLUDE the input, not just starting with it! (definitely useful for searching words from root word)
- Use https://mymemory.translated.net/ api for translation function 
      + Quite a lot of languages are added, choose yours from the list
      + Notes: Only support Simplified Chinese; use Tanalog language (different from Filipino Standard Tanalog)
      + Translation Quality is not guranteed, cannot translate idioms 
- Is able to mark words as favorites and manage them in a sidebar
      + Stored information:
            * The word itself
            * The default meaning (from Quick Search)
            * Your own meaning (add it yourself)
            * Your own notes to it (add it yourself)
            * Highlight it
      + The information is stored in local Storage of the browser
      + It can be exported into a json file and import back (useful when you want to share your list of favorite words or store it in case the browser storage is deleted)
      + Some words are not available in Quick Search so you can add your own
      

# Special Thanks
- [Free Dictionary API](https://dictionaryapi.dev/) - Quick Search Function
- [Phrases.com](https://phrases.com) by STANDS4 - Quick Search Function
- [Grammar.com](https://grammar.com) by STANDS4 - Grammar Check function
- [Mymemory](https://mymemory.translated.net/) by translated LABS - Translate function
- [UIVerse](https://uiverse.io) - Animation buttons