document.addEventListener('DOMContentLoaded', async function() {
    const cardsGrid = document.getElementById('cardsGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');

    try {
        const response = await fetch('/api/cards');
        const result = await response.json();

        loadingSpinner.style.display = 'none';

        if (result.success && result.data.length > 0) {
            cardsGrid.innerHTML = '';
            result.data.forEach(card => {
                const cardElement = createCardElement(card);
                cardsGrid.appendChild(cardElement);
            });
        } else {
            emptyState.style.display = 'block';
        }
    } catch (error) {
        loadingSpinner.style.display = 'none';
        emptyState.style.display = 'block';
        console.error('Error loading cards:', error);
    }
});

function createCardElement(card) {
    const cardLink = document.createElement('a');
    cardLink.href = `/card/${card._id}`;
    cardLink.className = `card-preview ${card.template || 'template1'}`;

    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';

    cardLink.innerHTML = `
        <div class="card-preview-header">
            <img src="${card.profile_image_url || defaultImage}" alt="${card.full_name}" class="card-preview-img" onerror="this.src='${defaultImage}'">
            <div class="card-preview-info">
                <h3>${card.full_name}</h3>
                <p>${card.job_title || 'Professional'}</p>
            </div>
        </div>
        <div class="card-preview-details">
            ${card.company ? `<p><strong>Company:</strong> ${card.company}</p>` : ''}
            ${card.email ? `<p><strong>Email:</strong> ${card.email}</p>` : ''}
        </div>
        <div class="card-preview-footer">
            <span class="card-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                ${card.view_count} views
            </span>
        </div>
    `;

    return cardLink;
}
