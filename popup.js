class PopupManager {
  constructor() {
    this.settings = {
      pipEnabled: true,
      scrollEnabled: true
    };
    this.isYouTube = false;
    this.init();
  }

  async init() {
    await this.checkCurrentTab();
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
  }

  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.isYouTube = tab && tab.url && /^https:\/\/(www\.)?youtube\.com\/watch\?v=/.test(tab.url);

      this.updateTabStatus();
    } catch (error) {
      console.log('Could not check current tab');
      this.isYouTube = false;
    }
  }

  updateTabStatus() {
    const title = document.getElementsByTagName('h1')[0];
    title && (title.style.opacity = !this.isYouTube && '0.25');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['pipEnabled', 'scrollEnabled']);
      this.settings.pipEnabled = result.pipEnabled !== false;
      this.settings.scrollEnabled = result.scrollEnabled !== false;
    } catch (error) {
      console.log('Settings not available, using defaults');
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set(this.settings);
      await this.notifyContentScript();
    } catch (error) {
      console.log('Could not save settings');
    }
  }

  async notifyContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && this.isYouTube) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'updateSettings',
            settings: this.settings
          });
        } catch (error) {
          await this.injectContentScript(tab.id);
        }
      }
    } catch (error) {
      console.log('Could not notify content script');
    }
  }

  async injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });

      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'updateSettings',
            settings: this.settings
          });
        } catch (error) {
          console.log('Could not send message after injection');
        }
      }, 500);
    } catch (error) {
      console.log('Could not inject content script');
    }
  }

  setupEventListeners() {
    const pipBtn = document.getElementById('pip-btn');
    if (pipBtn) {
      pipBtn.addEventListener('click', () => this.triggerPiP());
    }

    const pipToggle = document.getElementById('pip-toggle');
    const scrollToggle = document.getElementById('scroll-toggle');

    if (pipToggle) {
      pipToggle.addEventListener('click', () => {
        if (this.isYouTube) {
          this.toggleFeature('pip');
        }
      });
    }

    if (scrollToggle) {
      scrollToggle.addEventListener('click', () => {
        if (this.isYouTube) {
          this.toggleFeature('scroll');
        }
      });
    }
  }

  updateUI() {
    const pipToggle = document.getElementById('pip-toggle');
    const scrollToggle = document.getElementById('scroll-toggle');
    const pipBtn = document.getElementById('pip-btn');

    const pipLabel = pipToggle?.parentElement.querySelector('.toggle-label');
    const scrollLabel = scrollToggle?.parentElement.querySelector('.toggle-label');

    const isDisabled = !this.isYouTube;

    if (pipToggle) {
      pipToggle.classList.toggle('active', this.settings.pipEnabled && !isDisabled);
      pipToggle.classList.toggle('disabled', isDisabled);
      pipToggle.style.opacity = isDisabled ? '0.3' : '1';
      pipToggle.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    }

    if (scrollToggle) {
      scrollToggle.classList.toggle('active', this.settings.scrollEnabled && !isDisabled);
      scrollToggle.classList.toggle('disabled', isDisabled);
      scrollToggle.style.opacity = isDisabled ? '0.3' : '1';
      scrollToggle.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    }

    if (pipBtn) {
      const btnDisabled = !this.settings.pipEnabled || isDisabled;
      pipBtn.disabled = btnDisabled;
      pipBtn.style.opacity = btnDisabled ? '0.3' : '1';
      pipBtn.style.cursor = btnDisabled ? 'not-allowed' : 'pointer';
    }

    if (pipLabel) {
      pipLabel.style.color = isDisabled ? '#666' : '#ccc';
    }
    if (scrollLabel) {
      scrollLabel.style.color = isDisabled ? '#666' : '#ccc';
    }
  }

  async toggleFeature(feature) {
    if (!this.isYouTube) return;

    if (feature === 'pip') {
      this.settings.pipEnabled = !this.settings.pipEnabled;
    } else if (feature === 'scroll') {
      this.settings.scrollEnabled = !this.settings.scrollEnabled;
    }

    await this.saveSettings();
    this.updateUI();
  }

  async triggerPiP() {
    if (!this.settings.pipEnabled || !this.isYouTube) return;

    if (chrome && chrome.tabs && chrome.scripting) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab && tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const video = document.querySelector('video');
            if (video) {
              video.requestPictureInPicture()
                .catch(err => console.log('BetterYoutube: PiP failed:', err));
            } else {
              alert('No video found on this page.');
            }
          }
        });
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
