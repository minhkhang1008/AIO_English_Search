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

    search(prefix, limit = 10) {
        let node = this.root;
        for (let char of prefix) {
            char = char.toLowerCase();
            if (!node.children[char]) {
                return [];
            }
            node = node.children[char];
        }
        return this._collectAllWords(node, prefix, [], limit);
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
