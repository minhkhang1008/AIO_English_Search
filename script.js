let worker = new Worker('worker.js');
let currentSuggestionIndex = -1;
const GOOGLE_CLIENT_ID = '628893449247-lqos18hss794hks767eht0abnpceavc8.apps.googleusercontent.com';
let currentUser = null; 
let userFavorites = []; 

// Google Sign-In
async function handleAuthCodeResponse(response) {
  const idToken = response.credential;
  try {
    const res = await fetch('/api/auth/google-signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: idToken }),
    });

    if (!res.ok) throw new Error(`Backend error: ${res.statusText}`);

    const userData = await res.json();
    currentUser = { id: userData.id, fullName: userData.fullName, picture: userData.picture };
    userFavorites = userData.favorites || [];

    updateSigninStatus(true);
    renderFavoritesSidebar();

  } catch (err) {
    console.error('[App] Sign-in flow failed:', err);
    alert('Sign-in failed. Please try again later.');
  }
}

async function handleSignOut() {
  try {
    await fetch('/api/auth/signout');
  } catch {}
  currentUser = null;
  userFavorites = [];
  updateSigninStatus(false);
  renderFavoritesSidebar(); 
}

function updateSigninStatus(isSignedIn) {
  const signInButton = document.getElementById('googleSignInButton');
  const signOutButton = document.getElementById('googleSignOutButton');

  if (isSignedIn && currentUser) {
    signInButton.style.display = 'none';
    signOutButton.style.display = 'flex'; // Use flex to align items properly
    signOutButton.querySelector('#signOutUserName').textContent = currentUser.fullName;
    signOutButton.querySelector('#signOutProfilePic').src = currentUser.picture;
  } else {
    signInButton.style.display = 'flex';
    signOutButton.style.display = 'none';
  }
}

function initOAuth() {
  if (typeof google === 'object' && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleAuthCodeResponse,
      ux_mode: 'popup',
      auto_select: false,
      use_fedcm_for_prompt: true,
    });
    return true;
  }
  return false;
}

if (!initOAuth()) {
  let attempts = 0;
  const gisPoll = setInterval(() => {
    attempts += 1;
    if (initOAuth() || attempts > 25) {
      clearInterval(gisPoll);
    }
  }, 200);
}

// Web Worker
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

// Search Functions
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

function highlightMatch(word, query) {
  let regex = new RegExp(`(${query})`, 'gi');
  return word.replace(regex, '<span class="highlight">$1</span>');
}

function handleSuggestionClick(suggestion) {
  document.getElementById('searchBox').value = suggestion;
  document.getElementById('suggestionList').innerHTML = '';
  currentSuggestionIndex = -1;
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

// Translation
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

// Grammar Check
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

// Definition Functions
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
        displayDefinitionContent(dictionaryData, input);
        return;
      } else {
        alert('No definition found for this word in the Free Dictionary.');
      }
    } else if (wordCount >= 2) {
      const dictionaryResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${input}`);
      const dictionaryData = await dictionaryResponse.json();

      if (Array.isArray(dictionaryData) && dictionaryData.length > 0) {
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

        if (phraseData.result) {
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

const origDisplayDefinitionContent = displayDefinitionContent;
window.displayDefinitionContent = (...args) => {
  origDisplayDefinitionContent(...args);
  setTimeout(addFavoriteIconsToDefinitions, 100);
};

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

// Action Functions
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

// Favorites System
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

function addFavoriteIconsToDefinitions() {
  const defContainer = document.getElementById('definitionContainer');
  if (!defContainer || defContainer.classList.contains('hidden')) return;
  if (defContainer.querySelector('.fav-toggle-btn')) return;
  
  const h2s = defContainer.querySelectorAll('h2, h3');
  h2s.forEach(h => {
    if (h.textContent.match(/Definition|Variant|of/)) return;
    
    let partOfSpeech = '';
    if (h.tagName === 'H3') partOfSpeech = h.textContent.trim();
    let word = defContainer.querySelector('h2') ? defContainer.querySelector('h2').textContent.replace(/^Definition of \"|\"$/g, '') : '';
    let meaningP = h.nextElementSibling;
    if (!meaningP || !meaningP.textContent) return;
    let defaultMeaning = meaningP.textContent.trim();

    const favId = makeFavoriteId(word, partOfSpeech, defaultMeaning);

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
  return userFavorites.some(f => f.id === favId);
}

function toggleFavorite({ word, partOfSpeech, defaultMeaning }) {
  if (!currentUser) {
    alert('Please sign in to save favorites.');
    return;
  }
  
  const id = btoa(unescape(encodeURIComponent(word + '|' + partOfSpeech + '|' + defaultMeaning)));
  const index = userFavorites.findIndex(f => f.id === id);

  if (index > -1) {
    userFavorites.splice(index, 1); // Remove from list
  } else {
    userFavorites.push({ // Add to list
      id, word, partOfSpeech, defaultMeaning,
      userMeaning: '', notes: '', highlight: '', addedAt: Date.now(),
    });
  }
  
  renderFavoritesSidebar(); // Update UI immediately
  saveFavoritesToBackend(); // Save changes to backend
}

function renderFavoritesSidebar() {
  const sidebar = document.getElementById('favoritesSidebar');
  const list = document.getElementById('favoritesList');
  if (!currentUser) {
    list.innerHTML = '<div class="sidebar-message">Sign in to see your favorite words.</div>';
    return;
  }
  if (userFavorites.length === 0) {
    list.innerHTML = '<div class="sidebar-message">Your favorite words will appear here.</div>';
    return;
  }
  
  // Sort and filter logic can be applied to `userFavorites` here before mapping
  // ...

  list.innerHTML = userFavorites.map(fav => `
    <div class="favorite-item ${fav.highlight ? 'highlight-' + fav.highlight : ''}">
      ${fav.word} (${fav.partOfSpeech}) - ${fav.defaultMeaning}
    </div>
  `).join('');

  // Re-attach event listeners for the newly created favorite items
  // ...
}

function showAddWordModal() {
  const addWordModalContainer = document.getElementById('addWordModalContainer');
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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Google Sign-In
  initOAuth();

  // Attach listener to custom sign-in button
  const signInButton = document.getElementById('googleSignInButton');
  if (signInButton) {
    signInButton.addEventListener('click', () => {
      google.accounts.id.prompt();
    });
  }

  // Attach listener to sign-out button
  const signOutButton = document.getElementById('googleSignOutButton');
  if (signOutButton) {
    signOutButton.addEventListener('click', handleSignOut);
  }

  const storedName = localStorage.getItem('userFullName') || '';
  const storedPic = localStorage.getItem('userPicture') || '';
  const isSignedIn = !!currentUser;
  updateSigninStatus(isSignedIn);

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
    if (typeof renderFavoritesSidebar === 'function') {
      const sidebar = document.getElementById('favoritesSidebar');
      if (sidebar && sidebar.classList.contains('expanded')) {
        renderFavoritesSidebar();
      }
    }
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
      if (typeof renderFavoritesSidebar === 'function') {
        const sidebar = document.getElementById('favoritesSidebar');
        if (sidebar && sidebar.classList.contains('expanded')) {
          renderFavoritesSidebar();
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

document.getElementById('translateButton').addEventListener('click', async () => {
  const input = document.getElementById('searchBox').value.trim();
  if (input) {
    const languageCodeInput = document.getElementById('languageCode');
    const targetLang = languageCodeInput.value;
    const translatedText = await translateText(input, 'en', targetLang);
    
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

// Favorites Sidebar Event Listeners
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

const addWordBtn = document.getElementById('addWordBtn');
addWordBtn.onclick = () => {
  showAddWordModal();
};

// Saves the entire list of favorites to the backend.
async function saveFavoritesToBackend() {
  if (!currentUser) return; // Cannot save if not logged in
  try {
    // In a real app, you would send an auth token here
    await fetch('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${currentUser.sessionToken}` // Example for real auth
      },
      body: JSON.stringify(userFavorites),
    });
  } catch (error) {
    console.error('Failed to save favorites:', error);
    alert('Could not save your favorites. Please check your connection.');
  }
}