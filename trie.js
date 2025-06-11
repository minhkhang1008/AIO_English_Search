class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let node = this.root;
        for (let char of word) {
            char = char.toLowerCase();
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEndOfWord = true;
    }

    search(substring, limit = 10) {
        let results = [];
        this._collectWordsContaining(this.root, '', substring.toLowerCase(), results, limit);
        return results;
    }

    _collectWordsContaining(node, currentWord, substring, results, limit) {
        if (results.length >= limit) {
            return;
        }
        if (node.isEndOfWord && currentWord.includes(substring)) {
            results.push(currentWord);
        }
        for (let char in node.children) {
            this._collectWordsContaining(node.children[char], currentWord + char, substring, results, limit);
        }
    }

    _collectAllWords(node, prefix, words, limit) {
        if (words.length >= limit) {
            return words;
        }
        if (node.isEndOfWord) {
            words.push(prefix);
        }
        for (let char in node.children) {
            if (words.length >= limit) {
                break;
            }
            this._collectAllWords(node.children[char], prefix + char, words, limit);
        }
        return words;
    }
}

if (typeof module !== 'undefined') {
    module.exports = { Trie, TrieNode }; 
}