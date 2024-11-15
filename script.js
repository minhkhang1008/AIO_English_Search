let worker = new Worker('worker.js');
let currentSuggestionIndex = -1;

worker.onmessage = function (e) {
    if (e.data.status === 'loaded') {
        console.log('Trie loaded in Web Worker');
    } else if (e.data.suggestions) {
        updateSuggestionList(e.data.suggestions);
    }
};

fetch('words.txt')
    .then(response => response.text())
    .then(text => {
        let wordList = text.split('\n').map(word => word.trim().toLowerCase());
        worker.postMessage({ command: 'loadWords', words: wordList });
    });

function updateSuggestionList(suggestions) {
    let suggestionList = document.getElementById('suggestionList');
    suggestionList.innerHTML = '';
    currentSuggestionIndex = -1;

    suggestions.forEach(word => {
        let li = document.createElement('li');
        li.innerHTML = highlightMatch(word, document.getElementById('searchBox').value.trim().toLowerCase());
        li.addEventListener('click', function () {
            handleSuggestionClick(word);
        });
        suggestionList.appendChild(li);
    });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

document.getElementById('searchBox').addEventListener('input', debounce(function (event) {
    let input = event.target.value.trim().toLowerCase();
    if (input) {
        worker.postMessage({ command: 'search', prefix: input });
    } else {
        document.getElementById('suggestionList').innerHTML = '';
    }
}, 200)); 

document.getElementById('quickSearchButton').addEventListener('click', function () {
    const input = document.getElementById('searchBox').value.trim().toLowerCase();
    if (input) {
        fetchDefinition(input);
        document.getElementById('suggestionList').innerHTML = '';
        currentSuggestionIndex = -1;
    }
});

async function fetchDefinition(input) {
    const definitionContainer = document.getElementById('definitionContainer');
    definitionContainer.innerHTML = ''; // Clear previous responses
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${input}`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            let content = '<span id="closeIcon" class="close-icon">&times;</span>';
            content += `<h2>Definition of "${input}"</h2>`;
            data[0].meanings.forEach(meaning => {
                content += `<h3>${meaning.partOfSpeech}</h3>`;
                meaning.definitions.forEach((def, index) => {
                    content += `<p>${index + 1}. ${def.definition}</p>`;
                    if (def.example) {
                        content += `<p><em>Example: ${def.example}</em></p>`;
                    }
                });
            });
            definitionContainer.innerHTML = content;
        
            // Display with animation
            definitionContainer.classList.remove('hidden');
            void definitionContainer.offsetWidth;
            definitionContainer.classList.add('expand');
        
            document.getElementById('closeIcon').addEventListener('click', function() {
                definitionContainer.classList.remove('expand');
                setTimeout(() => {
                    definitionContainer.classList.add('hidden');
                }, 500); // Delay to allow animation to complete
            });
        } else {
            alert('No definition found for this word.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to fetch definition.');
    }
}

function highlightMatch(word, query) {
    let regex = new RegExp(`(${query})`, 'gi');
    return word.replace(regex, '<span class="highlight">$1</span>');
}

function handleSuggestionClick(suggestion) {
    document.getElementById('searchBox').value = suggestion;
    document.getElementById('suggestionList').innerHTML = '';
    currentSuggestionIndex = -1;
}
