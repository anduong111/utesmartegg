function processArduinoIncomingData(data) {
    // 1. Cập nhật dữ liệu Cảm biến S14 (Chân D2) lên màn hình
    if (data.s14 !== undefined) {
        const tempElement = document.getElementById('temp-ground-val');
        if (tempElement) {
            // Hiển thị trạng thái của cảm biến S14 (1: Phát hiện / 0: Không)
            tempElement.innerText = data.s14 === 1 ? "1 (HIGH)" : "0 (LOW)";
        }
    }

    // 2. Cập nhật Cảm biến Trần (Chân D7)
    if (data.ceilingSensor !== undefined) {
        const humElement = document.getElementById('hum-ceiling-val');
        if (humElement) {
            humElement.innerText = data.ceilingSensor === 1 ? "1" : "0";
        }
    }

    // 3. Cập nhật trạng thái công tắc các thiết bị
    if (data.exhaust_fan !== undefined) {
        const dev = incubatorDevices.find(d => d.id === 'exhaust_fan');
        if (dev) dev.state = (data.exhaust_fan === 1);
    }
    if (data.ptc_heater !== undefined) {
        const dev = incubatorDevices.find(d => d.id === 'ptc_heater');
        if (dev) dev.state = (data.ptc_heater === 1);
    }
    if (data.water_pump !== undefined) {
        const dev = incubatorDevices.find(d => d.id === 'water_pump');
        if (dev) dev.state = (data.water_pump === 1);
    }

    // Vẽ lại giao diện nút bấm
    renderOverviewDevices();
    renderDetailedControlDevices();
}
