// static/js/create.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cardForm');
    const successMessage = document.getElementById('successMessage');
    const cardPreview = document.getElementById('cardPreview');

    // Live preview fields (expanded)
    const previewFields = {
        full_name: document.getElementById('previewName'),
        job_title: document.getElementById('previewTitle'),
        company: document.getElementById('previewCompany'),
        email: document.getElementById('previewEmail'),
        phone: document.getElementById('previewPhone'),
        profile_image: document.getElementById('previewImage'),
        website: document.getElementById('previewWebsite'),    // may be created below
        address: document.getElementById('previewAddress'),    // may be created below
        bio: document.getElementById('previewBio'),            // may be created below
        linkedin: document.getElementById('previewLinkedin'),
        twitter: document.getElementById('previewTwitter'),
        instagram: document.getElementById('previewInstagram'),
        facebook: document.getElementById('previewFacebook'),
        github: document.getElementById('previewGithub'),
    };

    // If the preview HTML doesn't already contain some optional nodes (website/address/bio/social icons),
    // create them dynamically inside the preview so the preview shows everything.
    (function ensurePreviewNodes() {
        const content = cardPreview.querySelector('.preview-content');

        // website
        if (!document.getElementById('previewWebsite')) {
            const p = document.createElement('p');
            p.id = 'previewWebsite';
            p.className = 'preview-website contact-item-preview';
            p.innerHTML = `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg> <span class="value"></span>`;
            content.appendChild(p);
            previewFields.website = document.getElementById('previewWebsite');
        }

        // address
        if (!document.getElementById('previewAddress')) {
            const p = document.createElement('p');
            p.id = 'previewAddress';
            p.className = 'preview-address contact-item-preview';
            p.innerHTML = `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> <span class="value"></span>`;
            content.appendChild(p);
            previewFields.address = document.getElementById('previewAddress');
        }

        // bio
        if (!document.getElementById('previewBio')) {
            const p = document.createElement('p');
            p.id = 'previewBio';
            p.className = 'preview-bio';
            p.textContent = '';
            content.appendChild(p);
            previewFields.bio = document.getElementById('previewBio');
        }

        // social links container (if not present)
        if (!document.getElementById('previewSocials')) {
            const div = document.createElement('div');
            div.id = 'previewSocials';
            div.className = 'preview-socials';
            div.innerHTML = `
                <a id="previewLinkedin" href="#" target="_blank" style="display:none;">LinkedIn</a>
                <a id="previewTwitter" href="#" target="_blank" style="display:none;">Twitter</a>
                <a id="previewInstagram" href="#" target="_blank" style="display:none;">Instagram</a>
                <a id="previewFacebook" href="#" target="_blank" style="display:none;">Facebook</a>
                <a id="previewGithub" href="#" target="_blank" style="display:none;">GitHub</a>
            `;
            content.appendChild(div);
            previewFields.linkedin = document.getElementById('previewLinkedin');
            previewFields.twitter = document.getElementById('previewTwitter');
            previewFields.instagram = document.getElementById('previewInstagram');
            previewFields.facebook = document.getElementById('previewFacebook');
            previewFields.github = document.getElementById('previewGithub');
        }
    })();

    // Utility to set a preview node: text or href and handle visibility
    function setPreviewText(idOrNode, value, isUrl = false) {
        if (!value) {
            if (idOrNode instanceof Element) idOrNode.style.display = 'none';
            else if (previewFields[idOrNode]) previewFields[idOrNode].style.display = 'none';
            return;
        }

        let node = (idOrNode instanceof Element) ? idOrNode : previewFields[idOrNode];
        if (!node) return;

        if (isUrl) {
            node.style.display = 'inline-block';
            node.href = value;
            node.textContent = value.replace(/^https?:\/\//,'');
        } else {
            node.style.display = 'block';
            // If node contains a <span class="value"> (for icons), populate that
            const v = node.querySelector && node.querySelector('.value');
            if (v) v.textContent = value;
            else node.textContent = value;
        }
    }

    // Update preview dynamically with smooth animations
    form.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', () => {
            const id = input.id;
            if (id === 'profile_image') {
                const file = input.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = e => {
                        previewFields.profile_image.style.opacity = '0';
                        setTimeout(() => {
                            previewFields.profile_image.src = e.target.result;
                            previewFields.profile_image.style.opacity = '1';
                        }, 200);
                    };
                    reader.readAsDataURL(file);
                }
            } else if (id === 'website') {
                setPreviewText('website', input.value, true);
            } else if (id === 'address') {
                setPreviewText('address', input.value);
            } else if (id === 'bio') {
                setPreviewText('bio', input.value);
            } else if (id === 'linkedin' || id === 'twitter' || id === 'instagram' || id === 'facebook' || id === 'github') {
                setPreviewText(id, input.value, true);
            } else if (previewFields[id]) {
                // animate text change
                const element = previewFields[id];
                element.style.opacity = '0';
                setTimeout(() => {
                    element.textContent = input.value || (id === 'full_name' ? 'Your Name' : `Your ${id.replace('_',' ')}`);
                    element.style.opacity = '1';
                }, 150);
            }
        });
    });

    // Add smooth transition to preview fields
    Object.values(previewFields).forEach(field => {
        if (field) field.style.transition = 'opacity 0.25s ease';
    });

    // Template change with animation + highlight template chooser
    const templateRadios = document.querySelectorAll('input[name="template"]');
    const templatePreviews = document.querySelectorAll('.template-preview');

    function setActiveTemplate(templateValue) {
        // change preview card class
        cardPreview.style.opacity = '0';
        cardPreview.style.transform = 'scale(0.98)';

        setTimeout(() => {
            cardPreview.className = 'card-preview ' + templateValue;
            cardPreview.style.opacity = '1';
            cardPreview.style.transform = 'scale(1)';
        }, 150);

        // highlight selected template preview blocks
        templatePreviews.forEach(tp => {
            tp.classList.toggle('active', tp.classList.contains(templateValue));
        });
    }

    templateRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            setActiveTemplate(radio.value);
        });
    });

    // On initial load mark active template (if a default checked exists)
    const initialChecked = document.querySelector('input[name="template"]:checked');
    if (initialChecked) setActiveTemplate(initialChecked.value);

    // Submit form with enhanced feedback (unchanged plus updates to preview after save)
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

                    // Basic fields
                    if (card.full_name) previewFields.full_name.textContent = card.full_name;
                    if (card.job_title) previewFields.job_title.textContent = card.job_title;
                    if (card.company) previewFields.company.textContent = card.company;
                    if (card.profile_image_url) previewFields.profile_image.src = card.profile_image_url;

                    // Other fields (use utilities so visibility is handled)
                    setPreviewText('website', card.website, true);
                    setPreviewText('address', card.address);
                    setPreviewText('bio', card.bio);

                    setPreviewText(previewFields.linkedin, card.linkedin, true);
                    setPreviewText(previewFields.twitter, card.twitter, true);
                    setPreviewText(previewFields.instagram, card.instagram, true);
                    setPreviewText(previewFields.facebook, card.facebook, true);
                    setPreviewText(previewFields.github, card.github, true);

                    // Ensure template applied
                    if (card.template) setActiveTemplate(card.template);
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

    // Initialize preview from default form values (so fields present on load are reflected)
    (function initPreviewFromForm() {
        const elements = form.querySelectorAll('input, textarea');
        elements.forEach(el => {
            // trigger input handlers to set initial preview
            const event = new Event('input', { bubbles: true });
            el.dispatchEvent(event);
        });
    })();
});
