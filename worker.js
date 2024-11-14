importScripts('trie.js'); // Import the Trie class

let trie = new Trie();

// Listen for messages from the main thread
onmessage = function (e) {
    if (e.data.command === 'loadWords') {
        let wordList = e.data.words;
        for (let word of wordList) {
            trie.insert(word);
        }
        postMessage({ status: 'loaded' });
    } else if (e.data.command === 'search') {
        let prefix = e.data.prefix;
        let suggestions = trie.search(prefix, 10); // Limit to 10 suggestions
        postMessage({ suggestions });
    }
};
