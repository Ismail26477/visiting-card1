// static/js/view_card.js
document.addEventListener('DOMContentLoaded', async () => {
    const cardContainer = document.getElementById('visitingCard');
    const nameElement = document.getElementById('cardName');
    const logoImage = document.getElementById('logoImage');
    const qrContainer = document.getElementById('qrcode');

    let vCardData = '';

    // --- helper: build vCard robustly with CRLF line endings ---
    function buildVCard(card) {
        const lines = [];
        lines.push('BEGIN:VCARD');
        lines.push('VERSION:3.0');
        if (card.full_name) lines.push(`FN:${card.full_name}`);
        if (card.full_name) {
            const parts = card.full_name.trim().split(/\s+/);
            const family = parts.length > 1 ? parts.pop() : '';
            const given = parts.join(' ');
            lines.push(`N:${family};${given};;;`);
        }
        if (card.phone) lines.push(`TEL;TYPE=CELL:${card.phone}`);
        if (card.email) lines.push(`EMAIL:${card.email}`);
        if (card.company) lines.push(`ORG:${card.company}`);
        if (card.job_title) lines.push(`TITLE:${card.job_title}`);
        if (card.website) lines.push(`URL:${card.website}`);
        if (card.address) lines.push(`ADR:;;${card.address};;;;`);
        if (card.bio) lines.push(`NOTE:${card.bio.replace(/\r?\n/g, ' ')}`);
        lines.push('END:VCARD');
        return lines.join('\r\n');
    }

    // --- Try to render QR using QRCode lib. If it fails, try an alternate canvas-based fallback.
    // --- In ANY error case we DO NOT write the raw vCard text into the visible UI.
    function generateQRCode(container, text) {
        // clear previous QR and any stray nodes
        container.innerHTML = '';

        // keep a hidden blob element for downloads/debug if needed
        const hiddenPre = document.createElement('pre');
        hiddenPre.style.display = 'none';
        hiddenPre.textContent = text;
        hiddenPre.id = 'hidden-vcard-payload';
        container.appendChild(hiddenPre);

        // try primary library-based render
        try {
            // If QRCode is not defined this will throw and go to catch
            new QRCode(container, {
                text: text,
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // ensure hidden pre remains hidden and does not affect layout
            hiddenPre.style.display = 'none';
            return;
        } catch (err) {
            console.warn('QRCode lib failed, will try fallback canvas method.', err);
        }

        // fallback: draw a simple QR using a lightweight library-less approach using "qrcode" npm style is not available in browser.
        // We'll attempt to use "kjua" if present, otherwise keep hidden payload and bail silently.
        try {
            // kjua renders to an element if present (some projects include other QR libs)
            if (typeof kjua === 'function') {
                const img = kjua({ text, size: 150, render: 'image' });
                container.appendChild(img);
                hiddenPre.style.display = 'none';
                return;
            }
        } catch (err) {
            console.warn('kjua fallback failed.', err);
        }

        // final safe fallback: don't show raw vCard — instead show a small non-intrusive placeholder icon/text
        const fallback = document.createElement('div');
        fallback.setAttribute('aria-hidden', 'true');
        fallback.className = 'qr-fallback';
        fallback.innerHTML = `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" style="opacity:.85"><rect x="3" y="3" width="6" height="6" fill="#000"/><rect x="15" y="3" width="6" height="6" fill="#000"/><rect x="3" y="15" width="6" height="6" fill="#000"/><rect x="11" y="11" width="2" height="2" fill="#000"/></svg>`;
        container.appendChild(fallback);

        // hiddenPre remains available for download or debugging but not visible
        hiddenPre.style.display = 'none';
    }

    try {
        const res = await fetch(`/api/cards/${cardId}`);
        const data = await res.json();

        if (data.success && data.data) {
            const card = data.data;

            // Apply template class (optional: template still used for styling)
            cardContainer.className = `visiting-card ${card.template || 'template1'}`;

            // Populate only logo and name (we removed title/company/contact/social from DOM)
            nameElement.textContent = card.full_name || 'Unknown User';
            logoImage.src = card.profile_image_url || 'https://via.placeholder.com/100';

            // Build vCard (keeps full contact in the QR/download but not shown visually)
            vCardData = buildVCard(card);

            // Generate QR code
            generateQRCode(qrContainer, vCardData);
        } else {
            cardContainer.innerHTML = `<p>Card not found</p>`;
        }
    } catch (err) {
        console.error(err);
        cardContainer.innerHTML = `<p>Error loading card</p>`;
    }

    // Download vCard button - uses the vCard string (hiddenPre is for redundancy)
    document.getElementById('downloadVCard').addEventListener('click', () => {
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

    // Download PNG
    document.getElementById('downloadPNG').addEventListener('click', () => {
        html2canvas(document.getElementById('visitingCard')).then(canvas => {
            const link = document.createElement('a');
            link.download = 'visiting-card.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });

    // Download PDF
    document.getElementById('downloadPDF').addEventListener('click', async () => {
        const card = document.getElementById('visitingCard');
        const canvas = await html2canvas(card);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF();
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save('visiting-card.pdf');
    });
}); 
