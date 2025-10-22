document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cardForm');
    const successMessage = document.getElementById('successMessage');
    const cardPreview = document.getElementById('cardPreview');

    // Live preview fields
    const previewFields = {
        full_name: document.getElementById('previewName'),
        job_title: document.getElementById('previewTitle'),
        company: document.getElementById('previewCompany'),
        email: document.getElementById('previewEmail'),
        phone: document.getElementById('previewPhone'),
        profile_image: document.getElementById('previewImage')
    };

    // Update preview dynamically
    form.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', () => {
            if (previewFields[input.id]) {
                if (input.type === 'file') {
                    const file = input.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = e => previewFields[input.id].src = e.target.result;
                        reader.readAsDataURL(file);
                    }
                } else {
                    previewFields[input.id].textContent = input.value || `Your ${input.id.replace('_', ' ')}`;
                }
            }
        });
    });

    // Template change
    const templateRadios = document.querySelectorAll('input[name="template"]');
    templateRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            cardPreview.className = 'card-preview ' + radio.value;
        });
    });

    // Submit form
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/cards', { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                form.style.display = 'none';
                successMessage.style.display = 'block';
                document.getElementById('viewCardLink').href = `/card/${result.data._id}`;
                // Update right-side preview with saved data
                const card = result.data;
                previewFields.full_name.textContent = card.full_name;
                previewFields.job_title.textContent = card.job_title;
                previewFields.company.textContent = card.company;
                previewFields.email.textContent = card.email;
                previewFields.phone.textContent = card.phone;
                if (card.profile_image_url) previewFields.profile_image.src = card.profile_image_url;
            } else {
                alert('Error creating card: ' + result.error);
            }
        } catch (error) {
            alert('Error creating card: ' + error.message);
        } finally {
            submitBtn.textContent = 'Create Card';
            submitBtn.disabled = false;
        }
    });
});
