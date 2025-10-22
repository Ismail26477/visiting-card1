document.addEventListener('DOMContentLoaded', async function() {
    const form = document.getElementById('editCardForm');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const colorInput = document.getElementById('theme_color');
    const colorValue = document.getElementById('colorValue');

    document.getElementById('cancelBtn').href = `/card/${cardId}`;

    try {
        const response = await fetch(`/api/cards/${cardId}`);
        const result = await response.json();

        loadingSpinner.style.display = 'none';

        if (result.success && result.data) {
            populateForm(result.data);
            form.style.display = 'block';
        } else {
            alert('Card not found');
            window.location.href = '/cards';
        }
    } catch (error) {
        loadingSpinner.style.display = 'none';
        alert('Error loading card: ' + error.message);
        window.location.href = '/cards';
    }

    colorInput.addEventListener('input', function() {
        colorValue.textContent = this.value;
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            full_name: document.getElementById('full_name').value,
            job_title: document.getElementById('job_title').value,
            company: document.getElementById('company').value,
            bio: document.getElementById('bio').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            website: document.getElementById('website').value,
            address: document.getElementById('address').value,
            linkedin: document.getElementById('linkedin').value,
            twitter: document.getElementById('twitter').value,
            theme_color: document.getElementById('theme_color').value,
            profile_image_url: document.getElementById('profile_image_url').value,
            is_public: document.getElementById('is_public').checked
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`/api/cards/${cardId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                alert('Card updated successfully!');
                window.location.href = `/card/${cardId}`;
            } else {
                alert('Error updating card: ' + result.error);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            alert('Error updating card: ' + error.message);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});

function populateForm(card) {
    document.getElementById('full_name').value = card.full_name;
    document.getElementById('job_title').value = card.job_title || '';
    document.getElementById('company').value = card.company || '';
    document.getElementById('bio').value = card.bio || '';
    document.getElementById('email').value = card.email || '';
    document.getElementById('phone').value = card.phone || '';
    document.getElementById('website').value = card.website || '';
    document.getElementById('address').value = card.address || '';
    document.getElementById('linkedin').value = card.linkedin || '';
    document.getElementById('twitter').value = card.twitter || '';
    document.getElementById('theme_color').value = card.theme_color || '#2563eb';
    document.getElementById('colorValue').textContent = card.theme_color || '#2563eb';
    document.getElementById('profile_image_url').value = card.profile_image_url || '';
    document.getElementById('is_public').checked = card.is_public;
}
