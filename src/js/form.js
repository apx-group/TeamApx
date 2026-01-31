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
    console.log('Bewerbung:', data);

    // Show success message
    form.hidden = true;
    successMessage.hidden = false;
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}