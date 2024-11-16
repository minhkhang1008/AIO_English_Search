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

document.getElementById('searchBox').addEventListener('keydown', function (event) {
    let suggestionList = document.getElementById('suggestionList');
    let suggestions = suggestionList.getElementsByTagName('li');

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        currentSuggestionIndex++;
        if (currentSuggestionIndex >= suggestions.length) {
            currentSuggestionIndex = 0;
        }
        updateSuggestionHighlight(suggestions);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        currentSuggestionIndex--;
        if (currentSuggestionIndex < 0) {
            currentSuggestionIndex = suggestions.length - 1;
        }
        updateSuggestionHighlight(suggestions);
    } else if (event.key === 'Enter') {
        if (currentSuggestionIndex > -1 && suggestions[currentSuggestionIndex]) {
            event.preventDefault();
            suggestions[currentSuggestionIndex].click();
            currentSuggestionIndex = -1;
        } else {
            let input = event.target.value.trim().toLowerCase();
            if (input) {
                if (event.shiftKey) {
                    fetchDefinition(input);
                } else {
                    performAction(input);
                }
            }
        }
    } else {
        currentSuggestionIndex = -1;
    }
});

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

    if (!definitionContainer.classList.contains('hidden') && definitionContainer.classList.contains('expand')) {
        definitionContainer.classList.remove('expand');
        definitionContainer.classList.add('contract');
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    definitionContainer.classList.remove('contract');
    definitionContainer.innerHTML = '';

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${input}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            displayDefinitionContent(data, input);
        } else if (input.split(/\s+/).length >= 2) {
            const phraseInput = input.replace(/\s+/g, '+');
            const phraseResponse = await fetch(`/api/fetchPhrase?phrase=${phraseInput}`);
            const phraseData = await phraseResponse.json();
            
            // Debugging: Log the full response
            console.log('Full API response:', phraseData);

            if (phraseData.results && phraseData.results.result) {
                console.log('Valid result found:', phraseData.results.result);
                const result = phraseData.results.result;
                let content = '<span id="closeIcon" class="close-icon">&times;</span>';
                content += `<h2>Definition of "${result.term}"</h2>`;
                content += `<p>${result.explanation}</p>`;

                if (result.example) {
                    content += `<p><em>Example: ${result.example}</em></p>`;
                }

                definitionContainer.innerHTML = content;
                definitionContainer.classList.remove('hidden');
                definitionContainer.classList.add('expand');

                document.getElementById('closeIcon').addEventListener('click', function () {
                    definitionContainer.classList.remove('expand');
                    definitionContainer.classList.add('contract');
                    setTimeout(() => {
                        definitionContainer.classList.add('hidden');
                        definitionContainer.classList.remove('contract');
                    }, 1000);
                });
            } else {
                console.warn('No valid data in the response:', phraseData);
                alert('No definition found for this word.');
            }
        } else {
            alert('No definition found for this word.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to fetch definition.');
    }
}

function displayDefinitionContent(data, input) {
    let content = '<span id="closeIcon" class="close-icon">&times;</span>';
    content += `<h2>Definition of "${input}"</h2>`;

    data.forEach((entry, entryIndex) => {
        if (entry.word && entry.word.toLowerCase() !== input.toLowerCase()) {
            content += `<h3>Variant: ${entry.word}</h3>`;
        }

        entry.phonetics.forEach((phonetic) => {
            if (phonetic.text) {
                content += `<p><strong>Phonetic:</strong> ${phonetic.text}</p>`;
            }
            if (phonetic.audio) {
                let label = getPronunciationLabel(phonetic);
                content += `
                    <button onclick="playAudio('${phonetic.audio}')" class="audio-button">
                        🔊 ${label}
                    </button>
                `;
            }
        });

        if (entry.origin) {
            content += `<p><strong>Origin:</strong> ${entry.origin}</p>`;
        }

        entry.meanings.forEach(meaning => {
            content += `<h3>${meaning.partOfSpeech}</h3>`;

            if (meaning.synonyms && meaning.synonyms.length > 0) {
                content += `<p><strong>Synonyms:</strong> ${meaning.synonyms.join(', ')}</p>`;
            }
            if (meaning.antonyms && meaning.antonyms.length > 0) {
                content += `<p><strong>Antonyms:</strong> ${meaning.antonyms.join(', ')}</p>`;
            }

            meaning.definitions.forEach((def, defIndex) => {
                content += `<p>${defIndex + 1}. ${def.definition}</p>`;
                if (def.example) {
                    content += `<p><em>Example: ${def.example}</em></p>`;
                }
                if (def.synonyms && def.synonyms.length > 0) {
                    content += `<p><strong>Synonyms:</strong> ${def.synonyms.join(', ')}</p>`;
                }
                if (def.antonyms && def.antonyms.length > 0) {
                    content += `<p><strong>Antonyms:</strong> ${def.antonyms.join(', ')}</p>`;
                }
            });
        });

        if (data.length > 1 && entryIndex < data.length - 1) {
            content += '<hr>';
        }
    });

    const definitionContainer = document.getElementById('definitionContainer');
    definitionContainer.innerHTML = content;
    definitionContainer.classList.remove('hidden');
    definitionContainer.classList.add('expand');

    document.getElementById('closeIcon').addEventListener('click', function () {
        definitionContainer.classList.remove('expand');
        definitionContainer.classList.add('contract');
        setTimeout(() => {
            definitionContainer.classList.add('hidden');
            definitionContainer.classList.remove('contract');
        }, 1000);
    });
}


function getPronunciationLabel(phonetic) {
    let label = 'PLAY PRONUNCIATION';
    const audioUrl = phonetic.audio;

    const match = audioUrl.match(/\/([^\/]+)-([a-z]{2})\.mp3$/);
    if (match) {
        const countryCode = match[2].toUpperCase(); 
        label = `${countryCode} pronunciation`; 
    }

    return label;
}


function playAudio(audioUrl) {
    if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(err => {
            console.error('Audio playback error:', err);
            alert('Failed to play audio.');
        });
    } else {
        alert('Audio not available for this word.');
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

function performAction(input) {
    let wordCount = input.split(/\s+/).length;
    let buttonContainer = document.getElementById('buttonContainer');
    let container = document.querySelector('.container');

    buttonContainer.innerHTML = '';
    buttonContainer.classList.remove('visible');
    buttonContainer.classList.add('hidden');
    container.classList.remove('buttons-visible');

    if (wordCount >= 2) {
        buttonContainer.classList.remove('hidden');

        let phrasalVerbBtn = document.createElement('button');
        phrasalVerbBtn.classList.add('action-button');
        phrasalVerbBtn.innerHTML = '<img src="VJ.png" alt="Phrasal Verb Icon" class="icon"> Phrasal Verb';
        phrasalVerbBtn.onclick = function () {
            let urlSafeWord = input.replace(/\s+/g, '-');
            clearButtons();
            openUrl(`https://vietjack.com/cum-dong-tu/${urlSafeWord}.jsp`);
        };

        let googleTranslateBtn = document.createElement('button');
        googleTranslateBtn.classList.add('action-button');
        googleTranslateBtn.innerHTML = '<img src="ggtrans.png" alt="Translate Icon" class="icon"> Translate';
        googleTranslateBtn.onclick = function () {
            let urlSafeText = encodeURIComponent(input);
            clearButtons();
            openUrl(`https://translate.google.com/?sl=en&tl=vi&text=${urlSafeText}&op=translate`);
        };

        let googleSearchBtn = document.createElement('button');
        googleSearchBtn.classList.add('action-button');
        googleSearchBtn.innerHTML = '<img src="google.png" alt="Google Search Icon" class="icon"> Google Search';
        googleSearchBtn.onclick = function () {
            let urlSafeText = encodeURIComponent(input);
            clearButtons();
            openUrl(`https://www.google.com/search?q=${urlSafeText}`);
        };

        buttonContainer.appendChild(phrasalVerbBtn);
        buttonContainer.appendChild(googleTranslateBtn);
        buttonContainer.appendChild(googleSearchBtn);
        container.classList.add('buttons-visible');

        setTimeout(() => {
            buttonContainer.classList.add('visible');
            phrasalVerbBtn.classList.add('show');
            googleTranslateBtn.classList.add('show');
            googleSearchBtn.classList.add('show');
        }, 50);
    } else if (wordCount === 1) {
        let urlSafeWord = input.replace(/\s+/g, '-');
        openUrl(`https://dictionary.cambridge.org/dictionary/english/${urlSafeWord}`);
    }
}

function updateSuggestionHighlight(suggestions) {
    for (let i = 0; i < suggestions.length; i++) {
        suggestions[i].classList.remove('active');
    }
    if (currentSuggestionIndex > -1 && suggestions[currentSuggestionIndex]) {
        suggestions[currentSuggestionIndex].classList.add('active');
        document.getElementById('searchBox').value = suggestions[currentSuggestionIndex].textContent;
    }
}

function clearButtons() {
    let buttonContainer = document.getElementById('buttonContainer');
    let buttons = buttonContainer.querySelectorAll('.action-button');
    buttons.forEach(button => {
        button.classList.remove('show');
    });
    buttonContainer.classList.remove('visible');
    buttonContainer.classList.add('hidden');
    setTimeout(() => {
        buttonContainer.innerHTML = '';
        document.getElementById('searchBox').value = '';
    }, 500);
}

function openUrl(url) {
    if (window.innerWidth <= 800) {
        window.location.href = url;
    } else {
        window.open(url, '_blank');
    }
    setTimeout(() => {
        window.location.reload();
    }, 500); 
}

