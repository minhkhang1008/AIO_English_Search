importScripts('trie.js'); 
let trie = new Trie();

onmessage = function (e) {
    if (e.data.command === 'loadWords') {
        let wordList = e.data.words;
        for (let word of wordList) {
            trie.insert(word);
        }
        postMessage({ status: 'loaded' });
    } else if (e.data.command === 'search') {
        let prefix = e.data.prefix;
        let suggestions = trie.search(prefix, 20); 
        postMessage({ suggestions });
    }
};
