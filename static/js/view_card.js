document.addEventListener('DOMContentLoaded', async () => {
    const cardContainer = document.getElementById('visitingCard');
    const nameElement = document.getElementById('cardName');
    const logoImage = document.getElementById('logoImage');
    const qrContainer = document.getElementById('qrcode');
 
    try {
        const res = await fetch(`/api/cards/${cardId}`);
        const data = await res.json();

        if (data.success && data.data) {
            const card = data.data;

            nameElement.textContent = card.full_name || 'Unknown User';
            logoImage.src = card.profile_image_url || 'https://via.placeholder.com/80';

            // Encode vCard data for saving contact in phone
            const vCardData = `
BEGIN:VCARD
VERSION:3.0
N:${card.full_name || ''};
TEL:${card.phone || ''}
EMAIL:${card.email || ''}
ORG:${card.company || ''}
TITLE:${card.job_title || ''}
URL:${card.website || ''}
ADR:${card.address || ''}
END:VCARD
            `;

            // Generate QR code
            new QRCode(qrContainer, {
                text: vCardData.trim(),
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            cardContainer.innerHTML = `<p>Card not found</p>`;
        }
    } catch (err) {
        console.error(err);
        cardContainer.innerHTML = `<p>Error loading card</p>`;
    }

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

