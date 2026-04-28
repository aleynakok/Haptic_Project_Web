const DEVICE_NAME = "Haptic_Fabric_ESP32";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const CLOUD_AI_URL = "https://haptic-project-ai.onrender.com/predict";

let characteristic = null;
let bluetoothDevice = null;
let isMuted = false;

async function getActiveCharacteristic() {
    if (characteristic && bluetoothDevice && bluetoothDevice.gatt.connected) {
        return characteristic;
    }
    return null;
}

async function checkAutoConnect() {
    const status = document.getElementById('haptic-status');
    try {
        const devices = await navigator.bluetooth.getDevices();
        const existingDevice = devices.find(d => d.name === DEVICE_NAME);

        if (existingDevice) {
            console.log("OLD CONNECTION FOUND, CONNECTING AUTOMATICALLY...");
            status.innerText = "CONNECTING AUTOMATICALLY...";
            await setupGATT(existingDevice);
        }
    } catch (e) {
        console.log("AUTOMATIC CONNECTION ERROR:", e);
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

    status.innerHTML = "<b style='color:green'>SYSTEM CONNECTED</b>";
    if (connBtn) {
        connBtn.style.background = "#34a853";
        connBtn.innerText = "Connected";
    }

    if (isMuted) {
        sendMuteCommand(true);
    }
}

function onDisconnected() {
    const status = document.getElementById('haptic-status');
    const connBtn = document.getElementById('haptic-conn-btn');
    status.innerHTML = "<b style='color:red'>CONNECTION LOST!</b>";
    if (connBtn) {
        connBtn.style.background = "#1a73e8";
        connBtn.innerText = "🔗 START CONNECTION";
    }
}

async function connectToESP32() {
    const status = document.getElementById('haptic-status');
    try {
        status.innerText = "SEARCHING FOR DEVICE...";
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: DEVICE_NAME }],
            optionalServices: [SERVICE_UUID]
        });
        await setupGATT(device);
    } catch (e) {
        status.innerText = "Error: " + e.message;
    }
}

async function handleMuteToggle(checked) {
    isMuted = checked;
    const status = document.getElementById('haptic-status');

    chrome.storage.local.set({ "haptic_mute_state": isMuted });

    await sendMuteCommand(isMuted);

    status.innerHTML = isMuted 
        ? "<span style='color:#FF2E7E; text-shadow: 0 0 8px rgba(255,46,126,0.5)'>SYSTEM MUTED</span>" 
        : "<span style='color:#00FBFF; text-shadow: 0 0 8px rgba(0,251,255,0.5)'>SYSTEM UNMUTED</span>";
}

async function sendMuteCommand(mute) {
    const activeChar = await getActiveCharacteristic();
    if (activeChar) {
        try {
            const encoder = new TextEncoder();
            const cmd = mute ? "0" : "u";
            await activeChar.writeValue(encoder.encode(cmd));
        } catch (e) {
            console.error("MUTE COMMAND ERROR:", e);
        }
    }
}

async function runAIAnalysis() {
    const status = document.getElementById('haptic-status');
    status.innerHTML = "ANALYZING THE FABRIC..."; 
    
    const productText = getProductMetadata();

    try {
        const response = await fetch(CLOUD_AI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: productText })
        });
        
        const data = await response.json();
        
        status.innerHTML = `
            <div style="margin-bottom: 2px;">KARAR: <span style="color:#FF2E7E">${data.fabric.toUpperCase()}</span></div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7); letter-spacing: 2px;">GÜVEN: ${data.confidence}</div>
        `;
        
        if (!isMuted) {
            const activeChar = await getActiveCharacteristic();
            if (activeChar) {
                const encoder = new TextEncoder();
                await activeChar.writeValue(encoder.encode(data.command));
            }
        }
    } catch (err) {
        status.innerHTML = "<span style='color:#FF2E7E'>ANALYSIS ERROR</span>";
    }
}

function getProductMetadata() {
    const titleSelectors = [".pr-new-br", ".product-name", "h1", "#productTitle", ".pro-title-container h1", "[data-testid='product-title']", ".product-title"];
    let title = "Unknown Product";
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

    widget.innerHTML = `
        <div class="haptic-header">
            <div>
                <span class="haptic-glitch-text">HAPTIC AI</span>
            </div>
            <div class="haptic-status-dot"></div>
        </div>

        <div class="haptic-glass-card">
            <span class="haptic-label">HAPTIC MUTE</span>
            <label class="haptic-switch">
                <input type="checkbox" id="haptic-mute-switch">
                <span class="haptic-slider"></span>
            </label>
        </div>

        <div class="haptic-actions">
            <button id="haptic-conn-btn" class="haptic-btn btn-blue">START THE SYSTEM</button>
            <button id="haptic-detect-btn" class="haptic-btn btn-cyan">FEEL THE FABRIC</button>
        </div>

        <div id="haptic-status-bar">
            <div id="haptic-status">SYSTEM READY</div>
        </div>
    `;
    
    document.body.appendChild(widget);

    document.getElementById('haptic-conn-btn').onclick = connectToESP32;
    document.getElementById('haptic-detect-btn').onclick = runAIAnalysis;
    
    const muteCheckbox = document.getElementById('haptic-mute-switch');
    
    chrome.storage.local.get("haptic_mute_state", (data) => {
        if (data.haptic_mute_state !== undefined) {
            isMuted = data.haptic_mute_state;
            muteCheckbox.checked = isMuted;
            if (isMuted) handleMuteToggle(true);
        }
    });

    muteCheckbox.onchange = (e) => handleMuteToggle(e.target.checked);


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