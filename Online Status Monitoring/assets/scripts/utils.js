// assets/scripts/utils.js

// Utility functions
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return String(text).replace(regex, '<span class="search-highlight">$1</span>');
}
function showLoadingMessage(message) {
    DOMElements.branchTableBody.innerHTML = `<tr><td colspan="10" class="loading">${message}</td></tr>`;
}
function showEmptyMessage(message) {
    DOMElements.branchTableBody.innerHTML = `<tr><td colspan="10" class="no-data">${message}</td></tr>`;
}

// Debounce function to prevent filter from running on every keystroke
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
