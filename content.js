// content.js - Haptik AI Projesi (Evrensel Site Uyumluluğu Sürümü)

const DEVICE_NAME = "Haptic_Fabric_ESP32";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const CLOUD_AI_URL = "https://haptic-project-ai.onrender.com/predict";

let characteristic = null;
let bluetoothDevice = null;

// 1. Bluetooth Bağlantı Yönetimi
async function getActiveCharacteristic() {
    if (characteristic && bluetoothDevice && bluetoothDevice.gatt.connected) {
        return characteristic;
    }
    return null;
}

async function connectToESP32() {
    const status = document.getElementById('haptic-status');
    try {
        status.innerText = "Cihaz aranıyor...";
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: DEVICE_NAME }],
            optionalServices: [SERVICE_UUID]
        });

        const server = await bluetoothDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        status.innerHTML = "<b style='color:green'>Sistem Bağlandı ✅</b>";
        document.getElementById('haptic-conn-btn').style.background = "#34a853";
        document.getElementById('haptic-conn-btn').innerText = "✅ Bağlı";
    } catch (e) {
        status.innerText = "Hata: " + e.message;
    }
}

// 2. Sayfadan Akıllı Metin Çıkarma (Evrensel Seçiciler)
function getProductMetadata() {
    // Farklı sitelerdeki ürün başlığı sınıfları
    const titleSelectors = [
        ".pr-new-br", // Trendyol
        ".product-name", // Hepsiburada
        "h1", // Genel / Amazon
        "#productTitle", // Amazon
        ".pro-title-container h1", // n11
        "[data-testid='product-title']", // Temu
        ".product-title" // Genel
    ];

    let title = "Bilinmeyen Ürün";
    for (let selector of titleSelectors) {
        let el = document.querySelector(selector);
        if (el && el.innerText.trim().length > 2) {
            title = el.innerText.trim();
            break;
        }
    }

    // Materyal ipuçlarını topla
    const keywords = ["materyal", "kumaş", "içerik", "kompozisyon", "%", "material", "fabric", "pamuk", "yün", "ipek", "denim", "saten"];
    let relevantText = "";
    
    // Tüm metin içeren elementleri tara (li ve td'ler genelde kumaş bilgisini tutar)
    const elements = document.querySelectorAll('li, td, p, span, div');
    elements.forEach(el => {
        if (el.children.length === 0) { // Sadece en uçtaki metin düğümlerini al
            const text = el.innerText.toLowerCase();
            if (keywords.some(k => text.includes(k)) && text.length < 200) {
                relevantText += text + " ";
            }
        }
    });

    return (title + " " + relevantText).toLowerCase().substring(0, 1000); // Max 1000 karakter
}

async function runAIAnalysis() {
    const status = document.getElementById('haptic-status');
    status.innerHTML = "Analiz ediliyor...";

    const finalText = getProductMetadata();
    console.log("AI'ya Giden Metin:", finalText);

    try {
        const response = await fetch(CLOUD_AI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: finalText })
        });
        
        const data = await response.json();
        status.innerHTML = `Karar: <b style="color:#e91e63">${data.fabric.toUpperCase()}</b> <br> <small>Güven: ${data.confidence}</small>`;
        
        const activeChar = await getActiveCharacteristic();
        if (activeChar) {
            const encoder = new TextEncoder();
            await activeChar.writeValue(encoder.encode(data.command));
        }
    } catch (err) {
        console.error("AI Analiz Hatası:", err);
        status.innerHTML = "<b style='color:red'>Bağlantı Hatası!</b>";
    }
}

// 3. Widget Arayüzü
function initWidget() {
    if (document.getElementById('haptic-widget')) return;
    
    const widget = document.createElement('div');
    widget.id = 'haptic-widget';
    // Stil ayarları (Ekranın en üstünde görünmesi için z-index artırıldı)
    widget.setAttribute('style', `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        z-index: 2147483647 !important; 
        background: white !important;
        padding: 15px !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 25px rgba(0,0,0,0.3) !important;
        width: 200px !important;
        font-family: Arial, sans-serif !important;
        border-top: 5px solid #1a73e8 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        color: #333 !important;
    `);
    
    widget.innerHTML = `
        <div style="font-weight:bold; color:#1a73e8; border-bottom:1px solid #eee; margin-bottom:5px; padding-bottom:5px; text-align:center;">Haptik AI 🖐️</div>
        <button id="haptic-conn-btn" style="width:100%; padding:8px; background:#1a73e8; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">🔗 Bağlantıyı Başlat</button>
        <button id="haptic-detect-btn" style="width:100%; padding:10px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">🔍 Kumaşı Hisset</button>
        <div id="haptic-status" style="font-size:12px; text-align:center; color:#555; background:#f8f9fa; padding:8px; border-radius:6px; border:1px solid #eee; min-height:30px;">Sistem Hazır</div>
    `;
    
    document.body.appendChild(widget);

    document.getElementById('haptic-conn-btn').onclick = connectToESP32;
    document.getElementById('haptic-detect-btn').onclick = runAIAnalysis;
}

// Sayfaya enjekte etme stratejisi
if (document.readyState === "complete" || document.readyState === "interactive") {
    initWidget();
} else {
    window.addEventListener("DOMContentLoaded", initWidget);
}

// Dinamik siteler için (Hepsiburada/Temu gibi) widget'ı kontrol et
setInterval(() => {
    if (!document.getElementById('haptic-widget')) {
        initWidget();
    }
}, 3000);