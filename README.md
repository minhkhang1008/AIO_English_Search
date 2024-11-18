# Updates
- Quick Search function
      + It uses Free Dictionary api to quickly gives you the definition, example,etc of the word or phrase you typed in
- Add audio pronunciation and internation ipa (thanks to [Free Dictionary API](https://dictionaryapi.dev/))
- Phrases.com api call to search for idioms and phrases
      + 4 presets switchable phrases.com api (each having 100 daily Quota) 
      + Add your own phrases.com api (see [Instruction](https://aio-english-search.vercel.app/GetAPI.html) for detailed instruction)
- Grammar.com api call to check for any Grammatically mistake in a sentence
      + It uses the same api key as Phrases.com

# Fix bug
- Slowness of suggestion function is fixed, you will no more experience lagging in the website
- Now showing all result from the Quick Search function
- Now calls F.D api first, then calls phrases.com api if it fails to get the result

## Notes
- Please use [aio-english-search.vercel.app](https://aio-english-search.vercel.app) to use the preset phrases.com api since I put them as Environment Varible

**Personal**: 
- This is just a small project I do as a hobby to satisfy myself, I put my effort in it but I do not certainly focus on it since I have school work to do
