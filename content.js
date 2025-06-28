/**
 * BetterYoutube - Enhanced YouTube experience with better scrolling and Picture-in-Picture
 */
class BetterYoutube {
    constructor() {
        this.selectors = {
            recommendationsElement: [
                'ytd-item-section-renderer.style-scope.ytd-watch-next-secondary-results-renderer',
                '#related'
            ],
            commentsElement: [
                'ytd-comments.style-scope.ytd-watch-flexy',
                '#comments'
            ],
            controls: '.ytp-right-controls',
            miniplayerBtn: '.ytp-miniplayer-button'
        };

        this.styles = {
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

        this.pipBtnId = 'yt-pip-pro-btn';
        this.observer = null;
        this.pipObserver = null;
        this.settings = {
            pipEnabled: true,
            scrollEnabled: true
        };
        this.validateChromeAPIs();
        this.init();
    }

    /**
     * Validate Chrome APIs availability
     */
    validateChromeAPIs() {
        this.chromeAPIsAvailable = !!(
            typeof chrome !== 'undefined' &&
            chrome.runtime &&
            chrome.storage &&
            chrome.storage.sync
        );

        if (!this.chromeAPIsAvailable) {
            console.warn('BetterYoutube: Chrome extension APIs not available. Some features may not work properly.');
        }
    }

    /**
     * Initialize the extension
     */
    async init() {
        await this.loadSettings();
        this.setupMessageListener();

        if (this.settings.scrollEnabled) {
            this.setupScrollEnhancements();
        }

        if (this.settings.pipEnabled) {
            this.setupPictureInPicture();
        }

        this.setupEventListeners();
    }

    /**
     * Utility function to debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Find element using multiple selectors
     */
    findElement(selectors) {
        if (typeof selectors === 'string') return document.querySelector(selectors);
        return selectors.reduce((element, selector) => element || document.querySelector(selector), null);
    }

    /**
     * Apply scroll container styles to a section
     */
    updateSectionHeight(section, maxHeight) {
        if (!section) return false;
        const height = Math.min(window.innerHeight * this.styles.maxHeights.defaultRatio, maxHeight);
        Object.assign(section.style, this.styles.common, { maxHeight: `${height}px` });
        return true;
    }

    /**
     * Remove scroll container styles from a section
     */
    removeSectionHeight(section) {
        if (!section) return false;
        Object.keys(this.styles.common).forEach(key => {
            section.style[key] = '';
        });
        section.style.maxHeight = '';
        return true;
    }

    /**
     * Update all scroll sections
     */
    updateAllSections() {
        const sections = {
            recommendations: this.findElement(this.selectors.recommendationsElement),
            comments: this.findElement(this.selectors.commentsElement)
        };

        const recommendationsUpdated = this.updateSectionHeight(
            sections.recommendations,
            this.styles.maxHeights.recommendations
        );
        const commentsUpdated = this.updateSectionHeight(
            sections.comments,
            this.styles.maxHeights.comments
        );

        return recommendationsUpdated && commentsUpdated;
    }

    /**
     * Remove all scroll enhancements
     */
    removeAllSections() {
        const sections = {
            recommendations: this.findElement(this.selectors.recommendationsElement),
            comments: this.findElement(this.selectors.commentsElement)
        };

        this.removeSectionHeight(sections.recommendations);
        this.removeSectionHeight(sections.comments);
    }

    /**
     * Setup scroll enhancements with observer
     */
    setupScrollEnhancements() {
        const debouncedUpdateAllSections = this.debounce(() => {
            this.updateAllSections();
        }, 300);

        this.observer = new MutationObserver(() => {
            debouncedUpdateAllSections();
        });

        this.updateAllSections();

        const watchContainer = document.querySelector('ytd-watch-flexy');
        if (watchContainer) {
            this.observer.observe(watchContainer, {
                childList: true,
                subtree: true
            });
        } else {
            this.observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }
    }

    /**
     * Disable scroll enhancements
     */
    disableScrollEnhancements() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.removeAllSections();
    }

    /**
     * Create and add Picture-in-Picture button
     */
    addPiPButton() {
        if (!this.settings.pipEnabled) return;
        if (document.getElementById(this.pipBtnId)) return;

        const controls = document.querySelector(this.selectors.controls);
        const miniplayerBtn = document.querySelector(this.selectors.miniplayerBtn);

        if (!controls || !miniplayerBtn) return;

        const btn = document.createElement('button');
        btn.id = this.pipBtnId;
        btn.className = 'ytp-button';
        btn.title = 'Pop out video';
        btn.innerHTML = this.getPiPButtonSVG();
        btn.onclick = () => this.triggerPictureInPicture();

        miniplayerBtn.parentNode.insertBefore(btn, miniplayerBtn.nextSibling);
    }

    /**
     * Remove Picture-in-Picture button
     */
    removePiPButton() {
        const btn = document.getElementById(this.pipBtnId);
        if (btn) {
            btn.remove();
        }
    }

    /**
     * Get the SVG icon for PiP button
     */
    getPiPButtonSVG() {
        return `<svg width="32" height="25" viewBox="0 0 464 364" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:auto;">
            <g>
                <path d="M240.375 327H232H97C61.1015 327 32 297.899 32 262V92C32 56.1015 61.1015 27 97 27H367C402.898 27 432 56.1015 432 92V102V139.5V158.25V167.625" stroke="white" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="282" y="215" width="150" height="112" rx="25" stroke="#FF0033" stroke-width="22" stroke-linejoin="round"/>
                <path d="M116.8 100.6C113.265 97.949 108.251 98.6654 105.6 102.2C102.949 105.735 103.665 110.749 107.2 113.4L116.8 100.6ZM213.131 189.92C217.505 189.295 220.544 185.243 219.919 180.869L209.737 109.592C209.112 105.219 205.06 102.179 200.686 102.804C196.312 103.429 193.273 107.481 193.898 111.855L202.949 175.212L139.592 184.263C135.218 184.888 132.179 188.94 132.804 193.314C133.429 197.688 137.481 200.727 141.855 200.102L213.131 189.92ZM112 107L107.2 113.4L157.2 150.9L162 144.5L166.8 138.1L116.8 100.6L112 107ZM199.5 172.625L194.7 179.025L207.2 188.4L212 182L216.8 175.6L204.3 166.225L199.5 172.625ZM162 144.5L157.2 150.9L169.7 160.275L174.5 153.875L179.3 147.475L166.8 138.1L162 144.5ZM174.5 153.875L169.7 160.275L175.95 164.963L180.75 158.563L185.55 152.163L179.3 147.475L174.5 153.875ZM180.75 158.563L175.95 164.963L182.2 169.65L187 163.25L191.8 156.85L185.55 152.163L180.75 158.563ZM187 163.25L182.2 169.65L188.45 174.338L193.25 167.938L198.05 161.538L191.8 156.85L187 163.25ZM193.25 167.938L188.45 174.338L194.7 179.025L199.5 172.625L204.3 166.225L198.05 161.538L193.25 167.938Z" fill="white"/>
            </g>
        </svg>`;
    }

    /**
     * Trigger Picture-in-Picture mode
     */
    triggerPictureInPicture() {
        if (!this.settings.pipEnabled) return;

        const video = document.querySelector('video');
        if (video) {
            video.requestPictureInPicture()
                .then(() => console.log('BetterYoutube: PiP activated'))
                .catch(err => console.warn('BetterYoutube: PiP failed:', err));
        }
    }

    /**
     * Setup Picture-in-Picture functionality
     */
    setupPictureInPicture() {
        if (this.pipObserver) {
            this.pipObserver.disconnect();
        }

        this.pipObserver = new MutationObserver(() => {
            this.addPiPButton();
        });

        const playerContainer = document.querySelector('#movie_player');
        if (playerContainer) {
            this.pipObserver.observe(playerContainer, {
                childList: true,
                subtree: true
            });
        } else {
            this.pipObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        this.addPiPButton();
    }

    /**
     * Disable Picture-in-Picture functionality
     */
    disablePictureInPicture() {
        if (this.pipObserver) {
            this.pipObserver.disconnect();
            this.pipObserver = null;
        }
        this.removePiPButton();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const debouncedUpdate = this.debounce(() => this.updateAllSections(), 250);
        window.addEventListener('resize', debouncedUpdate);

        document.addEventListener('DOMContentLoaded', () => {
            this.setupPictureInPicture();
        });
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        if (!this.chromeAPIsAvailable) {
            console.log('BetterYoutube: Chrome APIs not available, using default settings');
            return;
        }

        try {
            const result = await chrome.storage.sync.get(['pipEnabled', 'scrollEnabled']);
            this.settings.pipEnabled = result.pipEnabled !== false;
            this.settings.scrollEnabled = result.scrollEnabled !== false;
        } catch (error) {
            console.log('BetterYoutube: Settings not available, using defaults');
        }
    }

    /**
     * Setup message listener for settings updates
     */
    setupMessageListener() {
        if (!this.chromeAPIsAvailable) {
            console.log('BetterYoutube: Chrome APIs not available, message listener not set up');
            return;
        }

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateSettings') {
                this.updateSettings(message.settings);
                sendResponse({ success: true });
            }
            return true;
        });
    }

    /**
     * Update settings and restart features
     */
    updateSettings(newSettings) {
        const oldSettings = { ...this.settings };
        this.settings = { ...newSettings };

        let hasChanges = false;

        if (oldSettings.scrollEnabled !== this.settings.scrollEnabled) {
            hasChanges = true;
            if (this.settings.scrollEnabled) {
                this.setupScrollEnhancements();
            } else {
                this.disableScrollEnhancements();
            }
        }

        if (oldSettings.pipEnabled !== this.settings.pipEnabled) {
            hasChanges = true;
            if (this.settings.pipEnabled) {
                this.setupPictureInPicture();
            } else {
                this.disablePictureInPicture();
            }
        }

        if (hasChanges) {
            this.saveSettings();
        }
    }

    /**
     * Save settings to storage
     */
    async saveSettings() {
        if (!this.chromeAPIsAvailable) {
            return;
        }

        try {
            await chrome.storage.sync.set(this.settings);
        } catch (error) {
            console.log('BetterYoutube: Could not save settings');
        }
    }

    /**
     * Cleanup observers (useful for testing or cleanup)
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.pipObserver) {
            this.pipObserver.disconnect();
            this.pipObserver = null;
        }
        if (this.debouncedUpdate) {
            window.removeEventListener('resize', this.debouncedUpdate);
        }
        this.removeAllSections();
        this.removePiPButton();
    }
}

const betterYoutube = new BetterYoutube();
