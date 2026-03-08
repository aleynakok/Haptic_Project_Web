// content.js - Akıllı Kumaş Analiz Modülü (Sıfır Kurulum)

// AI Mantığı: Kelime Ağırlıkları ve Karar Matrisi
const FABRIC_BRAIN = {
    'Cotton': { keywords: ['cotton', 'pamuk', 'penye', 'breathable', 'soft', 't-shirt'], weight: 0 },
    'Denim': { keywords: ['denim', 'kot', 'jean', 'rugged', 'jacket', 'blue'], weight: 0 },
    'Wool': { keywords: ['wool', 'yün', 'triko', 'kazak', 'winter', 'knitted', 'warm'], weight: 0 },
    'Silk': { keywords: ['silk', 'ipek', 'saten', 'satin', 'luxury', 'smooth', 'shiny'], weight: 0 }
};

const COMMANDS = { 'Silk': '1', 'Cotton': '3', 'Denim': '5', 'Wool': '6' };

function analyzeFabric(text) {
    const cleanText = text.toLowerCase();
    let bestMatch = "Silk"; // Varsayılan (Eğer hiçbir şey bulamazsa)
    let maxScore = -1;

    // Her kumaş için puan hesapla
    for (let fabric in FABRIC_BRAIN) {
        let score = 0;
        FABRIC_BRAIN[fabric].keywords.forEach(word => {
            if (cleanText.includes(word)) {
                score += 10; // Kelime geçerse puan ver
            }
        });
        
        if (score > maxScore) {
            maxScore = score;
            bestMatch = fabric;
        }
    }

    // Eğer metin çok kısaysa veya hiç kelime bulunamadıysa metin uzunluğuna göre tahmin yürüt
    if (maxScore <= 0) {
        if (cleanText.length > 500) bestMatch = "Cotton"; // Genelde uzun açıklamalar pamuklu ürünlerdedir
        else bestMatch = "Silk";
    }

    return { fabric: bestMatch, command: COMMANDS[bestMatch] };
}

// Widget ve Buton Mantığı
function initWidget() {
    if (document.getElementById('haptic-widget')) return;
    const widget = document.createElement('div');
    widget.id = 'haptic-widget';
    widget.style = "position:fixed; bottom:20px; right:20px; z-index:999999; background:white; padding:15px; border-radius:12px; box-shadow:0 4px 25px rgba(0,0,0,0.3); width:200px; font-family:sans-serif; border-top: 5px solid #1a73e8;";
    
    widget.innerHTML = `
        <div style="font-weight:bold; color:#1a73e8; margin-bottom:12px; text-align:center;">Haptik AI 🖐️</div>
        <button id="haptic-detect-btn" style="width:100%; padding:12px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Analizi Başlat</button>
        <div id="haptic-status" style="margin-top:12px; font-size:12px; text-align:center; color:#444; background:#f8f9fa; padding:10px; border-radius:6px; border:1px solid #eee;">Hazır</div>
    `;
    document.body.appendChild(widget);

    document.getElementById('haptic-detect-btn').onclick = async () => {
        const status = document.getElementById('haptic-status');
        status.innerText = "Analiz ediliyor...";

        // Sayfa metnini al
        const pageText = document.body.innerText.substring(0, 1500); 
        
        // --- AI ANALİZİ BURADA ÇALIŞIR (PYTHON'A GİTMEZ) ---
        const result = analyzeFabric(pageText);

        // Sonucu göster
        status.innerHTML = `Karar: <b style="color:#e91e63">${result.fabric}</b>`;
        
        // Bluetooth bağlantısı varsa komutu gönder
        // if (characteristic) { ... await characteristic.writeValue(...) ... }
        console.log("ESP32'ye gidecek komut:", result.command);
    };
}

setInterval(initWidget, 2000);