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

document.addEventListener('DOMContentLoaded', () => {
    const checkGrammarButton = document.createElement('button');
    checkGrammarButton.id = 'checkGrammarButton';
    checkGrammarButton.className = 'check-grammar-button';
    checkGrammarButton.textContent = 'Check Grammar';
    document.querySelector('.container').insertBefore(checkGrammarButton, document.getElementById('settingsButton').nextSibling);

    checkGrammarButton.addEventListener('click', () => {
        const input = document.getElementById('searchBox').value.trim();
        if (input) {
            checkGrammar(input);
        } else {
            alert('Please enter a sentence to check for grammar.');
        }
    });
});

async function checkGrammar(text) {
    try {
        const keyResponse = await fetch('/api/getRandomKeys');
        const { uid, tokenid } = await keyResponse.json();

        const response = await fetch(`https://www.stands4.com/services/v2/grammar.php?uid=${uid}&tokenid=${tokenid}&text=${encodeURIComponent(text)}&format=json`);
        const data = await response.json();

        console.log('Grammar Check Result:', data);

        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            displayGrammarCheckResult(data);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to check grammar.');
    }
}

function displayGrammarCheckResult(data) {
    const definitionContainer = document.getElementById('definitionContainer');
    definitionContainer.innerHTML = '<h2>Grammar Check Result</h2>';

    if (data.matches && data.matches.length > 0) {
        data.matches.forEach((match, index) => {
            const message = match.message;
            const context = match.context.text;
            const offset = match.context.offset;
            const length = match.context.length;
            const replacementSuggestions = match.replacements.map(rep => rep.value).join(', ');

            const highlightedText = `${context.substring(0, offset)}<span class="highlight">${context.substring(offset, offset + length)}</span>${context.substring(offset + length)}`;

            definitionContainer.innerHTML += `
                <div class="grammar-issue">
                    <p>${index + 1}. ${message}</p>
                    <p><strong>Context:</strong> ${highlightedText}</p>
                    <p><strong>Suggested Replacements:</strong> ${replacementSuggestions || 'None'}</p>
                </div>
            `;
        });
    } else {
        definitionContainer.innerHTML += '<p>No issues found.</p>';
    }

    definitionContainer.classList.remove('hidden');
    definitionContainer.classList.add('expand');
}

document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveCustomApiButton');
    const customUidInput = document.getElementById('customUid');
    const customTokenIdInput = document.getElementById('customTokenId');
    const settingsButton = document.getElementById('settingsButton');
    const settingsContainer = document.getElementById('settingsContainer');

    // Toggle visibility when the button is clicked
    settingsButton.addEventListener('click', () => {
        if (settingsContainer.classList.contains('hidden')) {
            settingsContainer.classList.remove('hidden');
            settingsContainer.classList.add('active');
        } else {
            settingsContainer.classList.add('hidden');
            settingsContainer.classList.remove('active');
        }
    });

    if (localStorage.getItem('customUid')) {
        customUidInput.value = localStorage.getItem('customUid');
    }
    if (localStorage.getItem('customTokenId')) {
        customTokenIdInput.value = localStorage.getItem('customTokenId');
    }

    saveButton.addEventListener('click', () => {
        const customUid = customUidInput.value;
        const customTokenId = customTokenIdInput.value;

        if (customUid && customTokenId) {
            localStorage.setItem('customUid', customUid);
            localStorage.setItem('customTokenId', customTokenId);
            alert('Custom API keys saved! The website will now use your input API keys.');
        } else {
            alert('Please fill in both the UID and TokenID before saving.');
        }
    });
});

async function fetchDefinition(input) {
    const definitionContainer = document.getElementById('definitionContainer');
    const customUid = localStorage.getItem('customUid');
    const customTokenId = localStorage.getItem('customTokenId');

    // Count the number of words in the input
    const wordCount = input.split(/\s+/).length;

    if (!definitionContainer.classList.contains('hidden') && definitionContainer.classList.contains('expand')) {
        definitionContainer.classList.remove('expand');
        definitionContainer.classList.add('contract');
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    definitionContainer.classList.remove('contract');
    definitionContainer.innerHTML = '';

    try {
        // Logic for handling API calls based on word count
        if (wordCount === 1) {
            // Only call the Free Dictionary API for a single word
            const dictionaryResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${input}`);
            const dictionaryData = await dictionaryResponse.json();

            if (Array.isArray(dictionaryData) && dictionaryData.length > 0) {
                console.log('Valid result from Free Dictionary API:', dictionaryData);
                displayDefinitionContent(dictionaryData, input);
                return; // Exit the function after finding a result
            } else {
                alert('No definition found for this word in the Free Dictionary.');
            }
        } else if (wordCount >= 2) {
            const dictionaryResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${input}`);
            const dictionaryData = await dictionaryResponse.json();

            if (Array.isArray(dictionaryData) && dictionaryData.length > 0) {
                console.log('Valid result from Free Dictionary API:', dictionaryData);
                displayDefinitionContent(dictionaryData, input);
                return; 
            } else {
                let phraseUrl;
                if (customUid && customTokenId) {
                    phraseUrl = `/api/fetchPhrase?phrase=${input}&customUid=${customUid}&customTokenId=${customTokenId}`;
                } else {
                    const selectedKeyIndex = document.getElementById('api-select').value;
                    phraseUrl = `/api/fetchPhrase?phrase=${input}&keyIndex=${selectedKeyIndex}`;
                }

                const phraseResponse = await fetch(phraseUrl);
                const phraseData = await phraseResponse.json();

                console.log('Full API response:', phraseData);

                if (phraseData.result) {
                    console.log('Valid result found from phrases.com:', phraseData.result);
                    const resultArray = Array.isArray(phraseData.result) ? phraseData.result : [phraseData.result];
                    let content = '<span id="closeIcon" class="close-icon">&times;</span>';

                    resultArray.forEach((result, index) => {
                        content += `<h2>Definition ${index + 1} of "${result.term}"</h2>`;
                        content += `<p>${result.explanation}</p>`;

                        if (result.example) {
                            content += `<p><em>Example: ${result.example}</em></p>`;
                        }

                        if (index < resultArray.length - 1) {
                            content += '<hr>';
                        }
                    });

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
                    alert('No definition found for this phrase.');
                }
            }
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

