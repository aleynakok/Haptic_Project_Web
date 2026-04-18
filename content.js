// content.js - Haptik AI Projesi (Mute Durumu Hafızalı Sürüm)

const DEVICE_NAME = "Haptic_Fabric_ESP32";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const CLOUD_AI_URL = "https://haptic-project-ai.onrender.com/predict";

let characteristic = null;
let bluetoothDevice = null;
let isMuted = false;

// 1. Bluetooth Bağlantı Yönetimi
async function getActiveCharacteristic() {
    if (characteristic && bluetoothDevice && bluetoothDevice.gatt.connected) {
        return characteristic;
    }
    return null;
}

// Otomatik Bağlantı Kontrolü
async function checkAutoConnect() {
    const status = document.getElementById('haptic-status');
    try {
        const devices = await navigator.bluetooth.getDevices();
        const existingDevice = devices.find(d => d.name === DEVICE_NAME);

        if (existingDevice) {
            console.log("Eski bağlantı bulundu, otomatik bağlanılıyor...");
            status.innerText = "Otomatik bağlanılıyor...";
            await setupGATT(existingDevice);
        }
    } catch (e) {
        console.log("Otomatik bağlantı yapılamadı:", e);
    }
}

async function setupGATT(device) {
    const status = document.getElementById('haptic-status');
    const connBtn = document.getElementById('haptic-conn-btn');
    bluetoothDevice = device;
    
    bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

    const server = await bluetoothDevice.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    status.innerHTML = "<b style='color:green'>Sistem Bağlandı ✅</b>";
    if (connBtn) {
        connBtn.style.background = "#34a853";
        connBtn.innerText = "✅ Bağlı";
    }

    // BAĞLANINCA: Eğer o an Mute açıksa "0" göndererek cihazı sustur
    if (isMuted) {
        sendMuteCommand(true);
    }
}

function onDisconnected() {
    const status = document.getElementById('haptic-status');
    const connBtn = document.getElementById('haptic-conn-btn');
    status.innerHTML = "<b style='color:red'>Bağlantı Kesildi!</b>";
    if (connBtn) {
        connBtn.style.background = "#1a73e8";
        connBtn.innerText = "🔗 Bağlantıyı Başlat";
    }
}

async function connectToESP32() {
    const status = document.getElementById('haptic-status');
    try {
        status.innerText = "Cihaz aranıyor...";
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: DEVICE_NAME }],
            optionalServices: [SERVICE_UUID]
        });
        await setupGATT(device);
    } catch (e) {
        status.innerText = "Hata: " + e.message;
    }
}

// MUTE DURUMUNU KAYDET VE GÖNDER
async function handleMuteToggle(checked) {
    isMuted = checked;
    const status = document.getElementById('haptic-status');

    // 1. Durumu Chrome Hafızasına Kaydet
    chrome.storage.local.set({ "haptic_mute_state": isMuted });

    // 2. Cihaza Komut Gönder
    await sendMuteCommand(isMuted);

    status.innerHTML = isMuted ? "<b style='color:#e91e63'>Sistem Susturuldu (0)</b>" : "<b style='color:green'>Sistem Aktif (u)</b>";
}

async function sendMuteCommand(mute) {
    const activeChar = await getActiveCharacteristic();
    if (activeChar) {
        try {
            const encoder = new TextEncoder();
            const cmd = mute ? "0" : "u";
            await activeChar.writeValue(encoder.encode(cmd));
        } catch (e) {
            console.error("Mute komut hatası:", e);
        }
    }
}

async function runAIAnalysis() {
    const status = document.getElementById('haptic-status');
    status.innerHTML = "⏳ Analiz ediliyor...";
    const finalText = getProductMetadata();

    try {
        const response = await fetch(CLOUD_AI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: finalText })
        });
        const data = await response.json();
        status.innerHTML = `Karar: <b style="color:#e91e63">${data.fabric.toUpperCase()}</b><br><small>Güven: ${data.confidence}</small>`;
        
        // MUTE KONTROLÜ
        if (!isMuted) {
            const activeChar = await getActiveCharacteristic();
            if (activeChar) {
                const encoder = new TextEncoder();
                await activeChar.writeValue(encoder.encode(data.command));
            }
        }
    } catch (err) {
        status.innerHTML = "<b style='color:red'>Hata!</b>";
    }
}

// Ürün Meta Verisi Çıkarıcı
function getProductMetadata() {
    const titleSelectors = [".pr-new-br", ".product-name", "h1", "#productTitle", ".pro-title-container h1", "[data-testid='product-title']", ".product-title"];
    let title = "Bilinmeyen Ürün";
    for (let selector of titleSelectors) {
        let el = document.querySelector(selector);
        if (el && el.innerText.trim().length > 2) {
            title = el.innerText.trim();
            break;
        }
    }
    const keywords = ["materyal", "kumaş", "içerik", "kompozisyon", "%", "material", "fabric", "pamuk", "yün", "ipek", "denim", "saten"];
    let relevantText = "";
    const elements = document.querySelectorAll('li, td, p, span, div');
    elements.forEach(el => {
        if (el.children.length === 0) {
            const text = el.innerText.toLowerCase();
            if (keywords.some(k => text.includes(k)) && text.length < 200) {
                relevantText += text + " ";
            }
        }
    });
    return (title + " " + relevantText).toLowerCase().substring(0, 1000);
}

function initWidget() {
    if (document.getElementById('haptic-widget')) return;
    
    const widget = document.createElement('div');
    widget.id = 'haptic-widget';
    widget.setAttribute('style', `
        position: fixed !important; bottom: 20px !important; right: 20px !important;
        z-index: 2147483647 !important; background: white !important; padding: 15px !important;
        border-radius: 12px !important; box-shadow: 0 4px 25px rgba(0,0,0,0.3) !important;
        width: 200px !important; font-family: Arial, sans-serif !important;
        border-top: 5px solid #1a73e8 !important; display: flex !important;
        flex-direction: column !important; gap: 10px !important; color: #333 !important;
    `);
    
    widget.innerHTML = `
        <div style="font-weight:bold; color:#1a73e8; border-bottom:1px solid #eee; padding-bottom:5px; text-align:center;">Haptik AI 🖐️</div>
        
        <div style="display:flex; align-items:center; justify-content:space-between; background:#f0f7ff; padding:8px; border-radius:8px; border:1px solid #d0e3ff;">
            <span style="font-size:12px; font-weight:bold; color:#444;">Haptik Mute</span>
            <label class="haptic-switch" style="position:relative; display:inline-block; width:34px; height:20px;">
                <input type="checkbox" id="haptic-mute-switch" style="opacity:0; width:0; height:0;">
                <span class="haptic-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#ccc; transition:.4s; border-radius:34px;"></span>
            </label>
        </div>

        <button id="haptic-conn-btn" style="width:100%; padding:8px; background:#1a73e8; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">🔗 Bağlantıyı Başlat</button>
        <button id="haptic-detect-btn" style="width:100%; padding:10px; background:#34a853; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">🔍 Kumaşı Hisset</button>
        <div id="haptic-status" style="font-size:11px; text-align:center; color:#555; background:#f8f9fa; padding:8px; border-radius:6px; border:1px solid #eee; min-height:30px;">Sistem Hazır</div>
    `;
    
    document.body.appendChild(widget);

    const slider = widget.querySelector('.haptic-slider');
    const knob = document.createElement('div');
    knob.setAttribute('style', `position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%;`);
    slider.appendChild(knob);

    const muteCheckbox = document.getElementById('haptic-mute-switch');

    // WIDGET AÇILINCA: Kayıtlı Mute durumunu yükle
    chrome.storage.local.get("haptic_mute_state", (data) => {
        if (data.haptic_mute_state !== undefined) {
            isMuted = data.haptic_mute_state;
            muteCheckbox.checked = isMuted;
            // Görseli güncelle
            knob.style.transform = isMuted ? "translateX(14px)" : "translateX(0)";
            slider.style.backgroundColor = isMuted ? "#e91e63" : "#ccc";
        }
    });

    document.getElementById('haptic-conn-btn').onclick = connectToESP32;
    document.getElementById('haptic-detect-btn').onclick = runAIAnalysis;
    
    muteCheckbox.onchange = (e) => {
        knob.style.transform = e.target.checked ? "translateX(14px)" : "translateX(0)";
        slider.style.backgroundColor = e.target.checked ? "#e91e63" : "#ccc";
        handleMuteToggle(e.target.checked);
    };

    checkAutoConnect();
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    initWidget();
} else {
    window.addEventListener("DOMContentLoaded", initWidget);
}

setInterval(() => {
    if (!document.getElementById('haptic-widget')) initWidget();
}, 3000);