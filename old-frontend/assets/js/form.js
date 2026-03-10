// Custom Selects (Game, Rank)
(function() {
  function initCustomSelect(selectId, triggerId, inputId) {
    const select = document.getElementById(selectId);
    const trigger = document.getElementById(triggerId);
    const hiddenInput = document.getElementById(inputId);
    if (!select || !trigger || !hiddenInput) return;

    const textEl = trigger.querySelector('.custom-select-text');
    const options = select.querySelectorAll('.custom-select-option');

    trigger.addEventListener('click', () => {
      // Close other custom selects
      document.querySelectorAll('.custom-select.open').forEach(s => {
        if (s !== select) s.classList.remove('open');
      });
      select.classList.toggle('open');
    });

    options.forEach(option => {
      option.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        hiddenInput.value = option.dataset.value;
        trigger.classList.add('has-value');

        const img = option.querySelector('img');
        const label = option.querySelector('span').textContent;
        if (img) {
          textEl.innerHTML = '<img src="' + img.src + '" alt="' + img.alt + '"> ' + label;
        } else {
          textEl.textContent = label;
        }

        select.classList.remove('open');
      });
    });
  }

  initCustomSelect('game-select', 'game-trigger', 'game');
  initCustomSelect('rank-select', 'rank-trigger', 'rank');

  document.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-select.open').forEach(s => {
      if (!s.contains(e.target)) s.classList.remove('open');
    });
  });
})();

// Custom Multi Selects (Attacker Role, Defender Role)
(function() {
  var MAX = 3;

  function initMultiSelect(selectId, triggerId, inputId, placeholder) {
    var select = document.getElementById(selectId);
    var trigger = document.getElementById(triggerId);
    var hiddenInput = document.getElementById(inputId);
    if (!select || !trigger || !hiddenInput) return;

    var textEl = trigger.querySelector('.custom-multi-text');
    var options = select.querySelectorAll('.custom-multi-option');
    var selected = [];

    function render() {
      hiddenInput.value = selected.join(',');
      if (selected.length === 0) {
        trigger.classList.remove('has-value');
        textEl.innerHTML = placeholder;
        return;
      }
      trigger.classList.add('has-value');
      var html = '<span class="custom-multi-tags">';
      selected.forEach(function(val) {
        var opt = select.querySelector('[data-value="' + val + '"]');
        var label = opt ? opt.querySelector('span').textContent : val;
        html += '<span class="custom-multi-tag">' + label + '<span class="custom-multi-tag-remove" data-val="' + val + '">&times;</span></span>';
      });
      html += '</span>';
      textEl.innerHTML = html;

      // Bind remove buttons
      textEl.querySelectorAll('.custom-multi-tag-remove').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var val = btn.dataset.val;
          selected = selected.filter(function(v) { return v !== val; });
          var opt = select.querySelector('[data-value="' + val + '"]');
          if (opt) opt.classList.remove('selected');
          updateDisabled();
          render();
        });
      });
    }

    function updateDisabled() {
      options.forEach(function(opt) {
        if (selected.length >= MAX && !opt.classList.contains('selected')) {
          opt.classList.add('disabled');
        } else {
          opt.classList.remove('disabled');
        }
      });
    }

    trigger.addEventListener('click', function() {
      document.querySelectorAll('.custom-multi-select.open, .custom-select.open').forEach(function(s) {
        if (s !== select) s.classList.remove('open');
      });
      select.classList.toggle('open');
    });

    options.forEach(function(option) {
      option.addEventListener('click', function() {
        var val = option.dataset.value;
        if (option.classList.contains('selected')) {
          option.classList.remove('selected');
          selected = selected.filter(function(v) { return v !== val; });
        } else {
          if (selected.length >= MAX) return;
          option.classList.add('selected');
          selected.push(val);
        }
        updateDisabled();
        render();
      });
    });
  }

  var placeholderAtk = document.getElementById('atk-trigger');
  var placeholderDef = document.getElementById('def-trigger');
  var atkPh = placeholderAtk ? placeholderAtk.querySelector('.custom-multi-text').textContent : '';
  var defPh = placeholderDef ? placeholderDef.querySelector('.custom-multi-text').textContent : '';

  initMultiSelect('atk-select', 'atk-trigger', 'attacker-role', atkPh);
  initMultiSelect('def-select', 'def-trigger', 'defender-role', defPh);

  document.addEventListener('click', function(e) {
    document.querySelectorAll('.custom-multi-select.open').forEach(function(s) {
      if (!s.contains(e.target)) s.classList.remove('open');
    });
  });
})();

// Apply Form Validation & Submission
const form = document.getElementById('apply-form');
const successMessage = document.getElementById('apply-success');

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Reset errors
    form.querySelectorAll('.form-field').forEach(field => {
      field.classList.remove('error');
    });

    let isValid = true;

    // Validate required fields
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      const wrapper = field.closest('.form-field');
      const errorSpan = wrapper.querySelector('.form-error');

      if (!field.value.trim()) {
        wrapper.classList.add('error');
        errorSpan.textContent = 'Dieses Feld ist erforderlich.';
        isValid = false;
      }
    });

    // Validate age
    const ageField = document.getElementById('age');
    if (ageField && ageField.value) {
      const age = parseInt(ageField.value, 10);
      const wrapper = ageField.closest('.form-field');
      const errorSpan = wrapper.querySelector('.form-error');

      if (isNaN(age) || age < 13 || age > 99) {
        wrapper.classList.add('error');
        errorSpan.textContent = 'Bitte gib ein gültiges Alter ein (13–99).';
        isValid = false;
      }
    }

    if (!isValid) {
      // Scroll to first error
      const firstError = form.querySelector('.form-field.error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Collect form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.age = parseInt(data.age, 10);

    // Disable submit button
    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    // Send to backend
    fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        form.hidden = true;
        successMessage.hidden = false;
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(() => {
        alert('Fehler beim Senden. Bitte versuche es erneut.');
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      });
  });
}