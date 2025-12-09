// Response Handler Module
// Handles parsing and rendering different response input types

class ResponseHandler {
  constructor() {
    this.currentResponseType = null;
    this.currentResponse = '';
    this.onResponseChange = null;
    this.keyboardBuffer = '';
  }

  /**
   * Parse response type configuration string
   * @param {string} responseTypeStr - e.g., "multiple_choice(3|4|8|6)" or "free_type"
   * @returns {Object} - Parsed response type config
   */
  parseResponseType(responseTypeStr) {
    if (!responseTypeStr || responseTypeStr.trim() === '') {
      return { type: 'none' };
    }

    // Check for multiple_choice with parameters
    const multipleChoiceMatch = responseTypeStr.match(/^multiple_choice\((.*?)\)$/);
    if (multipleChoiceMatch) {
      const optionsStr = multipleChoiceMatch[1];
      const options = optionsStr.split('|').map(opt => opt.trim());
      return {
        type: 'multiple_choice',
        options: options
      };
    }

    // Check for free_type
    if (responseTypeStr.trim() === 'free_type') {
      return {
        type: 'free_type'
      };
    }

    // Unknown type
    return {
      type: 'unknown',
      raw: responseTypeStr
    };
  }

  /**
   * Render response input based on type
   * @param {string} responseTypeStr - Response type configuration string
   * @param {string} currentResponse - Current response value
   * @param {Function} onResponseChange - Callback when response changes
   * @returns {HTMLElement} - Response input container
   */
  renderResponseInput(responseTypeStr, currentResponse, onResponseChange) {
    this.currentResponse = currentResponse || '';
    this.onResponseChange = onResponseChange;

    const config = this.parseResponseType(responseTypeStr);
    this.currentResponseType = config.type;

    const container = document.createElement('div');
    container.className = 'response-input-container';
    container.id = 'dynamic-response-container';

    switch (config.type) {
      case 'multiple_choice':
        return this.renderMultipleChoice(config, container);

      case 'free_type':
        return this.renderFreeType(config, container);

      case 'none':
        container.innerHTML = '<p class="no-response-type">No response type configured for this task.</p>';
        return container;

      case 'unknown':
        container.innerHTML = `<p class="error-message">Unknown response type: ${config.raw}</p>`;
        return container;

      default:
        container.innerHTML = '<p class="error-message">Invalid response type</p>';
        return container;
    }
  }

  /**
   * Render multiple choice buttons
   */
  renderMultipleChoice(config, container) {
    container.className += ' response-multiple-choice';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'response-buttons';

    config.options.forEach(option => {
      const button = document.createElement('button');
      button.className = 'response-button';
      button.textContent = option;
      button.dataset.value = option;

      // Highlight if this is the current response
      if (this.currentResponse === option) {
        button.classList.add('selected');
      }

      button.addEventListener('click', () => {
        // Remove selected from all buttons
        buttonsContainer.querySelectorAll('.response-button').forEach(btn => {
          btn.classList.remove('selected');
        });

        // Add selected to clicked button
        button.classList.add('selected');

        // Update response
        this.currentResponse = option;
        if (this.onResponseChange) {
          this.onResponseChange(option);
        }
      });

      buttonsContainer.appendChild(button);
    });

    container.appendChild(buttonsContainer);
    return container;
  }

  /**
   * Render free type input with keyboard capture
   */
  renderFreeType(config, container) {
    container.className += ' response-free-type';

    // Display area
    const displayArea = document.createElement('div');
    displayArea.className = 'free-type-display';
    displayArea.id = 'free-type-display';

    const label = document.createElement('div');
    label.className = 'free-type-label';
    label.textContent = 'Student Answer:';

    const answerDisplay = document.createElement('div');
    answerDisplay.className = 'free-type-answer';
    answerDisplay.id = 'free-type-answer';
    answerDisplay.textContent = this.currentResponse || 'Start typing...';

    displayArea.appendChild(label);
    displayArea.appendChild(answerDisplay);

    // Instructions
    const instructions = document.createElement('p');
    instructions.className = 'free-type-instructions';
    instructions.textContent = 'Student can start typing. Press Enter to submit, Backspace to delete.';

    container.appendChild(displayArea);
    container.appendChild(instructions);

    // Set up keyboard capture
    this.setupKeyboardCapture();

    return container;
  }

  /**
   * Setup keyboard capture for free_type input
   */
  setupKeyboardCapture() {
    // Remove any existing keyboard listener
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
    }

    // Create new keyboard listener
    this.keyboardListener = (e) => {
      // Only capture if free_type is active
      if (this.currentResponseType !== 'free_type') {
        return;
      }

      // Don't capture if user is in a text input (for UI controls)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle different keys
      if (e.key === 'Enter') {
        // Submit response - trigger callback to start countdown
        e.preventDefault();
        if (this.onResponseChange && this.currentResponse) {
          this.onResponseChange(this.currentResponse);
        }
        return;
      } else if (e.key === 'Backspace') {
        // Delete last character
        e.preventDefault();
        if (this.currentResponse.length > 0) {
          this.currentResponse = this.currentResponse.slice(0, -1);
          this.updateFreeTypeDisplay();
          if (this.onResponseChange) {
            this.onResponseChange(this.currentResponse);
          }
        }
      } else if (e.key.length === 1) {
        // Regular character input
        e.preventDefault();
        this.currentResponse += e.key;
        this.updateFreeTypeDisplay();
        if (this.onResponseChange) {
          this.onResponseChange(this.currentResponse);
        }
      }
    };

    // Add keyboard listener
    document.addEventListener('keydown', this.keyboardListener);
  }

  /**
   * Update free type display with current response
   */
  updateFreeTypeDisplay() {
    const answerDisplay = document.getElementById('free-type-answer');
    if (answerDisplay) {
      answerDisplay.textContent = this.currentResponse || 'Start typing...';

      // Add highlight animation
      answerDisplay.classList.remove('highlight');
      void answerDisplay.offsetWidth; // Trigger reflow
      answerDisplay.classList.add('highlight');
    }
  }

  /**
   * Clear keyboard listener (call when switching students or screens)
   */
  clearKeyboardListener() {
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
      this.keyboardListener = null;
    }
  }

  /**
   * Reset handler state
   */
  reset() {
    this.clearKeyboardListener();
    this.currentResponseType = null;
    this.currentResponse = '';
    this.onResponseChange = null;
    this.keyboardBuffer = '';
  }
}

// Export for use in other modules
window.ResponseHandler = ResponseHandler;
