export function renderFeed(containerId, posts) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Svuota il contenitore

    if (posts.length === 0) {
        container.innerHTML = '<p class="empty-feed" data-i18n="empty_feed">Nessun post trovato in questa dimensione.</p>';
        return;
    }

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';

        // Calcolo del tempo rimanente (per la scadenza)
        const expiry = new Date(post.expires_at).getTime();
        const now = new Date().getTime();
        const timeLeftMs = expiry - now;
        
        let timeLeftString = "In scadenza...";
        if (timeLeftMs > 0) {
            const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
            timeLeftString = hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
        }

        // Struttura base del post
		let html = `<div class="post-header">
                <span class="author-id">ID: ${post.author_id || 'anon'}</span>
                <span class="timer">${timeLeftString}</span>
            </div>`;
			
        html += `<div class="post-content">${escapeHTML(post.content)}</div>`;
        
        if (post.media_url) {
            html += `<img src="${post.media_url}" class="post-media" alt="User media">`;
        }

        card.innerHTML = html;
        container.appendChild(card);
    });
}

// Previene vulnerabilità XSS (Cross-Site Scripting)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}