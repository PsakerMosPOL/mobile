// main.js - С ПРОСТЫМ ТЕКСТОВЫМ АВТОДОПОЛНЕНИЕМ

document.addEventListener('DOMContentLoaded', function() {
    const goodsContainer = document.getElementById('goodsContainer');
    const sortOrderSelect = document.getElementById('sortOrder');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const autocompleteList = document.getElementById('autocomplete-list');
    const loadMoreBtn = document.getElementById('loadMore');
    const applyFilterBtn = document.getElementById('applyFilter');

    let currentPage = 1;
    let currentQuery = '';
    let isLoading = false;
    let hasMore = true;
    let allGoods = [];

    // --- Загрузка категорий ---
    async function loadCategories() {
        try {
            console.log('📦 Загрузка категорий...');
            const data = await utils.apiRequest('/goods?per_page=100');
            const goods = Array.isArray(data) ? data : (data.goods || []);
            
            const categories = [...new Set(goods.map(g => g.main_category))].filter(Boolean).sort();
            
            const container = document.getElementById('categoryFilters');
            if (!container) {
                console.error('❌ Элемент #categoryFilters не найден!');
                return;
            }
            
            container.innerHTML = '';
            
            if (categories.length === 0) {
                container.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Категории не найдены</p>';
                return;
            }
            
            categories.forEach(cat => {
                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; padding: 0.5rem; margin-bottom: 0.5rem; cursor: pointer; border-radius: 6px; transition: background 0.2s;';
                label.innerHTML = `<input type="radio" name="category" value="${cat}" class="category-radio" style="margin-right: 8px; accent-color: #cb11ab;"> ${cat}`;
                
                label.addEventListener('mouseenter', () => label.style.background = '#f8f8f8');
                label.addEventListener('mouseleave', () => label.style.background = 'transparent');
                
                container.appendChild(label);
            });
            
            const resetBtn = document.createElement('button');
            resetBtn.textContent = '✕ Сбросить категорию';
            resetBtn.style.cssText = 'width: 100%; padding: 0.5rem; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; margin-top: 0.5rem;';
            resetBtn.addEventListener('click', () => {
                document.querySelectorAll('.category-radio').forEach(radio => radio.checked = false);
            });
            container.appendChild(resetBtn);
            
            console.log(`✅ Загружено ${categories.length} категорий`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки категорий:', error);
            const container = document.getElementById('categoryFilters');
            if (container) {
                container.innerHTML = '<p style="color: red; font-size: 0.9rem;">Ошибка загрузки</p>';
            }
        }
    }

    async function loadAllGoods() {
        try {
            console.log('📦 Загрузка всех товаров для фильтрации...');
            const data = await utils.apiRequest('/goods?per_page=100');
            allGoods = Array.isArray(data) ? data : (data.goods || []);
            console.log(`✅ Загружено ${allGoods.length} товаров в кеш`);
        } catch (error) {
            console.error('❌ Ошибка загрузки товаров в кеш:', error);
        }
    }

    async function loadGoods(page = 1, reset = false) {
        if (isLoading) {
            console.log('⏳ Загрузка уже выполняется...');
            return;
        }
        
        isLoading = true;
        if (loadMoreBtn) {
            loadMoreBtn.textContent = 'Загрузка...';
            loadMoreBtn.disabled = true;
        }

        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', 20);
            
            if (sortOrderSelect && sortOrderSelect.value) {
                params.append('sort_order', sortOrderSelect.value);
            }

            if (currentQuery) {
                params.append('query', currentQuery);
            }

            const url = `/goods?${params.toString()}`;
            console.log('📡 Запрос:', url);
            
            const data = await utils.apiRequest(url);
            let incomingGoods = Array.isArray(data) ? data : (data.goods || []);
            
            console.log(`✅ Получено ${incomingGoods.length} товаров`);

            if (reset) {
                goodsContainer.innerHTML = '';
            }

            if (incomingGoods.length === 0) {
                if (reset) {
                    goodsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #999;">Товары не найдены</p>';
                }
                hasMore = false;
            } else {
                const filteredGoods = applyClientFilters(incomingGoods);
                renderGoods(filteredGoods);
                hasMore = incomingGoods.length >= 20;
            }

            currentPage = page;
            
            if (loadMoreBtn) {
                if (hasMore) {
                    loadMoreBtn.textContent = 'Загрузить ещё';
                    loadMoreBtn.style.display = 'block';
                } else {
                    loadMoreBtn.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('❌ Ошибка загрузки товаров:', error);
            utils.showNotification('Ошибка загрузки товаров', 'error');
            
            if (reset) {
                goodsContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #dc3545;">
                    Ошибка: ${error.message}
                </p>`;
            }
            hasMore = false;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } finally {
            isLoading = false;
            if (loadMoreBtn) {
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Загрузить ещё';
            }
        }
    }

    function applyClientFilters(goods) {
        let filtered = goods;

        const selectedCategory = document.querySelector('.category-radio:checked');
        if (selectedCategory) {
            const category = selectedCategory.value;
            filtered = filtered.filter(g => g.main_category === category);
            console.log(`🏷️ Фильтр по категории "${category}": ${filtered.length} товаров`);
        }

        const priceFrom = document.getElementById('priceFrom')?.value;
        const priceTo = document.getElementById('priceTo')?.value;

        if (priceFrom) {
            const minPrice = parseFloat(priceFrom);
            filtered = filtered.filter(g => {
                const price = g.discount_price || g.actual_price;
                return price >= minPrice;
            });
            console.log(`💰 Цена от ${minPrice}: ${filtered.length} товаров`);
        }

        if (priceTo) {
            const maxPrice = parseFloat(priceTo);
            filtered = filtered.filter(g => {
                const price = g.discount_price || g.actual_price;
                return price <= maxPrice;
            });
            console.log(`💰 Цена до ${maxPrice}: ${filtered.length} товаров`);
        }

        const discountCheckbox = document.getElementById('onlyDiscount');
        if (discountCheckbox && discountCheckbox.checked) {
            filtered = filtered.filter(g => g.discount_price && g.discount_price < g.actual_price);
            console.log(`🎁 Только со скидкой: ${filtered.length} товаров`);
        }

        return filtered;
    }

    function renderGoods(goods) {
        goods.forEach(good => {
            const card = document.createElement('div');
            card.className = 'good-card';
            
            const name = good.name || 'Без названия';
            const rating = good.rating || 0;
            const actualPrice = good.actual_price || 0;
            const discountPrice = good.discount_price;
            const imageUrl = good.image_url || 'https://via.placeholder.com/280x280?text=No+Image';
            const id = good.id;
            
            const hasDiscount = discountPrice && discountPrice < actualPrice;
            const discountPercent = hasDiscount ? 
                Math.round((1 - discountPrice / actualPrice) * 100) : 0;
            
            let badgesHTML = '';
            if (hasDiscount) {
                badgesHTML = `
                    <div class="badge-container">
                        <span class="badge discount">-${discountPercent}%</span>
                    </div>
                `;
            }
            
            const priceHTML = hasDiscount ? `
                <div class="price-block">
                    <span class="price">${discountPrice} ₽</span>
                    <span class="price original">${actualPrice} ₽</span>
                </div>
            ` : `
                <div class="price-block">
                    <span class="price">${actualPrice} ₽</span>
                </div>
            `;
            
            const shortName = name.length > 70 ? name.substring(0, 70) + '...' : name;
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const deliveryDate = tomorrow.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            
            card.innerHTML = `
                ${badgesHTML}
                <button class="favorite-btn" data-id="${id}" title="Добавить в избранное">♡</button>
                <img src="${imageUrl}" alt="${name}" 
                     onerror="this.src='https://via.placeholder.com/280x280?text=No+Image'">
                <div class="card-content">
                    <div class="name" title="${name}">${shortName}</div>
                    <div class="rating">
                        <span class="star">★</span>
                        <span>${rating.toFixed(1)}</span>
                        <span class="count">• ${Math.floor(Math.random() * 500 + 100)}K оценок</span>
                    </div>
                    ${priceHTML}
                    <button class="add-to-cart" data-id="${id}">Завтра</button>
                    <div class="delivery-info">Доставка завтра, ${deliveryDate}</div>
                </div>
            `;
            goodsContainer.appendChild(card);
        });

        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const id = parseInt(this.dataset.id, 10);
                
                this.classList.add('animating', 'added');
                const originalText = this.textContent;
                this.textContent = '✓ Добавлено';
                
                setTimeout(() => {
                    this.classList.remove('animating', 'added');
                    this.textContent = originalText;
                }, 1500);
                
                utils.Cart.addItem(id);
            });
        });

        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('active');
                this.textContent = this.classList.contains('active') ? '♥' : '♡';
                
                if (this.classList.contains('active')) {
                    utils.showNotification('Добавлено в избранное', 'info');
                }
            });
        });
    }

    // --- ПРОСТОЕ ТЕКСТОВОЕ АВТОДОПОЛНЕНИЕ ---
    if (searchInput && autocompleteList) {
        searchInput.addEventListener('input', debounce(async function() {
            const query = this.value.trim();
            if (query.length > 2) {
                try {
                    console.log('🔍 Ищем товары по запросу:', query);
                    const data = await utils.apiRequest(`/goods?query=${encodeURIComponent(query)}&per_page=8`);
                    const goods = Array.isArray(data) ? data : (data.goods || []);
                    
                    if (goods.length > 0) {
                        displayAutocompleteSimple(goods);
                    } else {
                        autocompleteList.innerHTML = '<div style="padding: 0.75rem 1rem; color: #999; text-align: center;">Товары не найдены</div>';
                        autocompleteList.classList.add('show');
                    }
                } catch (error) {
                    console.error('Ошибка загрузки автодополнения:', error);
                    autocompleteList.innerHTML = '';
                    autocompleteList.classList.remove('show');
                }
            } else {
                autocompleteList.innerHTML = '';
                autocompleteList.classList.remove('show');
            }
        }, 300));
    }

    // Простое отображение - только названия товаров
    function displayAutocompleteSimple(goods) {
        if (!autocompleteList) return;
        
        autocompleteList.innerHTML = '';
        autocompleteList.style.cssText = 'max-height: 300px; overflow-y: auto; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
        
        if (goods && goods.length > 0) {
            goods.forEach(product => {
                const div = document.createElement('div');
                div.style.cssText = 'padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s; font-size: 0.95rem;';
                div.textContent = product.name;
                
                div.addEventListener('mouseenter', () => div.style.background = '#f9f9f9');
                div.addEventListener('mouseleave', () => div.style.background = 'white');
                
                div.addEventListener('click', () => {
                    searchInput.value = product.name;
                    autocompleteList.innerHTML = '';
                    autocompleteList.classList.remove('show');
                    searchBtn.click();
                });
                
                autocompleteList.appendChild(div);
            });
            
            autocompleteList.classList.add('show');
        } else {
            autocompleteList.classList.remove('show');
        }
    }

    // Закрытие автодополнения при клике вне его
    document.addEventListener('click', function(e) {
        if (autocompleteList && !searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.classList.remove('show');
        }
    });

    // --- Поиск ---
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (!query) {
                utils.showNotification('Введите поисковый запрос', 'info');
                return;
            }
            
            currentQuery = query;
            document.querySelectorAll('.category-radio').forEach(radio => radio.checked = false);
            const priceFrom = document.getElementById('priceFrom');
            const priceTo = document.getElementById('priceTo');
            const discountCheckbox = document.getElementById('onlyDiscount');
            
            if (priceFrom) priceFrom.value = '';
            if (priceTo) priceTo.value = '';
            if (discountCheckbox) discountCheckbox.checked = false;
            
            console.log('🔍 Поиск:', currentQuery);
            loadGoods(1, true);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }

    // --- Фильтрация ---
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', function() {
            if (isLoading) return;
            
            currentQuery = '';
            if (searchInput) searchInput.value = '';
            if (autocompleteList) {
                autocompleteList.innerHTML = '';
                autocompleteList.classList.remove('show');
            }
            
            console.log('🔧 Применение фильтров');
            loadGoods(1, true);
        });
    }

    // --- Сортировка ---
    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', function() {
            console.log('🔄 Сортировка:', this.value);
            loadGoods(1, true);
        });
    }

    // --- Загрузка ещё ---
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            if (!isLoading && hasMore) {
                loadGoods(currentPage + 1, false);
            }
        });
    }

    // --- Debounce ---
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // --- ИНИЦИАЛИЗАЦИЯ ---
    console.log('🚀 Инициализация страницы');
    loadCategories();
    loadAllGoods();
    loadGoods(1, true);
});
