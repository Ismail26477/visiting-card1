// static/js/view_card.js
// Robust QR + vCard generation + high-quality export (improved error handling and image fallback)
document.addEventListener('DOMContentLoaded', async () => {
    const cardContainer = document.getElementById('visitingCard');
    const nameElement = document.getElementById('cardName');
    const logoImage = document.getElementById('logoImage');
    const qrContainer = document.getElementById('qrcode');

    let vCardData = '';

    function safeText(s) {
        if (!s) return '';
        return String(s).replace(/[\r\n]+/g, ' ').replace(/[^\x09\x20-\x7E]/g, '').trim();
    }

    function buildVCard(card) {
    const lines = [];
    lines.push('BEGIN:VCARD');
    lines.push('VERSION:3.0');

    if (card.full_name) lines.push(`FN:${safeText(card.full_name)}`);

    if (card.full_name) {
        const parts = safeText(card.full_name).split(/\s+/);
        const family = parts.length > 1 ? parts.pop() : '';
        const given = parts.join(' ');
        lines.push(`N:${family};${given};;;`);
    }

    if (card.phone) lines.push(`TEL;TYPE=CELL:${safeText(card.phone)}`);
    if (card.email) lines.push(`EMAIL:${safeText(card.email)}`);
    if (card.company) lines.push(`ORG:${safeText(card.company)}`);
    if (card.job_title) lines.push(`TITLE:${safeText(card.job_title)}`);
    if (card.website) lines.push(`URL:${safeText(card.website)}`);
    if (card.address) lines.push(`ADR:;;${safeText(card.address)};;;;`);
    if (card.bio) lines.push(`NOTE:${safeText(card.bio)}`);

    // Embed photo if exists
    if (card.profile_image_data && card.profile_image_mime) {
        // Split base64 into lines of max 76 chars (RFC 2426)
        const photoBase64 = card.profile_image_data.replace(/\r?\n/g, '');
        const chunked = photoBase64.match(/.{1,76}/g).join('\r\n ');
        lines.push(`PHOTO;ENCODING=b;TYPE=${card.profile_image_mime.split('/')[1]}:\r\n ${chunked}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
}


    function containerHasSize(container) {
        const rect = container.getBoundingClientRect();
        return rect.width > 10 && rect.height > 10;
    }

    function clearQRContainer(container) {
        // Remove previous wrapper nodes if present
        container.innerHTML = '';
        container.removeAttribute('data-qr-generated');
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function generateQRInto(container, text, desiredPx = 320) {
        try {
            clearQRContainer(container);

            const start = Date.now();
            while (!containerHasSize(container) && Date.now() - start < 2000) {
                await wait(50);
            }

            const rect = container.getBoundingClientRect();
            const available = Math.max(Math.min(rect.width || desiredPx, rect.height || desiredPx), 100);
            const qrPx = Math.min(desiredPx, Math.floor(available));

            const wrapper = document.createElement('div');
            wrapper.className = 'qr-render-wrapper';
            wrapper.style.width = `${qrPx}px`;
            wrapper.style.height = `${qrPx}px`;
            wrapper.style.display = 'inline-block';
            wrapper.style.background = '#ffffff';
            wrapper.style.boxSizing = 'content-box';
            wrapper.style.padding = '0';
            wrapper.style.borderRadius = '8px';
            wrapper.style.lineHeight = '0';
            container.appendChild(wrapper);

            if (typeof QRCode === 'undefined') {
                console.error('QRCode library not loaded.');
                wrapper.remove();
                return false;
            }

            const opts = {
                text: text,
                width: qrPx,
                height: qrPx,
                colorDark: "#000000",
                colorLight: "#ffffff"
            };

            // set correction level only if available on the library
            try {
                if (QRCode && QRCode.CorrectLevel && QRCode.CorrectLevel.H) {
                    opts.correctLevel = QRCode.CorrectLevel.H;
                }
            } catch (err) {
                // ignore if not present
            }

            let generated = false;
            try {
                opts.useSVG = true;
                new QRCode(wrapper, opts);
                generated = true;
            } catch (e) {
                delete opts.useSVG;
                try {
                    new QRCode(wrapper, opts);
                    generated = true;
                } catch (err) {
                    console.warn('QRCode creation failed with and without SVG option:', err);
                    generated = false;
                }
            }

            await wait(80);

            const graphic = wrapper.querySelector('svg, img, canvas');
            if (!graphic) {
                wrapper.remove();
                console.warn('QR library produced no graphic element.');
                return false;
            }

            graphic.style.width = '100%';
            graphic.style.height = '100%';
            graphic.style.display = 'block';

            container.setAttribute('data-qr-generated', 'true');
            return true;
        } catch (err) {
            console.error('generateQRInto error:', err);
            clearQRContainer(container);
            return false;
        }
    }

    async function generateQRCodeWithRetries(container, text, attempts = 3, desiredPx = 320) {
        for (let i = 1; i <= attempts; i++) {
            const ok = await generateQRInto(container, text, desiredPx);
            if (ok) return true;
            await wait(120 * i);
        }

        clearQRContainer(container);
        const fallback = document.createElement('div');
        fallback.className = 'qr-fallback';
        fallback.style.width = `${Math.min(desiredPx, 200)}px`;
        fallback.style.height = `${Math.min(desiredPx, 200)}px`;
        fallback.style.display = 'flex';
        fallback.style.alignItems = 'center';
        fallback.style.justifyContent = 'center';
        fallback.style.background = '#ffffff';
        fallback.style.borderRadius = '8px';
        fallback.innerHTML = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="6" height="6" fill="#000"/><rect x="15" y="3" width="6" height="6" fill="#000"/><rect x="3" y="15" width="6" height="6" fill="#000"/><rect x="11" y="11" width="2" height="2" fill="#000"/></svg>`;
        container.appendChild(fallback);
        console.error('QR generation failed after retries.');
        return false;
    }

    try {
        if (typeof cardId === 'undefined' || !cardId) {
            cardContainer.innerHTML = `<p>Card ID missing</p>`;
            console.error('cardId is missing or undefined in template.');
            return;
        }

        const res = await fetch(`/api/cards/${cardId}`);
        if (!res.ok) {
            console.error('API returned non-OK status', res.status);
            cardContainer.innerHTML = `<p>Card not found (server error)</p>`;
            return;
        }

        const data = await res.json();
        if (!data.success || !data.data) {
            cardContainer.innerHTML = `<p>Card not found</p>`;
            console.warn('API response was not success:', data);
            return;
        }

        const card = data.data;

        cardContainer.className = `visiting-card ${card.template || 'template1'}`;
        nameElement.textContent = card.full_name || 'Unknown User';

        // Choose profile image: static URL > profile_image_data (base64) > placeholder
        if (card.profile_image_url) {
            logoImage.src = card.profile_image_url;
        } else if (card.profile_image_data) {
            const mime = card.profile_image_mime || 'image/png';
            logoImage.src = `data:${mime};base64,${card.profile_image_data}`;
        } else if (card.profile_image_src) {
            // back-compat: some server-side routes may have generated profile_image_src already
            logoImage.src = card.profile_image_src;
        } else {
            logoImage.src = 'https://via.placeholder.com/100';
        }

        vCardData = buildVCard(card);

        if (vCardData) {
            const ok = await generateQRCodeWithRetries(qrContainer, vCardData, 3, 320);
            if (!ok) console.warn('QR did not generate cleanly for display.');
        } else {
            console.error('vCard data empty.');
        }
    } catch (err) {
        console.error('Failed to load card:', err);
        cardContainer.innerHTML = `<p>Error loading card</p>`;
    }

    document.getElementById('downloadVCard').addEventListener('click', () => {
        if (!vCardData) {
            alert('No contact data to download.');
            return;
        }
        const blob = new Blob([vCardData], { type: 'text/vcard' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'contact.vcf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    async function exportCapture({ scale = 2, filename = 'visiting-card.png', asPdf = false } = {}) {
        try {
            // regenerate high-res QR
            await generateQRCodeWithRetries(qrContainer, vCardData, 3, Math.max(400, 320 * scale));
            await wait(200);

            const visitingCard = document.getElementById('visitingCard');
            const canvas = await html2canvas(visitingCard, { scale: scale, useCORS: true });

            if (!asPdf) {
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } else {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jspdf.jsPDF({
                    orientation: 'portrait',
                    unit: 'pt',
                    format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save('visiting-card.pdf');
            }

            // restore medium QR
            await generateQRCodeWithRetries(qrContainer, vCardData, 2, 320);
        } catch (err) {
            console.error('exportCapture error:', err);
            alert('Failed to export. See console for details.');
        }
    }

    document.getElementById('downloadPNG').addEventListener('click', () => exportCapture({ scale: 3, filename: 'visiting-card.png' }));
    document.getElementById('downloadPDF').addEventListener('click', () => exportCapture({ scale: 2, asPdf: true }));
});
