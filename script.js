// MẬT KHẨU TÀI KHOẢN VÀ BẢO VỆ MẠCH: 12345
const userDatabase = {
    "AnduongG4": "12345",
    "BaKietG4": "12345"
};

let currentTab = 'overview';
let isMasterAuto = true;
let pendingToggleDeviceId = null;
let pendingTargetState = null;
let currentUser = null;
let isAdminUnlocked = false;

// DỮ LIỆU SOI 6 QUẢ TRỨNG
let selectedEggId = null;
const eggsData = [
    { id: 1, name: "Trứng Quả #1", status: 1, age: 14, hatchTime: "04 Ngày nữa nở", heartbeat: "145 nhịp/phút", vein: "Mạch máu phôi rõ", notes: "Phôi trứng khỏe mạnh, tim đập tốt" },
    { id: 2, name: "Trứng Quả #2", status: 1, age: 14, hatchTime: "04 Ngày nữa nở", heartbeat: "142 nhịp/phút", vein: "Mạch máu rõ", notes: "Phôi trứng phát triển bình thường" },
    { id: 3, name: "Trứng Quả #3", status: 1, age: 14, hatchTime: "04 Ngày nữa nở", heartbeat: "148 nhịp/phút", vein: "Mạch máu rõ", notes: "Phôi trứng rất khỏe" },
    { id: 4, name: "Trứng Quả #4", status: 3, age: 14, hatchTime: "Không nở được", heartbeat: "0 nhịp/phút", vein: "Không có phôi", notes: "Trứng hỏng hoặc không có phôi. Nên loại bỏ khỏi khay" },
    { id: 5, name: "Trứng Quả #5", status: 1, age: 14, hatchTime: "04 Ngày nữa nở", heartbeat: "140 nhịp/phút", vein: "Mạch máu rõ", notes: "Phôi trứng phát triển bình thường" },
    { id: 6, name: "Trứng Quả #6", status: 1, age: 14, hatchTime: "04 Ngày nữa nở", heartbeat: "144 nhịp/phút", vein: "Mạch máu rõ", notes: "Phôi trứng phát triển bình thường" }
];

// GIAO TIẾP ARDUINO / ESP
let wsSocket = null;
let isHardwareConnected = false;

// TỰ ĐỘNG NHẬN DẠNG IP HOTSPOT DÀNH CHO MOBILE
let espIp = (window.location.hostname === "192.168.4.1" || window.location.hostname.startsWith("192.168.4.")) 
            ? "192.168.4.1" 
            : (localStorage.getItem("saved_esp_ip") || "10.77.157.50");

// DANH SÁCH THIẾT BỊ
const incubatorDevices = [
    { id: 'exhaust_fan', nameVI: 'Quạt Hút Gió Nóng', icon: 'fa-fan', state: true },
    { id: 'intake_fan', nameVI: 'Quạt Thổi Khí Tủ', icon: 'fa-wind', state: true },
    { id: 'ptc_heater', nameVI: 'Bộ Sưởi Gốm', icon: 'fa-fire-burner', state: true },
    { id: 'water_pump', nameVI: 'Bơm Nước Tạo Ẩm', icon: 'fa-water', state: true },
    { id: 'candling_light', nameVI: 'Đèn Soi Trứng', icon: 'fa-lightbulb', state: false },
    { id: 'carousel_motor', nameVI: 'Mô Tơ Xoay Trứng', icon: 'fa-rotate', state: true }
];

// KIỂM TRA LỖI HTTPS VÀ TRÌNH DUYỆT DI ĐỘNG KHI TẢI TRANG
window.addEventListener('DOMContentLoaded', () => {
    checkHttpsMobileIssue();
});

function checkHttpsMobileIssue() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isHttps = window.location.protocol === 'https:';

    if (isHttps && isMobile) {
        showHttpsWarningBanner();
    }
}

function showHttpsWarningBanner() {
    if (document.getElementById('https-warning-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'https-warning-banner';
    banner.className = "fixed top-16 left-3 right-3 z-50 p-4 bg-amber-500 text-white rounded-2xl shadow-2xl border border-amber-300 backdrop-blur-md animate-bounce";
    
    banner.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="text-2xl mt-0.5"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="flex-1 text-xs space-y-1">
                <div class="font-extrabold text-sm">Cảnh báo kết nối Mobile (HTTPS)</div>
                <p class="leading-relaxed">Trình duyệt điện thoại chặn WebSocket không mã hóa từ web HTTPS (GitHub Pages). Để kết nối mạch thành công, vui lòng mở bằng HTTP local:</p>
                <div class="pt-2 flex gap-2">
                    <button onclick="redirectToHttpLocal()" class="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl shadow transition">
                        Chuyển sang http://${espIp}
                    </button>
                    <button onclick="document.getElementById('https-warning-banner').remove()" class="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(banner);
}

function redirectToHttpLocal() {
    window.location.href = `http://${espIp}`;
}

// MỞ KHÓA BẢO VỆ CẤU HÌNH MẠCH VỚI MẬT KHẨU 12345
function unlockAdminIP() {
    const pwd = prompt("Xác minh người vận hành:\nVui lòng nhập mật khẩu (Mặc định: 12345):");
    if (pwd === "12345") {
        isAdminUnlocked = true;
        
        const selectBoard = document.getElementById('board-type-select');
        const ipInput = document.getElementById('esp-ip-input');
        
        selectBoard.disabled = false;
        selectBoard.classList.remove('bg-slate-100', 'cursor-not-allowed');
        selectBoard.classList.add('bg-white');

        ipInput.disabled = false;
        ipInput.classList.remove('bg-slate-100', 'text-slate-600', 'cursor-not-allowed');
        ipInput.classList.add('bg-white', 'text-slate-800');

        document.getElementById('btn-unlock-ip').classList.add('hidden');
        document.getElementById('ip-action-group').classList.remove('hidden');

        const badge = document.getElementById('ip-lock-badge');
        badge.className = "px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs font-bold flex items-center gap-1";
        badge.innerHTML = `<i class="fa-solid fa-lock-open"></i> Đã Mở Cấu Hình`;
    } else if (pwd !== null) {
        alert("Mật khẩu không đúng! (Mật khẩu chuẩn là: 12345)");
    }
}

function lockAdminIP() {
    isAdminUnlocked = false;
    
    const selectBoard = document.getElementById('board-type-select');
    const ipInput = document.getElementById('esp-ip-input');

    selectBoard.disabled = true;
    selectBoard.classList.add('bg-slate-100', 'cursor-not-allowed');
    selectBoard.classList.remove('bg-white');

    ipInput.disabled = true;
    ipInput.classList.add('bg-slate-100', 'text-slate-600', 'cursor-not-allowed');
    ipInput.classList.remove('bg-white', 'text-slate-800');

    document.getElementById('btn-unlock-ip').classList.remove('hidden');
    document.getElementById('ip-action-group').classList.add('hidden');

    const badge = document.getElementById('ip-lock-badge');
    badge.className = "px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] sm:text-xs font-bold flex items-center gap-1";
    badge.innerHTML = `<i class="fa-solid fa-lock"></i> Đã Khóa`;
}

// RENDER TRỨNG
function renderEggSelectorGrid() {
    const grid = document.getElementById('egg-selector-grid');
    if (!grid) return;
    grid.innerHTML = '';

    eggsData.forEach(egg => {
        let badgeColor = "bg-emerald-100 text-emerald-800";
        let statusText = "Khỏe Mạnh";
        let iconColor = "text-emerald-500";

        if (egg.status === 2) {
            badgeColor = "bg-amber-100 text-amber-800";
            statusText = "Phôi Yếu";
            iconColor = "text-amber-500";
        } else if (egg.status === 3) {
            badgeColor = "bg-rose-100 text-rose-800";
            statusText = "Trứng Hỏng";
            iconColor = "text-rose-500";
        }

        const isSelected = selectedEggId === egg.id;

        const card = document.createElement('div');
        card.onclick = () => selectEgg(egg.id);
        card.className = `ultra-glass p-3 sm:p-4 text-center cursor-pointer transition-all border ${isSelected ? 'egg-card-selected' : 'border-white/60 hover:border-amber-400'}`;

        card.innerHTML = `
            <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-amber-100/60 mx-auto flex items-center justify-center text-lg sm:text-xl mb-1.5 ${iconColor}">
                <i class="fa-solid fa-egg"></i>
            </div>
            <div class="font-extrabold text-xs sm:text-sm text-slate-900">${egg.name}</div>
            <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${badgeColor}">
                ${statusText}
            </span>
        `;
        grid.appendChild(card);
    });
}

function selectEgg(id) {
    selectedEggId = id;
    renderEggSelectorGrid();

    const backBtn = document.getElementById('btn-back-overview');
    if (id === null) {
        if (backBtn) backBtn.classList.add('hidden');
        renderOverallEggsView();
    } else {
        if (backBtn) backBtn.classList.remove('hidden');
        renderSingleEggView(id);
    }
}

function renderOverallEggsView() {
    const container = document.getElementById('egg-info-display-container');
    if (!container) return;

    let goodCount = eggsData.filter(e => e.status === 1).length;
    let weakCount = eggsData.filter(e => e.status === 2).length;
    let badCount = eggsData.filter(e => e.status === 3).length;

    container.innerHTML = `
        <div class="space-y-4 sm:space-y-6">
            <div class="ultra-glass p-4 sm:p-6 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-emerald-50/50 border-amber-300/80 shadow-md">
                <div class="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
                    <div class="space-y-1.5 text-center lg:text-left">
                        <span class="px-3 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] sm:text-xs font-black uppercase tracking-wide">
                            <i class="fa-solid fa-chart-pie mr-1"></i> Báo Cáo Khay Trứng
                        </span>
                        <h2 class="text-xl sm:text-3xl font-black text-slate-900">Dự Đoán Thời Gian Nở</h2>
                        <p class="text-[11px] sm:text-xs text-slate-600 font-semibold">Tự động tính dựa theo nhiệt độ & độ ẩm buồng ấp</p>
                    </div>

                    <div class="bg-white/90 p-4 sm:p-6 rounded-2xl border border-amber-200 shadow-md text-center w-full lg:w-auto min-w-[240px]">
                        <div class="text-[10px] sm:text-xs text-slate-500 font-extrabold uppercase">Thời Gian Dự Kiến Còn Lại</div>
                        <div id="hatch-countdown-timer" class="text-2xl sm:text-3xl font-black text-amber-600 my-1 tracking-wider font-mono">
                            04 Ngày nữa
                        </div>
                        <div class="w-full bg-amber-100 h-2.5 rounded-full overflow-hidden my-2">
                            <div class="bg-gradient-to-r from-amber-500 to-emerald-500 h-full w-[80%] rounded-full"></div>
                        </div>
                        <div id="hatch-index-val" class="text-[11px] sm:text-xs text-emerald-700 font-bold">Tỷ lệ nở tối ưu: 83.3%</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
                <div class="bg-emerald-50/90 p-3 sm:p-5 rounded-2xl border border-emerald-200 shadow-sm">
                    <div class="text-[10px] sm:text-xs font-extrabold text-emerald-800 uppercase truncate">Trứng Khỏe</div>
                    <div class="text-2xl sm:text-4xl font-black text-emerald-600 my-1">${goodCount} Quả</div>
                    <div class="text-[10px] sm:text-xs text-emerald-700 font-semibold hidden sm:block">Phôi phát triển tốt</div>
                </div>

                <div class="bg-amber-50/90 p-3 sm:p-5 rounded-2xl border border-amber-200 shadow-sm">
                    <div class="text-[10px] sm:text-xs font-extrabold text-amber-800 uppercase truncate">Phôi Yếu</div>
                    <div class="text-2xl sm:text-4xl font-black text-amber-600 my-1">${weakCount} Quả</div>
                    <div class="text-[10px] sm:text-xs text-amber-700 font-semibold hidden sm:block">Cần theo dõi sát</div>
                </div>

                <div class="bg-rose-50/90 p-3 sm:p-5 rounded-2xl border border-rose-200 shadow-sm">
                    <div class="text-[10px] sm:text-xs font-extrabold text-rose-800 uppercase truncate">Trứng Hỏng</div>
                    <div class="text-2xl sm:text-4xl font-black text-rose-600 my-1">${badCount} Quả</div>
                    <div class="text-[10px] sm:text-xs text-rose-700 font-semibold hidden sm:block">Nên loại bỏ</div>
                </div>
            </div>
        </div>
    `;
}

function renderSingleEggView(id) {
    const container = document.getElementById('egg-info-display-container');
    const egg = eggsData.find(e => e.id === id);
    if (!container || !egg) return;

    let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
    let statusText = "PHÁT TRIỂN TỐT";
    if (egg.status === 2) {
        badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
        statusText = "PHÔI YẾU";
    } else if (egg.status === 3) {
        badgeColor = "bg-rose-100 text-rose-800 border-rose-300";
        statusText = "TRỨNG HỎNG";
    }

    container.innerHTML = `
        <div class="ultra-glass p-4 sm:p-6 bg-gradient-to-r from-amber-50/60 via-white/80 to-emerald-50/60 border-amber-200 shadow-md space-y-4 sm:space-y-6">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl sm:text-3xl shadow-md shrink-0">
                        <i class="fa-solid fa-egg"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <h2 class="text-lg sm:text-2xl font-black text-slate-900">${egg.name}</h2>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}">${statusText}</span>
                        </div>
                        <p class="text-[11px] text-slate-500 font-semibold mt-0.5">Nhận diện qua Camera HuskyLens</p>
                    </div>
                </div>

                <div class="bg-white/90 px-3.5 py-2 rounded-xl border border-amber-200 shadow-sm w-full sm:w-auto text-left sm:text-right">
                    <div class="text-[10px] text-slate-500 font-bold uppercase">Dự Kiến Nở</div>
                    <div class="text-base sm:text-xl font-black text-amber-600">${egg.hatchTime}</div>
                </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div class="bg-white/90 p-3 sm:p-4 rounded-xl border border-slate-200 space-y-0.5">
                    <div class="text-[10px] sm:text-xs text-slate-500 font-bold">Ngày Đã Ấp</div>
                    <div class="text-lg sm:text-2xl font-black text-slate-900">${egg.age} / 21 <span class="text-xs font-bold text-slate-500">Ngày</span></div>
                    <div class="text-[10px] text-emerald-600 font-bold">Giai đoạn phôi</div>
                </div>

                <div class="bg-white/90 p-3 sm:p-4 rounded-xl border border-slate-200 space-y-0.5">
                    <div class="text-[10px] sm:text-xs text-slate-500 font-bold">Nhịp Tim Phôi</div>
                    <div class="text-lg sm:text-2xl font-black text-rose-600">${egg.heartbeat}</div>
                    <div class="text-[10px] text-slate-500 font-semibold">Cảm biến quang học</div>
                </div>

                <div class="bg-white/90 p-3 sm:p-4 rounded-xl border border-slate-200 space-y-0.5">
                    <div class="text-[10px] sm:text-xs text-slate-500 font-bold">Mạch Máu Phôi</div>
                    <div class="text-sm sm:text-base font-black text-sky-600 mt-1">${egg.vein}</div>
                    <div class="text-[10px] text-emerald-600 font-bold">Phân nhánh tốt</div>
                </div>

                <div class="bg-white/90 p-3 sm:p-4 rounded-xl border border-slate-200 space-y-0.5">
                    <div class="text-[10px] sm:text-xs text-slate-500 font-bold">Góc Xoay Hiện Tại</div>
                    <div class="text-lg sm:text-2xl font-black text-amber-600">60.0 °</div>
                    <div class="text-[10px] text-slate-500 font-semibold">Đảo khay tự động</div>
                </div>
            </div>

            <div class="bg-amber-100/70 p-3 sm:p-4 rounded-xl border border-amber-300 text-xs space-y-1">
                <div class="font-bold text-amber-900 flex items-center gap-1.5 text-xs sm:text-sm">
                    <i class="fa-solid fa-circle-info text-amber-600"></i> Ghi chú khuyến nghị:
                </div>
                <p class="text-slate-800 font-semibold leading-relaxed pl-5 text-[11px] sm:text-xs">${egg.notes}</p>
            </div>
        </div>
    `;
}

// TRUYỀN LỆNH ARDUINO Wi-Fi
function sendToArduino(command) {
    console.log("Gửi lệnh Arduino Wi-Fi: " + command);
    if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
        wsSocket.send(command);
    } else {
        fetch(`http://${espIp}/cmd?val=${encodeURIComponent(command)}`, { mode: 'no-cors' })
            .catch(err => console.log("Lỗi HTTP Arduino Wi-Fi:", err));
    }
}

// KẾT NỐI WEBSOCKET ĐA NỀN TẢNG (DESKTOP & MOBILE)
function connectWebSocket() {
    const ipInput = document.getElementById('esp-ip-input');
    if (ipInput && ipInput.value.trim() !== "") {
        espIp = ipInput.value.trim();
        localStorage.setItem("saved_esp_ip", espIp);
    }

    const wsUrl = `ws://${espIp}:81/`;
    console.log("Đang kết nối tới: " + wsUrl);

    try {
        if (wsSocket) wsSocket.close();
        wsSocket = new WebSocket(wsUrl);

        wsSocket.onopen = function() {
            updateHardwareStatus(true);
            addEnvLog("Kết nối thành công với vi điều khiển tủ ấp!");
            
            // Xóa thông báo cảnh báo nếu kết nối thành công
            const banner = document.getElementById('https-warning-banner');
            if (banner) banner.remove();
        };

        wsSocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                processArduinoIncomingData(data);
            } catch(e) {}
        };

        wsSocket.onclose = function() { updateHardwareStatus(false); };
        wsSocket.onerror = function(err) { 
            updateHardwareStatus(false); 
            
            // Nếu bị lỗi kết nối trên HTTPS + Mobile -> hiện lại cảnh báo
            if (window.location.protocol === 'https:') {
                showHttpsWarningBanner();
            }
        };
    } catch(e) {
        updateHardwareStatus(false);
    }
}

function processArduinoIncomingData(data) {
    if (data.humCeiling !== undefined) {
        document.getElementById('hum-ceiling-val').innerText = data.humCeiling.toFixed(1);
        document.getElementById('info-hum-ceiling').innerText = `${data.humCeiling.toFixed(1)} %`;
    }

    if (data.tempGround !== undefined) {
        document.getElementById('temp-ground-val').innerText = data.tempGround.toFixed(1);
        document.getElementById('info-temp-ground').innerText = `${data.tempGround.toFixed(1)} °C`;
    }
    if (data.humGround !== undefined) {
        document.getElementById('hum-ground-val').innerText = data.humGround.toFixed(1);
        document.getElementById('info-hum-ground').innerText = `${data.humGround.toFixed(1)} %`;
    }

    if (data.carouselAngle !== undefined) {
        document.getElementById('carousel-angle-val').innerText = data.carouselAngle;
    }

    if (data.eggs && Array.isArray(data.eggs) && data.eggs.length === 6) {
        data.eggs.forEach((st, idx) => {
            if(eggsData[idx]) eggsData[idx].status = st;
        });
        renderEggSelectorGrid();
        if(selectedEggId === null) renderOverallEggsView();
    }
}

function updateHardwareStatus(connected) {
    isHardwareConnected = connected;
    const badge = document.getElementById('connection-status-badge');
    const dot = document.getElementById('connection-dot');
    const txt = document.getElementById('connection-text');

    if (connected) {
        badge.className = "flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap";
        dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
        txt.innerText = "Đã Kết Nối";
    } else {
        badge.className = "flex items-center gap-1.5 bg-rose-950/80 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap";
        dot.className = "w-2 h-2 rounded-full bg-rose-500";
        txt.innerText = "Ngắt kết nối";
    }
}

function updateExhaustFanSpeed(val) {
    document.getElementById('exhaustFanSpeedVal').innerText = val + '%';
    sendToArduino(`FAN_EXHAUST:${val}`);
}

function updateIntakeFanSpeed(val) {
    document.getElementById('intakeFanSpeedVal').innerText = val + '%';
    sendToArduino(`FAN_INTAKE:${val}`);
}

function updateHeaterPower(val) {
    document.getElementById('heaterPowerVal').innerText = val + '%';
    sendToArduino(`HEATER_MOSFET:${val}`);
}

function updatePumpFlow(val) {
    document.getElementById('pumpFlowVal').innerText = val + '%';
    sendToArduino(`PUMP_FLOW:${val}`);
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');
    const tabLogin = document.getElementById('auth-tab-login');
    const tabReg = document.getElementById('auth-tab-register');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.className = "flex-1 py-2 rounded-xl bg-white text-slate-900 shadow transition";
        tabReg.className = "flex-1 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition";
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabReg.className = "flex-1 py-2 rounded-xl bg-white text-slate-900 shadow transition";
        tabLogin.className = "flex-1 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition";
    }
}

function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    const err = document.getElementById('login-error');

    if (userDatabase[u] && userDatabase[u] === p) {
        err.classList.add('hidden');
        currentUser = u;
        document.getElementById('current-user-display').textContent = u;
        document.getElementById('user-badge').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        
        document.getElementById('page-auth').classList.add('hidden');
        document.getElementById('subpage-wrapper').classList.remove('hidden');
        
        const ipInput = document.getElementById('esp-ip-input');
        if (ipInput) ipInput.value = espIp;

        initFluidNav();
        renderOverviewDevices();
        renderDetailedControlDevices();

        renderEggSelectorGrid();
        renderOverallEggsView();

        switchTab('overview');
        connectWebSocket();
    } else {
        err.classList.remove('hidden');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value.trim();
    const c = document.getElementById('reg-confirm').value.trim();
    const err = document.getElementById('reg-error');

    if (!u || !p || p !== c || userDatabase[u]) {
        err.classList.remove('hidden');
        return;
    }

    err.classList.add('hidden');
    userDatabase[u] = p;
    alert(`Đăng ký tài khoản '${u}' thành công! Bạn có thể đăng nhập ngay.`);
    switchAuthTab('login');
    document.getElementById('login-username').value = u;
    document.getElementById('login-password').value = p;
}

function handleLogout() {
    currentUser = null;
    document.getElementById('user-badge').classList.add('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    document.getElementById('page-auth').classList.remove('hidden');
    document.getElementById('subpage-wrapper').classList.add('hidden');
}

function initFluidNav() {
    setupFluidForMenu('fluid-nav-desktop', 'fluid-pill-desktop', 'desktop');
    setupFluidForMenu('fluid-nav-mobile', 'fluid-pill-mobile', 'mobile');
}

function setupFluidForMenu(navId, pillId, type) {
    const nav = document.getElementById(navId);
    const pill = document.getElementById(pillId);
    if (!nav || !pill) return;

    function updatePillPosition(targetEl) {
        if (!targetEl || !pill || !nav) return;
        const offsetLeft = targetEl.offsetLeft;
        const width = targetEl.offsetWidth;

        pill.style.transform = `translateX(${offsetLeft - 4}px)`;
        pill.style.width = `${width}px`;
    }

    const items = nav.querySelectorAll('.liquid-nav-item');
    items.forEach(item => {
        item.addEventListener('mouseenter', (e) => {
            updatePillPosition(e.currentTarget);
        });
    });

    nav.addEventListener('mouseleave', () => {
        const activeBtn = document.getElementById(`tab-${type}-${currentTab}`);
        if (activeBtn) updatePillPosition(activeBtn);
    });

    setTimeout(() => {
        const activeBtn = document.getElementById(`tab-${type}-${currentTab}`);
        if (activeBtn) updatePillPosition(activeBtn);
    }, 100);
}

function switchTab(tabId) {
    currentTab = tabId;
    
    ['desktop', 'mobile'].forEach(type => {
        const nav = document.getElementById(`fluid-nav-${type}`);
        if (!nav) return;

        nav.querySelectorAll('.liquid-nav-item').forEach(btn => {
            btn.classList.remove('text-slate-900', 'font-bold');
            btn.classList.add('text-slate-600', 'font-semibold');
        });

        const activeBtn = document.getElementById(`tab-${type}-${tabId}`);
        if (activeBtn) {
            activeBtn.classList.add('text-slate-900', 'font-bold');
            activeBtn.classList.remove('text-slate-600');

            const pill = document.getElementById(`fluid-pill-${type}`);
            if (pill) {
                const offsetLeft = activeBtn.offsetLeft;
                const width = activeBtn.offsetWidth;
                pill.style.transform = `translateX(${offsetLeft - 4}px)`;
                pill.style.width = `${width}px`;
            }
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    const activeContent = document.getElementById(`content-${tabId}`);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
}

function renderOverviewDevices() {
    const grid = document.getElementById('quick-devices-grid');
    if (!grid) return;
    grid.innerHTML = '';

    incubatorDevices.forEach(dev => {
        const card = document.createElement('div');
        card.className = `p-3 sm:p-4 rounded-2xl border transition-all ${dev.state ? 'bg-emerald-50/90 border-emerald-300 shadow-sm' : 'bg-white/80 border-slate-200'}`;
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-1.5">
                <i class="fa-solid ${dev.icon} ${dev.state ? 'text-emerald-600' : 'text-slate-400'} text-base sm:text-lg"></i>
                <label class="ios-switch transform scale-75 origin-right">
                    <input type="checkbox" ${dev.state ? 'checked' : ''} onchange="handleDeviceToggle('${dev.id}', this.checked, this)">
                    <span class="ios-slider"></span>
                </label>
            </div>
            <div class="font-bold text-xs text-slate-900 truncate">${dev.nameVI}</div>
            ${isMasterAuto ? `<div class="text-[9px] sm:text-[10px] text-emerald-600 font-extrabold mt-0.5">● TỰ ĐỘNG</div>` : `<div class="text-[9px] sm:text-[10px] text-amber-600 font-extrabold mt-0.5">● THỦ CÔNG</div>`}
        `;
        grid.appendChild(card);
    });
}

function renderDetailedControlDevices() {
    const grid = document.getElementById('detailed-control-grid');
    if (!grid) return;
    grid.innerHTML = '';

    incubatorDevices.forEach(dev => {
        const card = document.createElement('div');
        card.className = "ultra-glass p-3.5 sm:p-5 flex items-center justify-between border border-slate-200 hover:shadow-md transition";

        card.innerHTML = `
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${dev.state ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center text-base sm:text-lg shrink-0">
                    <i class="fa-solid ${dev.icon}"></i>
                </div>
                <div class="min-w-0">
                    <div class="font-bold text-xs sm:text-sm text-slate-900 truncate">${dev.nameVI}</div>
                    <div class="text-[10px] sm:text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                        <span>Trạng thái: <strong class="${dev.state ? 'text-emerald-600' : 'text-slate-500'}">${dev.state ? 'ĐANG BẬT' : 'ĐÃ TẮT'}</strong></span>
                    </div>
                </div>
            </div>

            <label class="ios-switch shrink-0 ml-2">
                <input type="checkbox" ${dev.state ? 'checked' : ''} onchange="handleDeviceToggle('${dev.id}', this.checked, this)">
                <span class="ios-slider"></span>
            </label>
        `;
        grid.appendChild(card);
    });
}

function toggleMasterAuto(checked) {
    isMasterAuto = checked;
    sendToArduino(`MODE_AUTO:${checked ? 1 : 0}`);
    renderOverviewDevices();
    renderDetailedControlDevices();
}

function handleDeviceToggle(devId, newState, switchEl) {
    switchEl.checked = !newState;
    pendingToggleDeviceId = devId;
    pendingTargetState = newState;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeModal(confirmed) {
    document.getElementById('confirm-modal').classList.add('hidden');
    if (confirmed && pendingToggleDeviceId !== null) {
        const dev = incubatorDevices.find(d => d.id === pendingToggleDeviceId);
        if (dev) {
            dev.state = pendingTargetState;
            sendToArduino(`TOGGLE:${dev.id}:${dev.state ? 1 : 0}`);
        }
        renderOverviewDevices();
        renderDetailedControlDevices();
    }
    pendingToggleDeviceId = null;
    pendingTargetState = null;
}

function saveIncubatorConfig() {
    const interval = document.getElementById('turn-interval').value;
    const angle = document.getElementById('turn-angle').value;

    sendToArduino(`CAROUSEL_CFG:${interval},${angle}`);
    alert(`Đã lưu cấu hình sang tủ ấp! Chu kỳ: ${interval} giờ/lần - Góc xoay: ${angle} độ.`);
}

function addEnvLog(msg) {
    const logsContainer = document.getElementById('env-logs-list');
    if (!logsContainer) return;

    const now = new Date().toLocaleTimeString();
    const logItem = document.createElement('div');
    logItem.className = "flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-600 border-b border-slate-200/60 pb-1";
    logItem.innerHTML = `<span class="text-emerald-600 font-bold">[${now}]</span> ${msg}`;
    logsContainer.insertBefore(logItem, logsContainer.firstChild);

    if (logsContainer.children.length > 10) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

window.addEventListener('resize', () => {
    initFluidNav();
});
