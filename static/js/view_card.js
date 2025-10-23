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

    function generateQRCode(container, text) {
        container.innerHTML = '';

        try {
            if (typeof QRCode === 'undefined') {
                console.error('QRCode library not loaded');
                container.innerHTML = '<p style="font-size: 12px; color: #666;">QR Code unavailable</p>';
                return;
            }

            new QRCode(container, {
                text: text,
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (err) {
            console.error('QR Code generation failed:', err);
            container.innerHTML = '<p style="font-size: 12px; color: #666;">QR Code generation failed</p>';
        }
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
