// ===============================
// 1. Variáveis Globais e Seleção
// ===============================
const cardContainer = document.querySelector(".card-container");
const searchInput = document.querySelector(".search-container input");
const searchButton = document.querySelector("#botao-busca");

let heroesData = [];
let currentSlide = 0;
let carouselInterval;
const AUTO_PLAY_DELAY = 4000; // 4 Segundos para dar tempo de ler

// ===============================
// 2. Busca e Inicialização de Dados
// ===============================

/**
 * Busca os dados do JSON e inicia.
 */
async function fetchAndRenderHeroes() {
    try {
        const response = await fetch("data.json");
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        heroesData = await response.json();
        // Ordena alfabeticamente
        heroesData.sort((a, b) => a.nome.localeCompare(b.nome));

        renderCards(heroesData);
    } catch (error) {
        console.error("Erro ao carregar os dados dos heróis:", error);
        const container = document.querySelector(".carousel-track") || document.body;
        container.innerHTML = `<p class="error-message" style="color: white; text-align: center;">Não foi possível carregar os heróis.</p>`;
    }
}

/**
 * Filtra os heróis e atualiza a tela.
 */
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    
    const filteredHeroes = heroesData.filter(hero => 
        hero.nome.toLowerCase().includes(searchTerm)
    );
    
    renderCards(filteredHeroes);

    const resultsSection = document.getElementById('herois');
    if (resultsSection) {
        resultsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// ===============================
// 3. Criação dos Cards (HTML + Cores)
// ===============================

function isColorTooDark(r, g, b) {
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 75; 
}

function createHeroCard(hero, uniqueIndex = 0) {
    const article = document.createElement('article');
    
    // Adiciona o index ao final do ID para garantir que seja único
    const cardId = `card-${hero.nome.replace(/\s+/g, '-').toLowerCase()}-${uniqueIndex}`;
    article.id = cardId;

    article.innerHTML = `
        <img class="card-image" src="./Images/${hero.imagem}" alt="Imagem do Herói ${hero.nome}">
        <div class="card-content">
            <h2>${hero.nome}</h2>
            <p><strong>Universo:</strong> ${hero.universo}</p>
            <p><strong>Ano de Criação:</strong> ${hero.ano_criacao}</p>
            <p><strong>Criador(es):</strong> ${hero.criadores}</p>
            <p><strong>Descrição:</strong> ${hero.descricao}</p>
            <p><strong>Primeira Aparição:</strong> ${hero.primeira_aparicao}</p>
            <p><strong>Inimigos:</strong> ${hero.inimigos}</p>
            <a href="${hero.link_adaptacao}" target="_blank" rel="noopener noreferrer">Assistir à Principal Adaptação</a>
        </div>
    `;

    // Lógica do ColorThief
    const img = article.querySelector('.card-image');
    img.crossOrigin = "Anonymous";

    if (hero.imagem) {
        img.onload = function() {
            try {
                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 12);
                let vibrantColor = palette.find(c => !isColorTooDark(c[0], c[1], c[2]));

                if (!vibrantColor) {
                    vibrantColor = palette[0] || [255, 193, 7];
                }

                const colorString = `rgb(${vibrantColor.join(',')})`;
                article.style.setProperty('--hero-color', colorString);
            } catch (e) {
                // Silencioso
            }
        };
    }

    return article;
}

// ===============================
// 4. Lógica Principal do Carrossel (Center Focus Mode)
// ===============================

function renderCards(heroesList) {
    const track = document.querySelector(".carousel-track");
    const wrapper = document.querySelector(".carousel-wrapper");

    if (!track || !wrapper) return;

    // Limpeza inicial
    track.innerHTML = "";
    clearInterval(carouselInterval);
    track.classList.remove('with-transition'); // Remove animação para setup inicial

    // Caso de lista vazia
    if (heroesList.length === 0) {
        track.style.width = "100%";
        track.style.justifyContent = "center";
        track.innerHTML = `<p class="no-results-message" style="color:white;">Nenhum agente encontrado.</p>`;
        return;
    }

    // --- PREPARAÇÃO DO LOOP INFINITO ---
    // Se tivermos poucos cards (menos que 5), duplicamos a própria lista
    // para garantir que haja itens suficientes para o efeito visual.
    let baseList = [...heroesList];
    while (baseList.length < 5) {
        baseList = [...baseList, ...heroesList];
    }

    // Criamos a "Super Lista": [Clone Esquerda] + [Original] + [Clone Direita]
    // Isso garante buffer infinito para ambos os lados
    const infiniteList = [...baseList, ...baseList, ...baseList];

    // Renderiza
    const fragment = document.createDocumentFragment();
    infiniteList.forEach((hero, index) => {
        // Nota: Passamos o index para garantir IDs únicos nos clones
        const heroCard = createHeroCard(hero, index); 
        heroCard.dataset.totalIndex = index; // Índice na super lista
        fragment.appendChild(heroCard);
    });
    track.appendChild(fragment);

    // --- POSICIONAMENTO INICIAL ---
    const cards = track.querySelectorAll("article");
    const realSetLength = baseList.length;
    
    // Começamos exatamente no meio da lista (no início do Set Central)
    currentSlide = realSetLength; 

    // Função auxiliar para atualizar posição visual
    function updateTrackPosition(animate = true) {
        if (cards.length === 0) return;

        if (animate) {
            track.classList.add('with-transition');
        } else {
            track.classList.remove('with-transition');
        }

        const wrapperWidth = wrapper.offsetWidth;
        const cardWidth = cards[0].offsetWidth;
        const gap = parseFloat(getComputedStyle(track).gap) || 0;

        const centerOffset = (wrapperWidth / 2) - (cardWidth / 2);
        const currentCardPosition = currentSlide * (cardWidth + gap);
        const newPosition = centerOffset - currentCardPosition;

        track.style.transform = `translateX(${newPosition}px)`;

        // Atualiza classes visuais
        cards.forEach((card, index) => {
            if (index === currentSlide) {
                card.classList.add('card-active');
            } else {
                card.classList.remove('card-active');
            }
        });
    }

    // --- LÓGICA DO TELEPORTE (LOOP) ---
    // Essa função roda sempre que uma animação termina
    function checkIndex() {
        track.classList.remove('with-transition'); // Desliga animação para o salto
        
        // Se chegamos no final (Clone Direita), pula para o início do Set Central
        if (currentSlide >= realSetLength * 2) {
            currentSlide = realSetLength;
            updateTrackPosition(false); // false = sem animação
        }
        // Se chegamos no início (Clone Esquerda), pula para o final do Set Central
        else if (currentSlide < realSetLength) {
            currentSlide = (realSetLength * 2) - 1;
            updateTrackPosition(false);
        }
    }

    track.addEventListener('transitionend', checkIndex);

    // --- NAVEGAÇÃO ---
    function nextSlide() {
        currentSlide++;
        updateTrackPosition(true);
    }

    function prevSlide() {
        currentSlide--;
        updateTrackPosition(true);
    }

    function goToSlide(clickedIndex) {
        // Calcula a diferença para saber se vai pra frente ou pra trás
        // Isso mantém a direção natural do clique
        currentSlide = clickedIndex;
        updateTrackPosition(true);
        resetTimer();
    }

    // Timer Automático
    function startAutoPlay() {
        clearInterval(carouselInterval);
        carouselInterval = setInterval(nextSlide, AUTO_PLAY_DELAY);
    }

    function resetTimer() {
        clearInterval(carouselInterval);
        startAutoPlay();
    }

    // Event Listeners nos Cards (Clique Inteligente)
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const clickedIndex = parseInt(card.dataset.totalIndex);
            if (clickedIndex !== currentSlide) {
                goToSlide(clickedIndex);
            }
        });
    });

    // Mouse Events
    wrapper.addEventListener('mouseenter', () => clearInterval(carouselInterval));
    wrapper.addEventListener('mouseleave', startAutoPlay);
    window.addEventListener('resize', () => updateTrackPosition(false));

    // Inicialização
    setTimeout(() => {
        updateTrackPosition(false); // Posiciona sem animar no load
        startAutoPlay();
    }, 100);
}

// ===============================
// 5. Configurações da Página e Menu
// ===============================

function addEventListeners() {
    if(searchButton) {
        searchButton.addEventListener("click", handleSearch);
    }

    if(searchInput) {
        searchInput.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                handleSearch();
            }
        });
    }
}

function setupSideMenu() {
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuLinks = document.querySelectorAll('.menu-link');

    function openMenu() {
        sideMenu.classList.add('active');
    }

    function closeMenu() {
        sideMenu.classList.remove('active');
    }

    if (menuToggleBtn) menuToggleBtn.addEventListener('click', openMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);

    menuLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (event) => {
        if (sideMenu && sideMenu.classList.contains('active') && 
            !sideMenu.contains(event.target) && 
            !menuToggleBtn.contains(event.target)) {
            closeMenu();
        }
    });
}

// Garantia de Scroll no Topo
if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}

// ===============================
// 6. Inicialização Final
// ===============================
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
    fetchAndRenderHeroes();
    addEventListeners();
    setupSideMenu();
});