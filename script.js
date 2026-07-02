const API_KEY = ''
const BASE_URL = ''

// Elements
const movieSearchInput = document.getElementById('movieSearch');
const moviesSection = document.getElementById('movies-section');
const sidebarItems = document.querySelectorAll('.menu-list button[data-category], .sidebar-icon[data-category]');
const starFilter = document.getElementById('starFilter');

// Global State
let currentCategory = 'all';
let categoryPages = {
    'now_playing': 1,
    'popular': 1,
    'top_rated': 1,
    'upcoming': 1
};
let isLoading = false;
let hasMorePages = true;
let currentMinRating = 0;
let isSearchMode = false;
let allLoadedMovies = new Map();

// Trailer Modal
const modal = document.createElement('div');
modal.id = 'trailer-modal';
modal.style = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.95); display: none;
    justify-content: center; align-items: center; z-index:1000;
    `;
modal.innerHTML = `
    <div style="position:relative;width:90%;max-width:900px;height:80%;">
        <button onclick="closeTrailer()" style="position:absolute;top:-40px;right:0;font-size:2rem;color:white;background:none;border:none;cursor:pointer;">✖</button>
        <iframe id="trailer-frame" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>
    </div>`;
document.body.appendChild(modal);

function closeTrailer() {
    modal.style.display = 'none';
    document.getElementById('trailer-frame').src = '';
}

async function showTrailer(movieId) {
    try {
        const res = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
        const data = await res.json();
        const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');

        if (trailer) {
            document.getElementById('trailer-frame').src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
            modal.style.display = 'flex';
            showRecommendations(movieId);
        } else {
            alert('Trailer not available.');
        }
    } catch (err) {
        console.error(err);
    }
}

async function showRecommendations(movieId) {
    const res = await fetch(`${BASE_URL}/movie/${movieId}/recommendations?api_key=${API_KEY}`);
    const data = await res.json();
    const movies = (data.results || []).filter(validMovie);
    if (!movies.length) return;

    const recSection = document.createElement('div');
    recSection.className = 'recommendations';
    recSection.innerHTML = `
        <h2 style="color:white;text-align:center;margin:20px 0;">🎥 Recommended Movies</h2>
        <div class="recommendation-grid">${movies.slice(0, 8).map(createMovieItem).join('')}</div>
    `;
    modal.appendChild(recSection);
}


// Loading Indicator with Load More button - will be inserted into the movie grid
const loadingIndicator = document.createElement('div');
loadingIndicator.id = 'loading-indicator';
loadingIndicator.className = 'movie-item'; // keeps grid alignment
loadingIndicator.style = `
    display:none; 
    border:none;
    justify-content:center;
    align-items:center;
    min-height:400px;
    border-radius:12px;
    `;

loadingIndicator.innerHTML = `
    <div style="text-align:center;padding:20px;">
        <button id="load-more-btn"
        style="
            padding:16px 36px;
            background:#e50914;
            color:#fff;
            border:none;
            border-radius:10px;
            cursor:pointer;
            font-size:18px;
            font-weight:600;
            letter-spacing:0.5px;
            box-shadow:0 0 15px rgba(229,9,20,0.35);
            transition:all 0.3s ease;
        "
        onmouseover="this.style.boxShadow='0 0 25px rgba(229,9,20,0.6)'; this.style.transform='scale(1.05)';"
        onmouseout="this.style.boxShadow='0 0 15px rgba(229,9,20,0.35)'; this.style.transform='scale(1)';"
        >
        Load More Movies 🎬
        </button>
        <p id="end-message" style="display:none;color:#aaa;font-size:17px;margin-top:16px;">
        🎬 You’ve reached the end!
        </p>
    </div>
    `;

const loadMoreBtn = loadingIndicator.querySelector('#load-more-btn');
const endMessage = loadingIndicator.querySelector('#end-message');

loadMoreBtn.addEventListener('click', () => {
    console.log('Load more button clicked');
    loadMoreBtn.textContent = 'Loading...';
    loadMoreMovies();
});

// Add hover effect
loadMoreBtn.addEventListener('mouseenter', () => {
    loadMoreBtn.style.transform = 'scale(1.05)';
    loadMoreBtn.style.background = '#f40612';
});
loadMoreBtn.addEventListener('mouseleave', () => {
    loadMoreBtn.style.transform = 'scale(1)';
    loadMoreBtn.style.background = '#e50914';
});

// Helpers
function validMovie(movie) {
    return movie.poster_path && movie.vote_average > 0 && movie.release_date;
}

function generateStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return '⭐'.repeat(full) + (half ? '🟉' : '') + '☆'.repeat(empty);
}

function createMovieItem(movie) {
    const rating = (movie.vote_average / 2).toFixed(1);
    const isFavorite = checkIfFavorite(movie.id);

    return `
        <div class="movie-item" data-id="${movie.id}">
        <img loading="lazy" src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
        <h3>${movie.title}</h3>
        <span>${movie.release_date?.split('-')[0] || 'N/A'}</span>
        <div class="star-rating">${generateStars(rating)}</div>
        <div class="movie-actions">
            <button class="trailer-btn" onclick="showTrailer(${movie.id})">🎬 Trailer</button>
            <button class="fav-btn" onclick="toggleFavorite(${movie.id})" 
            style="color:${isFavorite ? '#e50914' : '#ccc'};">❤️</button>
        </div>
        </div>`;
}

// --- FAVORITES ---
function checkIfFavorite(id) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    return favorites.some(m => m && m.id === id);
}


function toggleFavorite(movieId) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const movie = allLoadedMovies.get(movieId);
    const exists = favorites.some(movie => movie && movie.id === movieId);

    if (exists) {
        favorites = favorites.filter(m => m.id !== movieId);
    } else {
        favorites.push(movie);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));

    // Re-render only the heart color
    const btn = document.querySelector(`.movie-item[data-id="${movieId}"] .fav-btn`);
    if (btn) btn.style.color = exists ? '#ccc' : '#e50914';
}

// --- FAVORITES TAB ---
async function showFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    moviesSection.innerHTML = favorites.length
        ? favorites.map(createMovieItem).join('')
        : '<p style="text-align:center;color:#aaa;padding:40px;">No favorites yet 💔</p>';
}


// Fetch movies from API
async function fetchMoviesFromCategory(category, page) {
    try {
        const res = await fetch(`${BASE_URL}/movie/${category}?api_key=${API_KEY}&language=en-US&page=${page}`);
        if (!res.ok) {
            console.error(`API error: ${res.status}`);
            return { movies: [], hasMore: false };
        }
        const data = await res.json();
        return {
            movies: (data.results || []).filter(validMovie),
            hasMore: data.page < data.total_pages
        };
    } catch (err) {
        console.error('Fetch error:', err);
        return { movies: [], hasMore: false };
    }
}

// Render movies to DOM
// Render movies with rating filter
function renderMovies(movies, clear = false) {
    if (clear) moviesSection.innerHTML = '';

    // Apply star rating filter
    const filtered = movies.filter(movies => (movies.vote_average / 2) >= currentMinRating);

    if (!filtered.length && clear) {
        moviesSection.innerHTML = '<p style="color:#b3b3b3;text-align:center;padding:40px;">No movies found.</p>';
        return;
    }

    const html = filtered.map(createMovieItem).join('');
    moviesSection.insertAdjacentHTML('beforeend', html);
}

// Load movies from all categories
async function loadFromAllCategories() {
    if (isLoading || !hasMorePages || isSearchMode) {
        console.log('Load blocked:', { isLoading, hasMorePages, isSearchMode });
        return;
    }

    isLoading = true;
    loadingIndicator.style.display = 'block';

    const categories = ['now_playing', 'popular', 'top_rated', 'upcoming'];
    const newMovies = [];
    let anyHasMore = false;

    console.log('Loading from all categories, pages:', categoryPages);

    // Fetch from each category
    for (const cat of categories) {
        const page = categoryPages[cat];
        const { movies, hasMore } = await fetchMoviesFromCategory(cat, page);

        console.log(`${cat} page ${page}: ${movies.length} movies, hasMore: ${hasMore}`);

        if (movies.length > 0) {
            movies.forEach(movie => {
                if (!allLoadedMovies.has(movie.id)) {
                    allLoadedMovies.set(movie.id, movie);
                    newMovies.push(movie);
                }
            });

            categoryPages[cat]++;
            if (hasMore) anyHasMore = true;
        }
    }

    console.log(`Total new unique movies: ${newMovies.length}, total loaded: ${allLoadedMovies.size}`);

    hasMorePages = anyHasMore;

    if (newMovies.length > 0) {
        renderMovies(newMovies, false);
    }

    isLoading = false;

    if (!hasMorePages) {
        loadMoreBtn.style.display = 'none';
        endMessage.style.display = 'block';
        loadingIndicator.style.display = 'flex';
        moviesSection.appendChild(loadingIndicator);
    } else {
        // Check if button should be shown
        checkIfNeedMore();
    }
}

// Load movies from single category
async function loadFromSingleCategory(category) {
    if (isLoading || !hasMorePages || isSearchMode) return;

    isLoading = true;
    loadingIndicator.style.display = 'block';

    const page = categoryPages[category];
    const { movies, hasMore } = await fetchMoviesFromCategory(category, page);

    const newMovies = [];
    movies.forEach(movie => {
        if (!allLoadedMovies.has(movie.id)) {
            allLoadedMovies.set(movie.id, movie);
            newMovies.push(movie);
        }
    });

    if (newMovies.length > 0) {
        renderMovies(newMovies, false);
        categoryPages[category]++;
    }

    hasMorePages = hasMore;
    isLoading = false;

    if (!hasMorePages) {
        loadMoreBtn.style.display = 'none';
        endMessage.style.display = 'block';
        loadingIndicator.style.display = 'flex';
        moviesSection.appendChild(loadingIndicator);
    } else {
        // Check if button should be shown
        checkIfNeedMore();
    }
}

// Main load function
async function loadMoreMovies() {
    if (currentCategory === 'all' || currentCategory === 'home') {
        await loadFromAllCategories();
    } else {
        await loadFromSingleCategory(currentCategory);
    }
}

// Initialize category or star filter
async function initializeCategory(category) {
    currentCategory = category === 'home' ? 'all' : category;
    currentMinRating = parseFloat(starFilter.value) || 0;

    // Reset pagination & loaded movies
    hasMorePages = true;
    isSearchMode = false;
    allLoadedMovies.clear();
    categoryPages = {
        'now_playing': 1,
        'popular': 1,
        'top_rated': 1,
        'upcoming': 1
    };

    // Clear the movie grid
    moviesSection.innerHTML = '';

    // Reset Load More
    loadMoreBtn.style.display = 'block';
    endMessage.style.display = 'none';
    loadMoreBtn.textContent = 'Load More Movies 🎬';

    // Load first batch
    await loadMoreMovies();
}

// Scroll listener - show/hide button based on position
window.addEventListener('scroll', () => {
    if (isSearchMode || !hasMorePages || isLoading) return;

    const pageHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const scrollPosition = window.scrollY;
    const atBottom = (viewportHeight + scrollPosition) >= pageHeight - 100;

    const existingIndicator = moviesSection.querySelector('#loading-indicator');

    if (atBottom && !existingIndicator) {
        loadMoreBtn.style.display = 'block';
        endMessage.style.display = 'none';
        loadingIndicator.style.display = 'flex';
        moviesSection.appendChild(loadingIndicator);
    } else if (!atBottom && existingIndicator) {
        existingIndicator.remove();
    }
});

// Check if we need to show the Load More button
function checkIfNeedMore() {
    setTimeout(() => {
        if (isSearchMode) {
            loadingIndicator.style.display = 'none';
            return;
        }

        // Remove existing indicator
        const existingIndicator = moviesSection.querySelector('#loading-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        if (!hasMorePages) {
            // Show end message
            loadMoreBtn.style.display = 'none';
            endMessage.style.display = 'block';
            loadingIndicator.style.display = 'flex';
            moviesSection.appendChild(loadingIndicator);
            return;
        }

        const pageHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollPosition = window.scrollY;
        const canScroll = pageHeight > viewportHeight;
        const atBottom = (viewportHeight + scrollPosition) >= pageHeight - 100;

        // Show button if user can't scroll OR is at the bottom
        if (!canScroll || atBottom) {
            console.log('Showing load more button. Can scroll:', canScroll, 'At bottom:', atBottom);
            loadMoreBtn.style.display = 'block';
            endMessage.style.display = 'none';
            loadingIndicator.style.display = 'flex';
            moviesSection.appendChild(loadingIndicator);
            loadMoreBtn.textContent = 'Load More Movies 🎬';
        }
    }, 500);
}

// Search
let searchTimeout;
movieSearchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();

    clearTimeout(searchTimeout);

    if (!query) {
        await initializeCategory(currentCategory);
        return;
    }

    searchTimeout = setTimeout(async () => {
        isSearchMode = true;
        hasMorePages = false;
        moviesSection.innerHTML = '<p style="color:#b3b3b3;text-align:center;padding:40px;">Searching...</p>';

        try {
            const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&page=1`);
            const data = await res.json();
            const results = (data.results || []).filter(validMovie);
            renderMovies(results, true);
        } catch (err) {
            console.error(err);
            moviesSection.innerHTML = '<p style="color:#b3b3b3;text-align:center;padding:40px;">Search failed.</p>';
        }
    }, 300);
});

// Category buttons
sidebarItems.forEach(item => {
    item.addEventListener('click', async () => {
        sidebarItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');

        const category = item.dataset.category;
        await initializeCategory(category);
    });
});

// Star filter
starFilter?.addEventListener('change', (e) => {
    currentMinRating = parseFloat(e.target.value);
    initializeCategory(currentCategory);
});

const genreFilter = document.getElementById('genreFilter');
const yearFilter = document.getElementById('yearFilter');

// Populate genres
async function loadGenres() {
    const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`);
    const data = await res.json();
    genreFilter.innerHTML = `<option value="">All</option>` +
        data.genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

// Populate years dynamically
function loadYears() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1980; y--) {
        yearFilter.innerHTML += `<option value="${y}">${y}</option>`;
    }
}

genreFilter.addEventListener('change', () => initializeCategory(currentCategory));
yearFilter.addEventListener('change', () => initializeCategory(currentCategory));

// Add filtering logic inside renderMovies():
function renderMovies(movies, clear = false) {
    if (clear) moviesSection.innerHTML = '';

    const selectedGenre = genreFilter.value;
    const selectedYear = yearFilter.value;

    const filtered = movies.filter(m => {
        const meetsRating = (m.vote_average / 2) >= currentMinRating;
        const meetsGenre = !selectedGenre || m.genre_ids.includes(Number(selectedGenre));
        const meetsYear = !selectedYear || m.release_date?.startsWith(selectedYear);
        return meetsRating && meetsGenre && meetsYear;
    });

    if (!filtered.length && clear) {
        moviesSection.innerHTML = '<p style="color:#b3b3b3;text-align:center;padding:40px;">No movies found.</p>';
        return;
    }

    const html = filtered.map(createMovieItem).join('');
    moviesSection.insertAdjacentHTML('beforeend', html);
}

// Initialize genre + year lists
loadGenres();
loadYears();


// Sidebar toggle
const sidebar = document.querySelector('.sidebar');
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    sidebar.classList.toggle('expanded');
});
document.getElementById('closeSidebar')?.addEventListener('click', () => {
    sidebar.classList.remove('expanded');
});

// Initial load
const homeButton = Array.from(sidebarItems).find(btn => btn.dataset.category === 'home');
if (homeButton) {
    homeButton.classList.add('active');
}
function getVisibleMovieCount() {
    const movieCard = document.querySelector('.movie-item');
    if (!movieCard) return 20; // fallback if grid not ready

    const cardRect = movieCard.getBoundingClientRect();
    const cardWidth = cardRect.width + 14;
    const cardHeight = cardRect.height + 14;
    const gridWidth = moviesSection.offsetWidth;
    const columns = Math.floor(gridWidth / cardWidth);
    const rows = Math.ceil(window.innerHeight / cardHeight);
    return columns * rows + 4; // +buffer
}

async function fillRemainingSpace() {
    if (isLoading || !hasMorePages) return;

    // Wait for DOM to render
    await new Promise(r => setTimeout(r, 300));

    const totalMovies = moviesSection.querySelectorAll('.movie-item').length;
    const visibleNeeded = getVisibleMovieCount();

    if (totalMovies < visibleNeeded) {
        console.log(`🧩 Filling space: have ${totalMovies}, need ${visibleNeeded}`);
        await loadMoreMovies();
        fillRemainingSpace(); // recursively load until it fills
    } else {
        console.log('✅ Page is full');
    }
}

// Hook into your app init
window.addEventListener('load', () => {
    fillRemainingSpace();
});

// Re-check on resize (in case screen size changes)
window.addEventListener('resize', () => {
    clearTimeout(window._resizeTimer);
    window._resizeTimer = setTimeout(fillRemainingSpace, 600);
});

console.log('Initializing app...');
initializeCategory('all');
