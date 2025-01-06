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

<<<<<<< HEAD
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
            if (currentWord.indexOf(substring) !== -1) {
                results.push(currentWord);
            }
        }

        for (let char in node.children) {
            this._collectWordsContaining(node.children[char], currentWord + char, substring, results, limit);
=======
    search(prefix, limit = 10) {
        let node = this.root;
        for (let char of prefix) {
            char = char.toLowerCase();
            if (!node.children[char]) {
                return [];
            }
            node = node.children[char];
>>>>>>> parent of 15718e6 (Update suggestion list function)
        }
        return this._collectAllWords(node, prefix, [], limit);
    }
}
<<<<<<< HEAD

if (typeof module !== 'undefined') {
    module.exports = { Trie, TrieNode };
}
=======
>>>>>>> parent of 15718e6 (Update suggestion list function)
