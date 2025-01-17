//? Removes the infinite scroll from the YouTube recommendations and comments sections.

const SELECTORS = {
    recommendationsElement: [
        'ytd-item-section-renderer.style-scope.ytd-watch-next-secondary-results-renderer',
        '#related'
    ],
    commentsElement: [
        'ytd-comments.style-scope.ytd-watch-flexy',
        '#comments'
    ]
};

const STYLES = {
    common: {
        backgroundColor: '#272727',
        overflowY: 'auto',
        padding: '12px',
        borderRadius: '12px',
        marginBottom: '24px'
    },
    maxHeights: {
        defaultRatio: 0.8,
        recommendations: 1200,
        comments: 600
    }
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function findElement(selectors) {
    if (typeof selectors === 'string') return document.querySelector(selectors);
    return selectors.reduce((element, selector) => element || document.querySelector(selector), null);
}

function updateSectionHeight(section, maxHeight) {
    if (!section) return false;
    const height = Math.min(window.innerHeight * STYLES.maxHeights.defaultRatio, maxHeight);
    Object.assign(section.style, STYLES.common, { maxHeight: `${height}px` });
    return true;
}

function updateAllSections() {
    const sections = {
        recommendations: findElement(SELECTORS.recommendationsElement),
        comments: findElement(SELECTORS.commentsElement)
    };

    return updateSectionHeight(sections.recommendations, STYLES.maxHeights.recommendations) &&
           updateSectionHeight(sections.comments, STYLES.maxHeights.comments);
}

const observer = new MutationObserver(() => {
    if (updateAllSections()) {
        observer.disconnect();
    }
});

if (!updateAllSections()) {
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

window.addEventListener('resize', debounce(updateAllSections, 250));
