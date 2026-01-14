// Module Loader
// Handles loading and communication with custom task modules

class ModuleLoader {
  constructor() {
    this.currentQuestionModule = null;
    this.currentResponseModule = null;
  }

  /**
   * Load a custom module into a container as an iframe
   * @param {string} moduleUrl - Path to the module HTML file
   * @param {HTMLElement} container - DOM container to load module into
   * @param {Object} context - Context data to pass to module
   * @returns {Promise<HTMLIFrameElement>} - Promise that resolves with iframe element
   */
  loadModule(moduleUrl, container, context) {
    // Clear container
    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = moduleUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-fullscreen';
    iframe.allowFullscreen = true;

    return new Promise((resolve, reject) => {
      iframe.onload = () => {
        // Wait for module to be ready
        setTimeout(() => {
          try {
            // Normalize moduleUrl to just the filename (e.g., "modules/so_la_mi_trainer.html" -> "so_la_mi_trainer.html")
            const moduleFileName = moduleUrl.split('/').pop();

            // Get saved settings for this module (if any)
            const savedSettings = window.app?.getModuleSettings?.(moduleFileName) || null;

            console.log('Loading module:', moduleFileName, 'with settings:', savedSettings);

            // Send init context to module with saved settings
            iframe.contentWindow.postMessage({
              type: 'taskmodule:init',
              context: context,
              savedSettings: savedSettings  // Include saved settings
            }, '*');
            resolve(iframe);
          } catch (e) {
            reject(e);
          }
        }, 100);
      };

      iframe.onerror = () => {
        reject(new Error(`Failed to load module: ${moduleUrl}`));
      };

      container.appendChild(iframe);
    });
  }

  /**
   * Get response from current response module
   * @returns {any} - Response value from module, or null
   */
  getResponse() {
    if (!this.currentResponseModule) return null;

    try {
      const module = this.currentResponseModule.contentWindow.TaskModule;
      return module ? module.getResponse() : null;
    } catch (e) {
      console.error('Error getting response from module:', e);
      return null;
    }
  }

  /**
   * Check if current response module has a complete response
   * @returns {boolean} - True if response is complete
   */
  isComplete() {
    if (!this.currentResponseModule) return false;

    try {
      const module = this.currentResponseModule.contentWindow.TaskModule;
      return module ? module.isComplete() : false;
    } catch (e) {
      console.error('Error checking module completion:', e);
      return false;
    }
  }

  /**
   * Reset all loaded modules
   */
  reset() {
    if (this.currentQuestionModule) {
      this.unloadModule(this.currentQuestionModule);
      this.currentQuestionModule = null;
    }
    if (this.currentResponseModule) {
      this.unloadModule(this.currentResponseModule);
      this.currentResponseModule = null;
    }
  }

  /**
   * Unload a module iframe
   * @param {HTMLIFrameElement} iframe - Iframe to unload
   */
  unloadModule(iframe) {
    try {
      // Call module's reset if available
      if (iframe.contentWindow && iframe.contentWindow.TaskModule) {
        iframe.contentWindow.TaskModule.reset?.();
      }

      // Remove iframe from DOM
      iframe.remove();
    } catch (e) {
      console.error('Error unloading module:', e);
      // Still try to remove iframe even if reset failed
      try {
        iframe.remove();
      } catch (e2) {
        console.error('Error removing iframe:', e2);
      }
    }
  }
}

// Export for use in other modules
window.ModuleLoader = ModuleLoader;
