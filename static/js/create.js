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

    // Update preview dynamically with smooth animations
    form.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', () => {
            if (previewFields[input.id]) {
                if (input.type === 'file') {
                    const file = input.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = e => {
                            previewFields[input.id].style.opacity = '0';
                            setTimeout(() => {
                                previewFields[input.id].src = e.target.result;
                                previewFields[input.id].style.opacity = '1';
                            }, 200);
                        };
                        reader.readAsDataURL(file);
                    }
                } else {
                    const element = previewFields[input.id];
                    element.style.opacity = '0';
                    setTimeout(() => {
                        element.textContent = input.value || `Your ${input.id.replace('_', ' ')}`;
                        element.style.opacity = '1';
                    }, 150);
                }
            }
        });
    });

    // Add smooth transition to preview fields
    Object.values(previewFields).forEach(field => {
        field.style.transition = 'opacity 0.3s ease';
    });

    // Template change with animation
    const templateRadios = document.querySelectorAll('input[name="template"]');
    templateRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            cardPreview.style.opacity = '0';
            cardPreview.style.transform = 'scale(0.95)';

            setTimeout(() => {
                cardPreview.className = 'card-preview ' + radio.value;
                cardPreview.style.opacity = '1';
                cardPreview.style.transform = 'scale(1)';
            }, 200);
        });
    });

    // Add transition to card preview
    cardPreview.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    // Submit form with enhanced feedback
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>Creating...</span>';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';

        try {
            const response = await fetch('/api/cards', { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                form.style.opacity = '0';
                form.style.transform = 'translateY(-20px)';

                setTimeout(() => {
                    form.style.display = 'none';
                    successMessage.style.display = 'block';
                    successMessage.style.opacity = '0';
                    successMessage.style.transform = 'translateY(20px)';

                    setTimeout(() => {
                        successMessage.style.transition = 'all 0.5s ease';
                        successMessage.style.opacity = '1';
                        successMessage.style.transform = 'translateY(0)';
                    }, 50);

                    document.getElementById('viewCardLink').href = `/card/${result.data._id}`;

                    // Update right-side preview with saved data
                    const card = result.data;
                    previewFields.full_name.textContent = card.full_name;
                    previewFields.job_title.textContent = card.job_title;
                    previewFields.company.textContent = card.company;
                    previewFields.email.textContent = card.email;
                    previewFields.phone.textContent = card.phone;
                    if (card.profile_image_url) previewFields.profile_image.src = card.profile_image_url;
                }, 300);
            } else {
                alert('Error creating card: ' + result.error);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
        } catch (error) {
            alert('Error creating card: ' + error.message);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    });

    // Add form transition
    form.style.transition = 'all 0.3s ease';
});
