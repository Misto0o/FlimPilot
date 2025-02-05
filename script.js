    // Constants
    const API_KEY = 'd63486bd1ef5309830ec0447edf05424';
    const BASE_URL = 'https://api.themoviedb.org/3';
    
    // Elements
    const movieSearchInput = document.getElementById('movieSearch');
    const moviesSection = document.querySelector('#movies-section');
    const sidebarItems = document.querySelectorAll('.menu-list-item');
    
    // Category Mapping
    const categoryMapping = {
        'home': 'now_playing',
        'movies': 'popular',
        'popular': 'popular',
        'upcoming': 'upcoming',
        'toprated': 'top_rated'
    };
    
    // Fetch movies for a category (fetch multiple pages for more results)
    async function fetchMovies(category, pages = 3) {
        try {
            let allMovies = [];
            for (let page = 1; page <= pages; page++) {
                const response = await fetch(`${BASE_URL}/movie/${category}?api_key=${API_KEY}&language=en-US&page=${page}`);
                const data = await response.json();
                allMovies = [...allMovies, ...data.results]; // Append results
            }
            return allMovies;
        } catch (error) {
            console.error(`Error fetching ${category} movies:`, error);
            return [];
        }
    }
    
    // Render all sections dynamically
    async function renderAllSections() {
        moviesSection.innerHTML = '';
        for (const [category, title] of Object.entries(categoryMapping)) {
            if (category !== 'all') {
                const movies = await fetchMovies(title, 15); // Fetch 2 pages per category
                moviesSection.innerHTML += createMovieSection(title, category, movies);
            }
        }
    }
    
    // Create movie section with star ratings
    function createMovieSection(category, title, movies) {
        return `
            <div class="movie-list-container" id="${category}">
                <h1 class="movie-list-title">${title}</h1>
                <div class="movie-list-wrapper">
                    <div class="movie-list">
                        ${movies.length ? movies.map(movie => createMovieItem(movie)).join('') : '<p class="no-movies">No movies found.</p>'}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Create individual movie items with star ratings
    function createMovieItem(movie) {
        const rating = (movie.vote_average / 2).toFixed(1); // Convert 10-star rating to 5-star system
        return `
            <div class="movie-item">
                <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
                <h3>${movie.title}</h3>
                <p>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
                <div class="star-rating">${generateStars(rating)}</div>
            </div>
        `;
    }
    
    // Generate star rating based on vote average (5-star system)
    function generateStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
    
        return '⭐'.repeat(fullStars) + (halfStar ? '🟉' : '') + '☆'.repeat(emptyStars);
    }
    
    // Search for movies
    async function searchMovies(query) {
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&language=en-US&query=${query}&page=1`);
        const data = await response.json();
        return data.results || [];
    }
    
    // Handle search input
    movieSearchInput.addEventListener('input', async (event) => {
        const query = event.target.value.trim();
        if (!query) {
            renderAllSections();
            return;
        }
    
        const movies = await searchMovies(query);
        moviesSection.innerHTML = `
            <div class="movie-list-container">
                <h1 class="movie-list-title">Search Results</h1>
                <div class="movie-list-wrapper">
                    <div class="movie-list">
                        ${movies.length ? movies.map(movie => createMovieItem(movie)).join('') : '<p class="no-movies">No movies found.</p>'}
                    </div>
                </div>
            </div>
        `;
    });
    
    // Sidebar Filtering
    sidebarItems.forEach(item => {
        item.addEventListener('click', async () => {
            document.querySelector('.active')?.classList.remove('active');
            item.classList.add('active');
    
            const category = item.textContent.trim().toLowerCase(); // Ensure lowercase matching
            const apiCategory = categoryMapping[category];
    
            // Convert category to Title Case for display
            const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
    
            if (category === 'all') {
                let allMovies = [];
                const categories = Object.values(categoryMapping); // Fetch from all mapped categories
    
                for (const cat of categories) {
                    const movies = await fetchMovies(cat, 2); // Fetch 2 pages per category
                    allMovies = [...allMovies, ...movies];
                }
    
                moviesSection.innerHTML = createMovieSection('all', 'All Movies', allMovies);
            } else if (apiCategory) {
                const movies = await fetchMovies(apiCategory, 3); // Fetch 3 pages for better results
                moviesSection.innerHTML = createMovieSection(apiCategory, displayCategory, movies);
            } else {
                console.error(`Category '${category}' not found in mapping.`);
            }
        });
    });
    // Initial Fetch
    renderAllSections();
    