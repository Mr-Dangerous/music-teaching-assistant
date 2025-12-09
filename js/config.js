// Configuration Module
// Defines question types and input methods for assessments

const AppConfig = {
  // Question type definitions
  // Maps question identifiers to their input configurations
  questionTypes: {
    // Music-specific assessments
    'task_1': {
      type: 'buttons',
      label: 'Task 1: Steady Beat',
      options: ['Mastered', 'Developing', 'Beginning', 'Not Assessed']
    },
    'task_2': {
      type: 'buttons',
      label: 'Task 2: Rhythm Pattern',
      options: ['Mastered', 'Developing', 'Beginning', 'Not Assessed']
    },
    'task_3': {
      type: 'buttons',
      label: 'Task 3: Pitch Matching',
      options: ['Mastered', 'Developing', 'Beginning', 'Not Assessed']
    },

    // Generic question types (can be used as templates)
    'multiple_choice': {
      type: 'buttons',
      label: 'Multiple Choice',
      options: ['Correct', 'Incorrect', 'Partial']
    },
    'skill_check': {
      type: 'checkboxes',
      label: 'Skill Assessment',
      options: ['Rhythm', 'Steady Beat', 'Pitch', 'Dynamics', 'Tempo', 'Timbre']
    },
    'rating': {
      type: 'scale',
      label: 'Performance Rating',
      min: 1,
      max: 5,
      labels: ['Needs Work', 'Fair', 'Good', 'Very Good', 'Excellent']
    },
    'observation': {
      type: 'text',
      label: 'Teacher Observation',
      placeholder: 'Enter detailed observation notes...'
    }
  },

  // Default input type if question not found in questionTypes
  defaultInputType: {
    type: 'text',
    label: 'Response',
    placeholder: 'Enter response...'
  },

  // UI Settings for smartboard
  ui: {
    // Minimum button size for touch targets
    minButtonSize: 44,

    // Font sizes
    fontSize: {
      small: '16px',
      normal: '18px',
      large: '24px',
      xlarge: '32px',
      heading: '36px'
    },

    // Colors (high contrast for smartboard)
    colors: {
      primary: '#2563eb',      // Blue
      secondary: '#7c3aed',    // Purple
      success: '#16a34a',      // Green
      warning: '#ea580c',      // Orange
      danger: '#dc2626',       // Red
      text: '#1f2937',         // Dark gray
      textLight: '#6b7280',    // Medium gray
      background: '#ffffff',   // White
      backgroundAlt: '#f3f4f6' // Light gray
    },

    // Animation settings
    animations: {
      transitionSpeed: '200ms',
      fadeSpeed: '150ms'
    }
  },

  // Input type renderer functions
  inputRenderers: {
    /**
     * Render button-based multiple choice
     */
    buttons: (config, currentValue, onInput) => {
      const container = document.createElement('div');
      container.className = 'input-buttons';

      config.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = option;
        button.dataset.value = option;

        if (currentValue === option) {
          button.classList.add('selected');
        }

        button.addEventListener('click', () => {
          // Remove selected from all buttons
          container.querySelectorAll('.option-button').forEach(btn => {
            btn.classList.remove('selected');
          });

          // Add selected to clicked button
          button.classList.add('selected');

          // Trigger input callback
          onInput(option);
        });

        container.appendChild(button);
      });

      return container;
    },

    /**
     * Render checkbox-based skill assessment
     */
    checkboxes: (config, currentValue, onInput) => {
      const container = document.createElement('div');
      container.className = 'input-checkboxes';

      // Parse current value (could be comma-separated list)
      const selectedOptions = currentValue ? currentValue.split(',').map(s => s.trim()) : [];

      config.options.forEach((option, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `checkbox-${index}`;
        checkbox.value = option;
        checkbox.checked = selectedOptions.includes(option);

        const label = document.createElement('label');
        label.htmlFor = `checkbox-${index}`;
        label.textContent = option;

        checkbox.addEventListener('change', () => {
          // Get all checked values
          const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);

          // Trigger input callback with comma-separated list
          onInput(checked.join(', '));
        });

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
      });

      return container;
    },

    /**
     * Render numeric scale/rating
     */
    scale: (config, currentValue, onInput) => {
      const container = document.createElement('div');
      container.className = 'input-scale';

      for (let i = config.min; i <= config.max; i++) {
        const button = document.createElement('button');
        button.className = 'scale-button';
        button.textContent = i;
        button.dataset.value = i;

        // Add label if available
        if (config.labels && config.labels[i - config.min]) {
          const label = document.createElement('span');
          label.className = 'scale-label';
          label.textContent = config.labels[i - config.min];
          button.appendChild(document.createElement('br'));
          button.appendChild(label);
        }

        if (currentValue == i) {
          button.classList.add('selected');
        }

        button.addEventListener('click', () => {
          // Remove selected from all buttons
          container.querySelectorAll('.scale-button').forEach(btn => {
            btn.classList.remove('selected');
          });

          // Add selected to clicked button
          button.classList.add('selected');

          // Trigger input callback
          onInput(i.toString());
        });

        container.appendChild(button);
      }

      return container;
    },

    /**
     * Render text input/textarea
     */
    text: (config, currentValue, onInput) => {
      const container = document.createElement('div');
      container.className = 'input-text';

      const textarea = document.createElement('textarea');
      textarea.className = 'text-input';
      textarea.placeholder = config.placeholder || 'Enter response...';
      textarea.value = currentValue || '';
      textarea.rows = 4;

      // Trigger input callback on change
      textarea.addEventListener('input', () => {
        onInput(textarea.value);
      });

      container.appendChild(textarea);
      return container;
    }
  }
};

// Export for use in other modules
window.AppConfig = AppConfig;
