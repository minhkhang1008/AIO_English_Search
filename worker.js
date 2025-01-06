importScripts('trie.js'); 
let trie = new Trie();
let maxResults = 200; 

onmessage = function (e) {
    if (e.data.command === 'loadWords') {
        let wordList = e.data.words;
        for (let word of wordList) {
            trie.insert(word);
        }
        postMessage({ status: 'loaded' });
    } else if (e.data.command === 'search') {
<<<<<<< HEAD
        let substring = e.data.prefix;
        let batchSize = 10; 
        let fetchedResults = [];
        let alreadySentResults = new Set();

        function fetchMoreResults() {
            let newResults = trie.search(substring, batchSize + fetchedResults.length);
            newResults = newResults.filter(res => !alreadySentResults.has(res));

            if (newResults.length > 0) {
                fetchedResults = [...fetchedResults, ...newResults];
                newResults.forEach(word => alreadySentResults.add(word));
                postMessage({ suggestions: newResults });
            }

            if (fetchedResults.length < maxResults) {
                setTimeout(fetchMoreResults, 100); 
            }
        }

        fetchMoreResults();
=======
        let prefix = e.data.prefix;
        let suggestions = trie.search(prefix, 20); 
        postMessage({ suggestions });
>>>>>>> parent of 15718e6 (Update suggestion list function)
    }
};