let worker = new Worker('worker.js');
let currentSuggestionIndex = -1;

const GOOGLE_CLIENT_ID = '628893449247-lqos18hss794hks767eht0abnpceavc8.apps.googleusercontent.com';
let googleAuth = null;          
window.currentUserId = localStorage.getItem('currentUserId') || 'guest';

function initGoogleAuth() {
  if (!window.gapi) return; 

  gapi.load('auth2', () => {
    googleAuth = gapi.auth2.init({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'profile email'
    });

    googleAuth.then(updateGoogleSigninStatus);
  });
}

function updateGoogleSigninStatus() {
  const btn = document.getElementById('googleSignInButton');
  if (!btn || !googleAuth) return;

  if (googleAuth.isSignedIn.get()) {
    const profile = googleAuth.currentUser.get().getBasicProfile();
    window.currentUserId = profile.getId();
    localStorage.setItem('currentUserId', window.currentUserId);
    btn.textContent = `Sign out (${profile.getGivenName()})`;
  } else {
    window.currentUserId = 'guest';
    localStorage.setItem('currentUserId', window.currentUserId);
    btn.innerHTML = `<svg view="0 0 256 262" preserveAspectRatio="xMidYMid" xmlns="http://www.w3.org/2000/svg"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"></path><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"></path><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"></path><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"></path></svg> Continue with Google`;
  }
  renderFavoritesSidebar();
}

document.addEventListener('DOMContentLoaded', () => {
  const googleBtn = document.getElementById('googleSignInButton');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      if (!googleAuth) return; // Not ready yet
      if (googleAuth.isSignedIn.get()) {
        googleAuth.signOut().then(updateGoogleSigninStatus);
      } else {
        googleAuth.signIn().then(updateGoogleSigninStatus);
      }
    });
  }

  // Wait until gapi script is ready
  const gapiPoll = setInterval(() => {
    if (window.gapi) {
      clearInterval(gapiPoll);
      initGoogleAuth();
    }
  }, 100);
});

// ---------------- END GOOGLE SIGN-IN SETUP ----------------

worker.onmessage = function (e) {
    if (e.data.status === 'loaded') {
        console.log('Trie loaded in Web Worker');
    } else if (e.data.suggestions) {
        updateSuggestionList(e.data.suggestions);
    } else {
        console.error('Unexpected message from worker:', e.data);
    }
};

worker.onerror = function (error) {
    console.error('Worker encountered an error:', error.message);
    alert('An error occurred while processing suggestions.');
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
                document.getElementById('suggestionList').innerHTML = ''; 
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

async function translateText(text, sourceLang, targetLang) {
    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`);
        if (!response.ok) {
            throw new Error('Translation request failed');
        }
        const data = await response.json();
        return data.responseData.translatedText;
    } catch (error) {
        console.error('Error during translation:', error);
        alert('Failed to translate. Please try again.');
        return null;
    }
}

document.getElementById('translateButton').addEventListener('click', async () => {
    const input = document.getElementById('searchBox').value.trim();
    if (input) {
        const languageCodeInput = document.getElementById('languageCode');
        const targetLang = languageCodeInput.value; // Get the selected language code

        const translatedText = await translateText(input, 'en', targetLang); // Use the selected language code
        
        if (translatedText) {
            const definitionContainer = document.getElementById('definitionContainer');
            definitionContainer.innerHTML = `
                <h2>Translation</h2>
                <p><strong>Original:</strong> ${input}</p>
                <p><strong>Translated:</strong> ${translatedText}</p>
            `;
            definitionContainer.classList.remove('hidden');
            definitionContainer.classList.add('expand');
        }
        document.getElementById('suggestionList').innerHTML = ''; 
    } else {
        alert('Please enter text to translate.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const settingsButton = document.getElementById('settingsButton');
    const settingsContainer = document.getElementById('settingsContainer');

    settingsButton.addEventListener('click', () => {
        settingsContainer.classList.toggle('hidden');
    });

    const languageCodeInput = document.getElementById('languageCode');

    const countryRadios = document.querySelectorAll('.ui-wrapper input[name="flag"]');

    const updateLanguageCode = (languageCode) => {
        languageCodeInput.value = languageCode; 
        localStorage.setItem('lastLanguageCode', languageCode); 
    };

    countryRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedCountry = radio.id;
            const label = document.querySelector(`label[for="${selectedCountry}"]`);
            if (label) {
                const match = label.textContent.match(/\((\w+)\)/);
                if (match) {
                    const languageCode = match[1];
                    updateLanguageCode(languageCode);
                }
            }
        });
    });

    const lastLanguageCode = localStorage.getItem('lastLanguageCode');

    if (lastLanguageCode) {
        const lastSelectedRadio = Array.from(countryRadios).find(radio => {
            const countryLabel = document.querySelector(`label[for="${radio.id}"]`);
            return countryLabel && countryLabel.textContent.includes(`(${lastLanguageCode})`);
        });

        if (lastSelectedRadio) {
            lastSelectedRadio.checked = true; 
            updateLanguageCode(lastLanguageCode); 
        }
    } else {
        const defaultCountry = document.getElementById('Vietnamese');
        if (defaultCountry) {
            defaultCountry.checked = true;
            updateLanguageCode('vi');
        }
    }

    document.addEventListener('keydown', (event) => {
        const dropdownCheckbox = document.querySelector('.dropdown-checkbox');
        if (!dropdownCheckbox || !dropdownCheckbox.checked) return; 

        const key = event.key.toUpperCase();
        if (!/^[A-Z]$/.test(key)) return; 

        const countryItems = document.querySelectorAll('.select-wrapper ul li');
        for (const item of countryItems) {
            const countryName = item.textContent.trim().toUpperCase();
            if (countryName.startsWith(key)) {
                item.scrollIntoView({ behavior: 'smooth', block: 'start' });
                break; 
            }
        }
    });
});

async function checkGrammar(text) {
    try {
        const keyResponse = await fetch('/api/getRandomKeys');
        if (!keyResponse.ok) throw new Error('Failed to fetch API keys');
        const { uid, tokenid } = await keyResponse.json();

        const response = await fetch(`https://www.stands4.com/services/v2/grammar.php?uid=${uid}&tokenid=${tokenid}&text=${encodeURIComponent(text)}&format=json`);
        if (!response.ok) throw new Error('Grammar API request failed');
        const data = await response.json();

        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            displayGrammarCheckResult(data);
        }
    } catch (error) {
        console.error('Error:', error.message);
        alert('An error occurred while checking grammar. Please try again.');
    }
}

function displayGrammarCheckResult(data) {
    const definitionContainer = document.getElementById('definitionContainer');
    definitionContainer.innerHTML = '<h2>Grammar Check Result</h2>';

    if (data.matches && data.matches.length > 0) {
        data.matches.forEach((match, index) => {
            const { message, context, replacements } = match;
            const highlightedText = `${context.text.substring(0, context.offset)}<span class="highlight">${context.text.substring(context.offset, context.offset + context.length)}</span>${context.text.substring(context.offset + context.length)}`;
            const replacementSuggestions = replacements.map(rep => rep.value).join(', ');

            definitionContainer.innerHTML += `
                <div class="grammar-issue">
                    <p>${index + 1}. ${message}</p>
                    <p><strong>Context:</strong> ${highlightedText}</p>
                    <p><strong>Suggested Replacements:</strong> ${replacementSuggestions || 'None'}</p>
                </div>
            `;
        });
    } else {
        definitionContainer.innerHTML += '<p>No grammar issues detected.</p>';
    }

    definitionContainer.classList.remove('hidden');
    definitionContainer.classList.add('expand');
}

document.addEventListener('DOMContentLoaded', () => {
    const checkGrammarButton = document.getElementById('checkGrammarButton');
    checkGrammarButton.addEventListener('click', () => {
        const input = document.getElementById('searchBox').value.trim();
        if (input) {
            checkGrammar(input);
            document.getElementById('suggestionList').innerHTML = ''; 
        } else {
            alert('Please enter a sentence to check for grammar.');
        }
    });

    const searchBox = document.getElementById('searchBox');
    function autoResize() {
        searchBox.style.height = 'auto'; 
        searchBox.style.height = searchBox.scrollHeight + 'px';
    }
    searchBox.addEventListener('input', autoResize);
    autoResize();
});

async function fetchDefinition(input) {
    const definitionContainer = document.getElementById('definitionContainer');
    const customUid = localStorage.getItem('customUid');
    const customTokenId = localStorage.getItem('customTokenId');

    const wordCount = input.split(/\s+/).length;

    if (!definitionContainer.classList.contains('hidden') && definitionContainer.classList.contains('expand')) {
        definitionContainer.classList.remove('expand');
        definitionContainer.classList.add('contract');
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    definitionContainer.classList.remove('contract');
    definitionContainer.innerHTML = '';

    try {
        if (wordCount === 1) {
            const dictionaryResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${input}`);
            const dictionaryData = await dictionaryResponse.json();

            if (Array.isArray(dictionaryData) && dictionaryData.length > 0) {
                console.log('Valid result from Free Dictionary API:', dictionaryData);
                displayDefinitionContent(dictionaryData, input);
                return; 
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

// --- FAVORITE WORDS SYSTEM ---

function getFavoritesKey() {
  return 'favoriteWords_' + (window.currentUserId || 'guest');
}

function getFavorites() {
  return JSON.parse(localStorage.getItem(getFavoritesKey()) || '[]');
}

function saveFavorites(favs) {
  localStorage.setItem(getFavoritesKey(), JSON.stringify(favs));
}

function makeFavoriteId(word, partOfSpeech, defaultMeaning) {
  return btoa(unescape(encodeURIComponent(word + '|' + partOfSpeech + '|' + defaultMeaning))).replace(/=+$/, '');
}

// Add star icon to definitions
function addFavoriteIconsToDefinitions() {
  const defContainer = document.getElementById('definitionContainer');
  if (!defContainer || defContainer.classList.contains('hidden')) return;
  // Only add if not already present
  if (defContainer.querySelector('.fav-toggle-btn')) return;

  // Find all definition blocks
  const h2s = defContainer.querySelectorAll('h2, h3');
  h2s.forEach(h => {
    // Only for word/meaning headers
    if (h.textContent.match(/Definition|Variant|of/)) return;
    // Try to find part of speech and meaning
    let partOfSpeech = '';
    if (h.tagName === 'H3') partOfSpeech = h.textContent.trim();
    let word = defContainer.querySelector('h2') ? defContainer.querySelector('h2').textContent.replace(/^Definition of \"|\"$/g, '') : '';
    let meaningP = h.nextElementSibling;
    if (!meaningP || !meaningP.textContent) return;
    let defaultMeaning = meaningP.textContent.trim();

    // Unique id
    const favId = makeFavoriteId(word, partOfSpeech, defaultMeaning);

    // Star button
    const btn = document.createElement('button');
    btn.className = 'fav-toggle-btn';
    btn.title = 'Add/Remove Favorite';
    btn.innerHTML = isFavorite(favId) ? '★' : '☆';
    btn.style.cssText = 'font-size:1.2em;margin-left:0.5em;color:#ffeb3b;background:none;border:none;cursor:pointer;vertical-align:middle;text-shadow:0 0 2px #000,0 0 1px #000,1px 1px 0 #000,-1px -1px 0 #000;';
    btn.onclick = () => {
      toggleFavorite({ word, partOfSpeech, defaultMeaning });
      btn.innerHTML = isFavorite(favId) ? '★' : '☆';
      renderFavoritesSidebar();
    };
    h.appendChild(btn);
  });
}
function isFavorite(favId) {
  return getFavorites().some(f => f.id === favId);
}
function toggleFavorite({ word, partOfSpeech, defaultMeaning }) {
  let favs = getFavorites();
  const id = makeFavoriteId(word, partOfSpeech, defaultMeaning);
  const idx = favs.findIndex(f => f.id === id);
  if (idx > -1) {
    favs.splice(idx, 1);
  } else {
    favs.push({
      id, word, partOfSpeech, defaultMeaning,
      userMeaning: '', notes: '', highlight: '', addedAt: Date.now(),
      hideDefault: false
    });
  }
  saveFavorites(favs);
}

// Sidebar logic
function renderFavoritesSidebar() {
  const sidebar = document.getElementById('favoritesSidebar');
  const list = document.getElementById('favoritesList');
  let favs = getFavorites();

  // Filtering
  const filter = document.getElementById('favoritesFilter').value;
  if (filter) favs = favs.filter(f => (f.partOfSpeech || '').toLowerCase().includes(filter));

  // Sorting
  const sort = document.getElementById('favoritesSort').value;
  if (sort === 'az') favs.sort((a, b) => a.word.localeCompare(b.word));
  else if (sort === 'za') favs.sort((a, b) => b.word.localeCompare(a.word));
  else if (sort === 'recent') favs.sort((a, b) => b.addedAt - a.addedAt);

  // Get chosen language for translation
  let chosenLang = 'Translation';
  try {
    const langInput = document.getElementById('languageCode');
    if (langInput) {
      const code = langInput.value;
      const label = document.querySelector(`.select-wrapper ul li label[for]`);
      if (code && label) {
        chosenLang = label.textContent.match(/\((\w+)\)/) ? label.textContent.split('(')[0].trim() : code;
      } else if (code) {
        chosenLang = code;
      }
    }
  } catch {}

  list.innerHTML = '';
  if (!favs.length) {
    list.innerHTML = '<div style="color:#888;text-align:center;margin-top:2em;">No favorites yet.</div>';
    return;
  }
  favs.forEach(fav => {
    const item = document.createElement('div');
    item.className = 'favorite-item' + (fav.highlight ? ' highlight-' + fav.highlight : '');
    // Hide default meaning logic
    let showDefault = !fav.hideDefault;
    // Layout
    item.innerHTML = `
      <div><span class="fav-word"><b>${fav.word}</b></span> <span class="fav-pos">${fav.partOfSpeech || ''}</span></div>
      <div class="fav-section-label">Default:</div>
      <div class="fav-meaning-row" style="display:flex;align-items:center;gap:0.5em;">
        <span class="fav-meaning" style="${showDefault ? '' : 'display:none;'}">${fav.defaultMeaning}</span>
        <button class="fav-hide-default-btn${showDefault ? '' : ' active'}" title="Show/Hide Default">👁️</button>
      </div>
      <div class="fav-own-row">
        <span class="fav-section-label">Own meaning:</span>
        <span class="fav-own-value" style="${fav.userMeaning ? '' : 'display:none;'}">${fav.userMeaning || ''}</span>
        <button class="fav-edit-btn own" style="${fav.userMeaning ? '' : ''}">${fav.userMeaning ? 'Edit' : 'Add'}</button>
      </div>
      <textarea class="fav-edit-input own" style="display:none;" placeholder="Type your meaning and press Enter...">${fav.userMeaning || ''}</textarea>
      <div class="fav-notes-row">
        <span class="fav-section-label">Notes:</span>
        <span class="fav-notes-value" style="${fav.notes ? '' : 'display:none;'}">${fav.notes || ''}</span>
        <button class="fav-edit-btn notes" style="${fav.notes ? '' : ''}">${fav.notes ? 'Edit' : 'Add'}</button>
      </div>
      <textarea class="fav-edit-input notes" style="display:none;" placeholder="Type your notes and press Enter...">${fav.notes || ''}</textarea>
      <button class="show-translation-btn">Show ${chosenLang} meaning</button>
      <div class="fav-actions">
        <button class="fav-action-btn highlight-yellow" title="Highlight Yellow">●</button>
        <button class="fav-action-btn highlight-green" title="Highlight Green">●</button>
        <button class="fav-action-btn highlight-blue" title="Highlight Blue">●</button>
        <button class="fav-action-btn delete" title="Delete">🗑️</button>
      </div>
    `;
    // Hide default meaning toggle
    const hideBtn = item.querySelector('.fav-hide-default-btn');
    const defaultSpan = item.querySelector('.fav-meaning');
    hideBtn.onclick = () => {
      fav.hideDefault = !fav.hideDefault;
      saveFavorites(getFavorites().map(f => f.id === fav.id ? fav : f));
      renderFavoritesSidebar();
    };
    // Own meaning edit
    const ownEditBtn = item.querySelector('.fav-edit-btn.own');
    const ownValue = item.querySelector('.fav-own-value');
    const ownInput = item.querySelector('.fav-edit-input.own');
    ownEditBtn.onclick = () => {
      ownEditBtn.style.display = 'none';
      ownValue.style.display = 'none';
      ownInput.style.display = '';
      ownInput.focus();
    };
    ownInput.onkeydown = e => {
      if (e.key === 'Enter') {
        fav.userMeaning = ownInput.value.trim();
        saveFavorites(getFavorites().map(f => f.id === fav.id ? fav : f));
        renderFavoritesSidebar();
      }
    };
    ownInput.onblur = () => {
      fav.userMeaning = ownInput.value.trim();
      saveFavorites(getFavorites().map(f => f.id === fav.id ? fav : f));
      renderFavoritesSidebar();
    };
    // Notes edit
    const notesEditBtn = item.querySelector('.fav-edit-btn.notes');
    const notesValue = item.querySelector('.fav-notes-value');
    const notesInput = item.querySelector('.fav-edit-input.notes');
    notesEditBtn.onclick = () => {
      notesEditBtn.style.display = 'none';
      notesValue.style.display = 'none';
      notesInput.style.display = '';
      notesInput.focus();
    };
    notesInput.onkeydown = e => {
      if (e.key === 'Enter') {
        fav.notes = notesInput.value.trim();
        saveFavorites(getFavorites().map(f => f.id === fav.id ? fav : f));
        renderFavoritesSidebar();
      }
    };
    notesInput.onblur = () => {
      fav.notes = notesInput.value.trim();
      saveFavorites(getFavorites().map(f => f.id === fav.id ? fav : f));
      renderFavoritesSidebar();
    };
    // Highlight buttons
    const [yellow, green, blue, del] = item.querySelectorAll('.fav-action-btn');
    yellow.onclick = () => { fav.highlight = fav.highlight === 'yellow' ? '' : 'yellow'; saveFavorites(getFavorites().map(f => f.id === fav.id ? fav : f)); renderFavoritesSidebar(); };
    green.onclick = () => { fav.highlight = fav.highlight === 'green' ? '' : 'green'; saveFavorites(getFavorites().map(f => f.id === fav.id ? fav : f)); renderFavoritesSidebar(); };
    blue.onclick = () => { fav.highlight = fav.highlight === 'blue' ? '' : 'blue'; saveFavorites(getFavorites().map(f => f.id === fav.id ? fav : f)); renderFavoritesSidebar(); };
    del.onclick = () => { saveFavorites(getFavorites().filter(f => f.id !== fav.id)); renderFavoritesSidebar(); };
    // Show translation
    const showTransBtn = item.querySelector('.show-translation-btn');
    showTransBtn.onclick = async () => {
      const langCode = document.getElementById('languageCode')?.value || 'vi';
      const translated = await translateText(fav.word, 'en', langCode);
      if (translated) {
        showTransBtn.textContent = `→ ${translated}`;
        setTimeout(() => { showTransBtn.textContent = `Show ${chosenLang} meaning`; }, 4000);
      }
    };
    list.appendChild(item);
  });
}

// Sidebar open/close (toggle)
document.getElementById('toggleFavoritesSidebar').onclick = () => {
  const sidebar = document.getElementById('favoritesSidebar');
  if (sidebar.classList.contains('expanded')) {
    sidebar.classList.remove('expanded');
    sidebar.classList.add('collapsed');
  } else {
    sidebar.classList.add('expanded');
    sidebar.classList.remove('collapsed');
    renderFavoritesSidebar();
  }
};
document.getElementById('closeFavoritesSidebar').onclick = () => {
  document.getElementById('favoritesSidebar').classList.remove('expanded');
  document.getElementById('favoritesSidebar').classList.add('collapsed');
};
document.getElementById('favoritesSort').onchange = renderFavoritesSidebar;
document.getElementById('favoritesFilter').onchange = renderFavoritesSidebar;

// Export/Import/Random
document.getElementById('exportFavoritesBtn').onclick = () => {
  const data = JSON.stringify(getFavorites(), null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'favorite_words.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
document.getElementById('importFavoritesBtn').onclick = () => {
  document.getElementById('importFavoritesFile').click();
};
document.getElementById('importFavoritesFile').onchange = function() {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        saveFavorites(imported);
        renderFavoritesSidebar();
        alert('Favorites imported!');
      } else throw new Error();
    } catch {
      alert('Invalid file.');
    }
  };
  reader.readAsText(file);
};
document.getElementById('randomFavoriteBtn').onclick = () => {
  const favs = getFavorites();
  if (!favs.length) return alert('No favorites!');
  const rand = favs[Math.floor(Math.random() * favs.length)];
  alert(`Random Favorite:\n${rand.word} (${rand.partOfSpeech})\n${rand.userMeaning || rand.defaultMeaning}`);
};

// Add Word Modal
const addWordBtn = document.getElementById('addWordBtn');
const addWordModalContainer = document.getElementById('addWordModalContainer');
addWordBtn.onclick = () => {
  showAddWordModal();
};
function showAddWordModal() {
  addWordModalContainer.innerHTML = `
    <div class="add-word-modal">
      <h3>Add Your Own Word</h3>
      <input id="modalWord" placeholder="Word" />
      <select id="modalPOS">
        <option value="noun">Noun</option>
        <option value="verb">Verb</option>
        <option value="adjective">Adjective</option>
        <option value="adverb">Adverb</option>
        <option value="idiom">Idiom</option>
        <option value="phrase">Phrase</option>
        <option value="other">Other</option>
      </select>
      <textarea id="modalDefaultMeaning" placeholder="Default meaning (optional)"></textarea>
      <div class="modal-actions">
        <button id="modalAddBtn">Add</button>
        <button id="modalCancelBtn">Cancel</button>
      </div>
    </div>
  `;
  document.getElementById('modalWord').focus();
  document.getElementById('modalCancelBtn').onclick = () => {
    addWordModalContainer.innerHTML = '';
  };
  document.getElementById('modalAddBtn').onclick = () => {
    const word = document.getElementById('modalWord').value.trim();
    const pos = document.getElementById('modalPOS').value;
    const def = document.getElementById('modalDefaultMeaning').value.trim();
    if (!word) {
      alert('Word is required!');
      return;
    }
    const id = makeFavoriteId(word, pos, def);
    let favs = getFavorites();
    if (favs.some(f => f.id === id)) {
      alert('This word is already in your favorites!');
      return;
    }
    favs.push({
      id, word, partOfSpeech: pos, defaultMeaning: def,
      userMeaning: '', notes: '', highlight: '', addedAt: Date.now(), hideDefault: false
    });
    saveFavorites(favs);
    addWordModalContainer.innerHTML = '';
    renderFavoritesSidebar();
  };
}

// Add favorite icons after definition is shown
const origDisplayDefinitionContent = displayDefinitionContent;
window.displayDefinitionContent = function(...args) {
  origDisplayDefinitionContent.apply(this, args);
  setTimeout(addFavoriteIconsToDefinitions, 100);
};